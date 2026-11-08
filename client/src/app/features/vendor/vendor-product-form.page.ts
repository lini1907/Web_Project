import { Component, effect, inject, input, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { CATEGORY_LABELS, Category, Farm, VendorProduct } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { VendorService } from '../../core/services/vendor.service';
import { ImgFallbackDirective } from '../../shared/img-fallback.directive';
import { StateComponent } from '../../shared/ui';

/** Thêm/sửa sản phẩm — Reactive Form: load data, validation, FormArray chứng nhận, upload ảnh, lỗi server hiển thị tại ô. */
@Component({
  selector: 'app-vendor-product-form',
  imports: [ReactiveFormsModule, RouterLink, ImgFallbackDirective, StateComponent],
  template: `
    <nav class="breadcrumb"><a routerLink="/vendor/products">Sản phẩm</a> › <span>{{ id() ? 'Sửa sản phẩm' : 'Thêm sản phẩm' }}</span></nav>
    @if (state() !== 'ok') {
      <app-state [state]="state()" [errorText]="loadError()" (retry)="init()" />
    } @else {
      <form class="card form" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <h1>{{ id() ? 'Sửa: ' + original()?.name : 'Thêm sản phẩm mới' }}</h1>
        @if (original()?.type === 'rescue') {
          <div class="note">Sản phẩm đang giải cứu: giá bán do hệ thống tính từ cấu hình giải cứu, không sửa trực tiếp.</div>
        }
        <div class="form-row">
          <label>Tên sản phẩm *<input class="input" formControlName="name" />
            @if (e('name')) { <span class="field-error">{{ e('name') }}</span> }
          </label>
          <label>Nông trại *
            <select class="input" formControlName="farmId">
              @for (f of farms(); track f.id) { <option [value]="f.id">{{ f.name }}</option> }
            </select>
            @if (e('farmId')) { <span class="field-error">{{ e('farmId') }}</span> }
          </label>
        </div>
        <div class="form-row">
          <label>Danh mục *
            <select class="input" formControlName="category">
              @for (c of categories; track c) { <option [value]="c">{{ labels[c] }}</option> }
            </select>
          </label>
          <label>Loại
            <select class="input" formControlName="type">
              <option value="regular">Hàng bán lẻ</option>
              <option value="mystery-ingredient">Nguyên liệu Mystery Box (không hiện ở shop)</option>
            </select>
          </label>
        </div>
        <div class="form-row three">
          <label>Giá bán (đ) *<input class="input" type="number" formControlName="price" min="1000" step="1000" />
            @if (e('price')) { <span class="field-error">{{ e('price') }}</span> }
          </label>
          <label>Đơn vị *<input class="input" formControlName="unit" placeholder="kg, hộp 500g, chục..." />
            @if (e('unit')) { <span class="field-error">{{ e('unit') }}</span> }
          </label>
          <label>Tồn kho *<input class="input" type="number" formControlName="stock" min="0" />
            @if (e('stock')) { <span class="field-error">{{ e('stock') }}</span> }
          </label>
        </div>
        <label>Mô tả<textarea class="input" rows="4" formControlName="description"></textarea></label>

        <div class="fieldset">
          <div class="row-between"><b>Chứng nhận</b><button type="button" class="btn btn-outline btn-xs" (click)="addCert()">+ Thêm</button></div>
          @for (c of certs.controls; track $index; let i = $index) {
            <div class="row-gap"><input class="input" [formControl]="c" placeholder="VD: VietGAP" /><button type="button" class="icon-btn" (click)="certs.removeAt(i)" aria-label="Xóa">✕</button></div>
          }
        </div>

        <div class="fieldset">
          <b>Ảnh chính</b>
          <div class="upload-row">
            @if (form.value.mainImage) { <img class="upload-preview" [src]="form.value.mainImage" alt="Ảnh sản phẩm" appImgFallback /> }
            <div class="grow">
              <input class="input" formControlName="mainImage" placeholder="Dán URL ảnh (https://...) hoặc tải lên" />
              @if (e('mainImage')) { <span class="field-error">{{ e('mainImage') }}</span> }
              <label class="btn btn-outline btn-sm file-btn">📤 Tải ảnh lên (JPG/PNG/WEBP ≤ 2MB)
                <input type="file" accept="image/jpeg,image/png,image/webp" (change)="upload($event)" hidden />
              </label>
              @if (uploading()) { <span class="small muted">Đang tải ảnh...</span> }
            </div>
          </div>
        </div>
        <label class="checkbox"><input type="checkbox" formControlName="isActive" /> Đang bán</label>

        @if (serverError()) { <div class="note note-danger">{{ serverError() }}</div> }
        <div class="row-gap">
          <button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Đang lưu...' : 'Lưu sản phẩm' }}</button>
          <a routerLink="/vendor/products" class="btn btn-outline">Hủy</a>
        </div>
      </form>
    }
  `,
})
export class VendorProductFormPage {
  readonly id = input<string | undefined>();
  private vendor = inject(VendorService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  protected labels = CATEGORY_LABELS;
  protected categories = Object.keys(CATEGORY_LABELS) as Category[];

  protected farms = signal<Farm[]>([]);
  protected original = signal<VendorProduct | null>(null);
  protected state = signal<'loading' | 'error' | 'ok'>('loading');
  protected loadError = signal<string | null>(null);
  protected saving = signal(false);
  protected uploading = signal(false);
  protected serverError = signal<string | null>(null);
  private fieldErrors = signal<Record<string, string>>({});

  protected certs = new FormArray<FormControl<string>>([]);
  protected form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    farmId: ['', Validators.required],
    category: ['rau-cu' as Category, Validators.required],
    type: ['regular' as 'regular' | 'mystery-ingredient'],
    price: [10000, [Validators.required, Validators.min(1000)]],
    unit: ['kg', [Validators.required, Validators.maxLength(30)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    description: [''],
    mainImage: ['', [Validators.pattern(/^(https?:\/\/|\/uploads\/)\S+$/)]],
    isActive: [true],
    certifications: this.certs,
  });

  constructor() {
    effect(() => {
      this.id();
      this.init();
    });
  }

  init(): void {
    this.state.set('loading');
    this.vendor.farms().subscribe({
      next: (farms) => {
        this.farms.set(farms);
        const id = this.id();
        if (!id) {
          this.form.patchValue({ farmId: farms[0]?.id ?? '' });
          this.state.set('ok');
          return;
        }
        this.vendor.product(id).subscribe({
          next: (p) => {
            this.original.set(p);
            this.certs.clear();
            p.certifications.forEach((c) => this.certs.push(new FormControl(c, { nonNullable: true })));
            this.form.patchValue({
              name: p.name,
              farmId: p.farmId,
              category: p.category,
              type: p.type === 'mystery-ingredient' ? 'mystery-ingredient' : 'regular',
              price: p.price,
              unit: p.unit,
              stock: p.stock,
              description: p.description,
              mainImage: p.mainImage,
              isActive: p.isActive,
            });
            this.form.controls.type.disable();
            if (p.type === 'rescue') this.form.controls.price.disable();
            this.state.set('ok');
          },
          error: (e) => {
            this.loadError.set(ApiError.from(e).message);
            this.state.set('error');
          },
        });
      },
      error: () => this.state.set('error'),
    });
  }

  e(name: string): string | null {
    const server = this.fieldErrors()[name];
    if (server) return server;
    const c = this.form.get(name);
    if (!c || !c.errors || !(c.touched || c.dirty)) return null;
    if (c.errors['required']) return 'Bắt buộc nhập';
    if (c.errors['min']) return `Tối thiểu ${c.errors['min'].min}`;
    if (c.errors['minlength']) return `Tối thiểu ${c.errors['minlength'].requiredLength} ký tự`;
    if (c.errors['pattern']) return 'URL ảnh phải bắt đầu bằng https:// hoặc /uploads/';
    return 'Không hợp lệ';
  }

  addCert(): void {
    this.certs.push(new FormControl('', { nonNullable: true }));
  }

  upload(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.toast.error('Ảnh tối đa 2 MB');
      return;
    }
    this.uploading.set(true);
    this.vendor.upload(file).subscribe({
      next: (r) => {
        this.form.patchValue({ mainImage: r.url });
        this.form.controls.mainImage.markAsDirty();
        this.uploading.set(false);
      },
      error: (e) => {
        this.uploading.set(false);
        this.toast.error(ApiError.from(e).message);
      },
    });
  }

  save(): void {
    this.fieldErrors.set({});
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      ...v,
      certifications: v.certifications.map((c) => c.trim()).filter(Boolean),
      mainImage: v.mainImage || undefined,
      description: v.description || undefined,
    };
    const id = this.id();
    if (id && this.original()?.type === 'rescue') delete (body as Partial<typeof body>).price;
    if (id) delete (body as Partial<typeof body>).type;
    this.saving.set(true);
    const req = id ? this.vendor.updateProduct(id, body) : this.vendor.createProduct(body);
    req.subscribe({
      next: (p) => {
        this.saving.set(false);
        this.toast.success(id ? 'Đã lưu thay đổi' : `Đã thêm "${p.name}"`);
        this.router.navigate(['/vendor/products']);
      },
      error: (e) => {
        this.saving.set(false);
        const err = ApiError.from(e);
        this.fieldErrors.set(err.fieldErrors());
        this.serverError.set(err.message);
      },
    });
  }
}
