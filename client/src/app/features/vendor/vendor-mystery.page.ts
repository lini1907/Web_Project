import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/api';
import { VendorMysteryBox, VendorProduct } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { VendorService } from '../../core/services/vendor.service';
import { MoneyPipe } from '../../shared/pipes';
import { StateComponent } from '../../shared/ui';

/** Vendor cấu hình Mystery Box: thành phần (FormArray) là dữ liệu nội bộ — chỉ vendor thấy. */
@Component({
  selector: 'app-vendor-mystery',
  imports: [ReactiveFormsModule, MoneyPipe, StateComponent],
  template: `
    <div class="page-head">
      <h1>Mystery Box</h1>
      @if (approved()) { <button type="button" class="btn btn-purple" (click)="edit(null)">+ Tạo hộp</button> }
    </div>
    <p class="muted small">Thành phần hộp chỉ hiển thị trong kênh nhà bán. Trang công khai chỉ thấy nhóm hàng, số loại và khoảng giá trị. Số hộp còn bán = min(tồn nguyên liệu ÷ định lượng).</p>
    @if (state() !== 'ok') {
      <app-state [state]="state()" emptyText="Chưa có hộp nào" emptyIcon="box" (retry)="load()" />
    } @else {
      <div class="box-grid">
        @for (b of boxes(); track b.id) {
          <div class="card">
            <div class="row-between"><h3><svg class="icon" aria-hidden="true"><use href="icons.svg#box" /></svg> {{ b.name }}</h3><span class="tag" [class.tag-green]="b.isActive">{{ b.isActive ? 'Đang bán' : 'Ẩn' }}</span></div>
            <div><b>{{ b.price | money }}</b> · còn bán được <b>{{ b.available }}</b> hộp · đã bán {{ b.soldCount }}</div>
            <div class="table-wrap" tabindex="0" role="region" [attr.aria-label]="'Thành phần ' + b.name + ', cuộn ngang để xem đầy đủ'">
            <table class="table small">
              <thead><tr><th>Thành phần</th><th>Định lượng</th><th>Tồn</th><th>Đủ cho</th></tr></thead>
              <tbody>
                @for (c of b.components; track c.productId) {
                  <tr><td>{{ c.name }}</td><td>{{ c.qty }} {{ c.unit }}</td><td>{{ c.stockLeft }}</td><td [class.text-danger]="c.stockLeft < c.qty">{{ floor(c.stockLeft / c.qty) }} hộp</td></tr>
                }
              </tbody>
            </table>
            </div>
            <button type="button" class="btn btn-outline btn-sm" (click)="edit(b)" [disabled]="!approved()">Sửa</button>
          </div>
        }
      </div>
    }
    @if (showForm()) {
      <form class="card form" [formGroup]="form" (ngSubmit)="save()">
        <h3>{{ editing() ? 'Sửa hộp' : 'Tạo Mystery Box' }}</h3>
        <div class="form-row">
          <label>Tên hộp *<input class="input" formControlName="name" /></label>
          <label>Giá bán (đ) *<input class="input" type="number" formControlName="price" min="1000" step="1000" /></label>
        </div>
        <label>Ghi chú công khai<input class="input" formControlName="publicNote" placeholder="VD: Khoảng 3 kg, 4–5 loại rau củ theo mùa" /></label>
        <label>URL ảnh<input class="input" formControlName="image" /></label>
        <div class="fieldset" formArrayName="components">
          <div class="row-between"><b>Thành phần (nội bộ)</b><button type="button" class="btn btn-outline btn-xs" (click)="addComponent()">+ Thêm</button></div>
          @for (c of components.controls; track $index; let i = $index) {
            <div class="row-gap" [formGroupName]="i">
              <select class="input grow" formControlName="productId">
                <option value="">-- Chọn sản phẩm của bạn --</option>
                @for (p of products(); track p.id) { <option [value]="p.id">{{ p.name }} (tồn {{ p.stock - p.reservedStock }} {{ p.unit }})</option> }
              </select>
              <input class="input qty-input" type="number" formControlName="qty" min="1" aria-label="Định lượng" />
              <button type="button" class="icon-btn" (click)="components.removeAt(i)" aria-label="Xóa"><svg class="icon" aria-hidden="true"><use href="icons.svg#close" /></svg></button>
            </div>
          }
        </div>
        <div class="note">Giá trị nguyên liệu theo giá lẻ: <b>{{ componentValue() | money }}</b></div>
        <label class="checkbox"><input type="checkbox" formControlName="isActive" /> Đang bán</label>
        @if (error()) { <div class="note note-danger">{{ error() }}</div> }
        <div class="row-gap">
          <button class="btn btn-purple" type="submit">Lưu hộp</button>
          <button class="btn btn-outline" type="button" (click)="showForm.set(false)">Đóng</button>
        </div>
      </form>
    }
  `,
})
export class VendorMysteryPage {
  private vendor = inject(VendorService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  protected boxes = signal<VendorMysteryBox[]>([]);
  protected products = signal<VendorProduct[]>([]);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');
  protected editing = signal<VendorMysteryBox | null>(null);
  protected showForm = signal(false);
  protected error = signal<string | null>(null);
  protected floor = Math.floor;
  protected approved = () => this.auth.user()?.vendorStatus === 'approved';

  protected form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    price: [99000, [Validators.required, Validators.min(1000)]],
    publicNote: [''],
    image: [''],
    isActive: [true],
    components: this.fb.array<ReturnType<VendorMysteryPage['componentGroup']>>([]),
  });
  get components(): FormArray {
    return this.form.controls.components as FormArray;
  }

  constructor() {
    this.load();
    this.vendor.products(undefined, 'active').subscribe({ next: (p) => this.products.set(p.filter((x) => x.type !== 'rescue')) });
  }

  private componentGroup(productId = '', qty = 1) {
    return this.fb.nonNullable.group({ productId: [productId, Validators.required], qty: [qty, [Validators.required, Validators.min(1)]] });
  }

  load(): void {
    this.state.set('loading');
    this.vendor.boxes().subscribe({
      next: (b) => {
        this.boxes.set(b);
        this.state.set(b.length ? 'ok' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }

  addComponent(): void {
    this.components.push(this.componentGroup());
  }

  componentValue(): number {
    const v = this.form.getRawValue();
    return v.components.reduce((s, c) => s + (this.products().find((p) => p.id === c.productId)?.price ?? 0) * (c.qty || 0), 0);
  }

  edit(b: VendorMysteryBox | null): void {
    this.editing.set(b);
    this.error.set(null);
    this.components.clear();
    (b?.components ?? [{ productId: '', qty: 1 }]).forEach((c) => this.components.push(this.componentGroup(c.productId, c.qty)));
    this.form.patchValue({ name: b?.name ?? '', price: b?.price ?? 99000, publicNote: b?.publicNote ?? '', image: b?.image ?? '', isActive: b?.isActive ?? true });
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Kiểm tra tên, giá và chọn đủ sản phẩm cho từng thành phần.');
      return;
    }
    const v = this.form.getRawValue();
    const body = { ...v, image: v.image || undefined, publicNote: v.publicNote || undefined };
    const b = this.editing();
    (b ? this.vendor.updateBox(b.id, body) : this.vendor.createBox(body)).subscribe({
      next: () => {
        this.toast.success('Đã lưu Mystery Box');
        this.showForm.set(false);
        this.load();
      },
      error: (e) => this.error.set(ApiError.from(e).message),
    });
  }
}
