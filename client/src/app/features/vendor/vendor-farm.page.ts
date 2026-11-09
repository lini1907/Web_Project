import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { Farm } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { VendorService } from '../../core/services/vendor.service';
import { StateComponent } from '../../shared/ui';
import { FarmAvatarComponent } from '../../shared/farm-avatar.component';
import { ImgFallbackDirective } from '../../shared/img-fallback.directive';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-vendor-farm',
  imports: [ReactiveFormsModule, RouterLink, StateComponent, FarmAvatarComponent, ImgFallbackDirective],
  template: `
    <div class="page-head">
      <h1>Hồ sơ nông trại</h1>
      <button type="button" class="btn btn-outline" (click)="edit(null)">+ Thêm nông trại</button>
    </div>
    @if (state() !== 'ok') {
      <app-state [state]="state()" emptyText="Chưa có nông trại" (retry)="load()" />
    } @else {
      <div class="farm-grid">
        @for (f of farms(); track f.id) {
          <div class="farm-card" [class.selected]="editing()?.id === f.id">
            <app-farm-avatar [farm]="f" />
            <div class="grow">
              <h3>{{ f.name }}</h3>
              <div class="muted"><svg class="icon" aria-hidden="true"><use href="icons.svg#pin" /></svg> {{ f.province }} · {{ f.status === 'hidden' ? 'Đang ẩn' : 'Công khai' }}</div>
              <p class="line-clamp-2">{{ f.story }}</p>
              <div class="row-gap">
                <button type="button" class="btn btn-outline btn-xs" (click)="edit(f)">Sửa</button>
                <a [routerLink]="['/farms', f.slug]" class="btn btn-link btn-xs">Xem trang công khai</a>
              </div>
            </div>
          </div>
        }
      </div>
    }
    @if (showForm()) {
      <form class="card form" [formGroup]="form" (ngSubmit)="save()">
        <h3>{{ editing() ? 'Sửa: ' + editing()!.name : 'Thêm nông trại' }}</h3>
        <div class="form-row">
          <label>Tên nông trại *<input class="input" formControlName="name" /></label>
          <label>Tỉnh/thành *<input class="input" formControlName="province" /></label>
        </div>
        <label>Địa chỉ<input class="input" formControlName="address" /></label>
        <label>Câu chuyện nông trại<textarea class="input" rows="4" formControlName="story"></textarea></label>
        <label>Chứng nhận (cách nhau bởi dấu phẩy)<input class="input" formControlName="certifications" placeholder="VietGAP, Hữu cơ" /></label>
        <fieldset class="fieldset farm-photo-editor">
          <legend>Avatar và ảnh thực tế của nông trại</legend>
          <p class="small muted">Chọn ảnh bạn có quyền sử dụng và đúng nông trại này. Tối đa 8 ảnh, mỗi ảnh JPG/PNG/WebP không quá 2 MB. Ảnh tham khảo trên hồ sơ mẫu sẽ được thay bằng ảnh bạn cung cấp.</p>
          <label class="btn btn-outline file-btn">{{ uploading() ? 'Đang tải ảnh...' : 'Tải ảnh nông trại' }}<input type="file" accept="image/jpeg,image/png,image/webp" multiple [disabled]="uploading() || photos().length >= 8" (change)="uploadPhotos($event)" /></label>
          <div class="row-gap"><label class="grow">Hoặc URL ảnh<input class="input" [formControl]="imageUrl" placeholder="https://... hoặc /uploads/..." /></label><button type="button" class="btn btn-outline" (click)="addPhoto()" [disabled]="uploading() || imageUrl.invalid || !imageUrl.value.trim() || photos().length >= 8">Thêm ảnh</button></div>
          @if (imageUrl.invalid && imageUrl.dirty) { <span class="field-error">URL ảnh cần bắt đầu bằng https://, http://, /uploads/ hoặc /media/.</span> }
          <div class="farm-photo-edit-grid">
            @for (url of photos(); track url; let i = $index) {
              <figure><img [src]="url" [alt]="'Ảnh nông trại ' + (i + 1)" width="200" height="150" appImgFallback /><figcaption><button type="button" class="btn btn-outline btn-sm" [attr.aria-pressed]="avatar() === url" (click)="avatar.set(url)">{{ avatar() === url ? 'Ảnh đại diện' : 'Dùng làm avatar' }}</button><button type="button" class="icon-btn" [attr.aria-label]="'Gỡ ảnh ' + (i + 1)" (click)="removePhoto(url)"><svg class="icon" aria-hidden="true"><use href="icons.svg#close" /></svg></button></figcaption></figure>
            }
          </div>
          @if (photoError()) { <div class="field-error" role="alert">{{ photoError() }}</div> }
        </fieldset>
        <label>Hiển thị
          <select class="input" formControlName="status"><option value="active">Công khai</option><option value="hidden">Ẩn</option></select>
        </label>
        @if (form.invalid && form.touched) { <div class="field-error">Tên ≥ 3 ký tự, tỉnh/thành bắt buộc.</div> }
        @if (error()) { <div class="note note-danger">{{ error() }}</div> }
        <div class="row-gap">
          <button class="btn btn-primary" type="submit" [disabled]="uploading() || saving()">{{ saving() ? 'Đang lưu...' : 'Lưu' }}</button>
          <button class="btn btn-outline" type="button" (click)="showForm.set(false)">Đóng</button>
        </div>
      </form>
    }
  `,
})
export class VendorFarmPage {
  private vendor = inject(VendorService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  protected farms = signal<Farm[]>([]);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');
  protected editing = signal<Farm | null>(null);
  protected showForm = signal(false);
  protected error = signal<string | null>(null);
  protected photos = signal<string[]>([]);
  protected avatar = signal('');
  protected uploading = signal(false);
  protected saving = signal(false);
  protected photoError = signal<string | null>(null);
  protected imageUrl = this.fb.nonNullable.control('', Validators.pattern(/^(https?:\/\/|\/(?:uploads|media)\/)\S+$/));
  protected form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    province: ['', Validators.required],
    address: [''],
    story: [''],
    certifications: [''],
    status: ['active' as 'active' | 'hidden'],
  });

  constructor() {
    this.load();
  }
  load(): void {
    this.state.set('loading');
    this.vendor.farms().subscribe({
      next: (f) => {
        this.farms.set(f);
        this.state.set(f.length ? 'ok' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }
  edit(f: Farm | null): void {
    this.editing.set(f);
    this.error.set(null);
    this.photos.set(f?.images || []);
    this.avatar.set(f?.avatarUrl || f?.images?.[0] || '');
    this.photoError.set(null);
    this.imageUrl.reset('');
    this.form.reset({
      name: f?.name ?? '',
      province: f?.province ?? '',
      address: f?.address ?? '',
      story: f?.story ?? '',
      certifications: (f?.certifications ?? []).join(', '),
      status: f?.status ?? 'active',
    });
    this.showForm.set(true);
  }
  save(): void {
    if (this.uploading() || this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = { ...v, certifications: v.certifications.split(',').map((s) => s.trim()).filter(Boolean), address: v.address || undefined, story: v.story || undefined, images: this.photos(), avatarUrl: this.avatar() };
    const f = this.editing();
    this.saving.set(true);
    (f ? this.vendor.updateFarm(f.id, body) : this.vendor.createFarm(body)).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Đã lưu hồ sơ nông trại');
        this.showForm.set(false);
        this.load();
      },
      error: (e) => { this.saving.set(false); this.error.set(ApiError.from(e).message); },
    });
  }
  addPhoto(): void {
    const url=this.imageUrl.value.trim();
    if (!url || this.imageUrl.invalid || this.photos().length >= 8) return;
    if (!this.photos().includes(url)) this.photos.update(rows=>[...rows,url]);
    if (!this.avatar()) this.avatar.set(url);
    this.imageUrl.reset('');
  }
  removePhoto(url: string): void {
    this.photos.update(rows=>rows.filter(row=>row!==url));
    if (this.avatar()===url) this.avatar.set(this.photos()[0] || '');
  }
  async uploadPhotos(event: Event): Promise<void> {
    const input=event.target as HTMLInputElement;
    const files=Array.from(input.files || []).slice(0,8-this.photos().length);
    input.value='';
    this.photoError.set(null); this.uploading.set(true);
    try {
      for (const file of files) {
        if (file.size>2*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(file.type)) { this.photoError.set('Một số ảnh bị bỏ qua vì sai định dạng hoặc vượt 2 MB.'); continue; }
        const result=await firstValueFrom(this.vendor.upload(file));
        this.photos.update(rows=>[...rows,result.url]);
        if (!this.avatar()) this.avatar.set(result.url);
      }
    } catch (e) { this.photoError.set(ApiError.from(e).message); }
    finally { this.uploading.set(false); }
  }
}
