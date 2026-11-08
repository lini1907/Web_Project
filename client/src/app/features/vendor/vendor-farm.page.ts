import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { Farm } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { VendorService } from '../../core/services/vendor.service';
import { StateComponent } from '../../shared/ui';

@Component({
  selector: 'app-vendor-farm',
  imports: [ReactiveFormsModule, RouterLink, StateComponent],
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
            <div class="farm-avatar">{{ f.name.charAt(0) }}</div>
            <div class="grow">
              <h3>{{ f.name }}</h3>
              <div class="muted">📍 {{ f.province }} · {{ f.status === 'hidden' ? 'Đang ẩn' : 'Công khai' }}</div>
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
        <label>Hiển thị
          <select class="input" formControlName="status"><option value="active">Công khai</option><option value="hidden">Ẩn</option></select>
        </label>
        @if (form.invalid && form.touched) { <div class="field-error">Tên ≥ 3 ký tự, tỉnh/thành bắt buộc.</div> }
        @if (error()) { <div class="note note-danger">{{ error() }}</div> }
        <div class="row-gap">
          <button class="btn btn-primary" type="submit">Lưu</button>
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = { ...v, certifications: v.certifications.split(',').map((s) => s.trim()).filter(Boolean), address: v.address || undefined, story: v.story || undefined };
    const f = this.editing();
    (f ? this.vendor.updateFarm(f.id, body) : this.vendor.createFarm(body)).subscribe({
      next: () => {
        this.toast.success('Đã lưu hồ sơ nông trại');
        this.showForm.set(false);
        this.load();
      },
      error: (e) => this.error.set(ApiError.from(e).message),
    });
  }
}
