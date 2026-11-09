import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { VendorProduct } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { VendorService } from '../../core/services/vendor.service';
import { CategoryLabelPipe, MoneyPipe, TimeLeftPipe } from '../../shared/pipes';
import { QtyComponent, StateComponent } from '../../shared/ui';
import { ImgFallbackDirective } from '../../shared/img-fallback.directive';
import { futureAtLeast } from '../../shared/validators';

@Component({
  selector: 'app-vendor-products',
  imports: [FormsModule, ReactiveFormsModule, RouterLink, MoneyPipe, CategoryLabelPipe, TimeLeftPipe, StateComponent, ImgFallbackDirective, QtyComponent],
  template: `
    <div class="page-head">
      <h1>Sản phẩm & tồn kho</h1>
      @if (approved()) { <a routerLink="/vendor/products/new" class="btn btn-primary">+ Thêm sản phẩm</a> }
    </div>
    <div class="toolbar">
      <input class="input" type="search" placeholder="Tìm theo tên..." [(ngModel)]="q" (keyup.enter)="load()" aria-label="Tìm sản phẩm" />
      <select class="input" [(ngModel)]="status" (ngModelChange)="load()" aria-label="Trạng thái">
        <option value="">Tất cả</option>
        <option value="active">Đang bán</option>
        <option value="inactive">Ngừng bán</option>
      </select>
      <button class="btn btn-outline btn-sm" type="button" (click)="load()">Lọc</button>
    </div>
    @if (state() !== 'ok') {
      <app-state [state]="state()" emptyText="Chưa có sản phẩm" (retry)="load()" />
    } @else {
      <div class="table-wrap card">
        <table class="table">
          <thead>
            <tr><th>Sản phẩm</th><th>Giá</th><th>Tồn kho</th><th>Giữ chỗ</th><th>Trạng thái</th><th>Thao tác</th></tr>
          </thead>
          <tbody>
            @for (p of items(); track p.id) {
              <tr [class.row-muted]="!p.isActive">
                <td class="prod-cell">
                  <img [src]="p.mainImage" alt="" appImgFallback />
                  <div>
                    <a [routerLink]="['/vendor/products', p.id]"><b>{{ p.name }}</b></a>
                    <div class="small muted">{{ p.category | categoryLabel }} · {{ p.farm?.name }}</div>
                    @if (p.type === 'rescue' && p.rescue) {
                      <span class="tag" [class.tag-green]="!p.rescue.expired" [class.tag-red]="p.rescue.expired">
                        <svg class="icon" aria-hidden="true"><use href="icons.svg#rescue" /></svg> -{{ p.rescue.discountRate }}% · {{ p.rescue.expired ? 'đã hết hạn' : (p.rescue.expiresAt | timeLeft) }}
                      </span>
                    }
                    @if (p.type === 'mystery-ingredient') { <span class="tag tag-purple">Nguyên liệu Mystery Box</span> }
                  </div>
                </td>
                <td>{{ p.price | money }}<br /><small class="muted">/{{ p.unit }}</small></td>
                <td>
                  <div class="row-gap">
                    <app-qty [value]="p.stock" [min]="p.reservedStock" [max]="100000" [small]="true" (valueChange)="setStock(p, $event)" [disabled]="!approved()" />
                  </div>
                  @if (p.stock - p.reservedStock <= 5) { <small class="text-danger">Sắp hết</small> }
                </td>
                <td>{{ p.reservedStock }}</td>
                <td>
                  <label class="switch" [title]="p.isActive ? 'Đang bán' : 'Ngừng bán'">
                    <input type="checkbox" [checked]="p.isActive" (change)="toggle(p)" [disabled]="!approved()" />
                    <span>{{ p.isActive ? 'Đang bán' : 'Ngừng bán' }}</span>
                  </label>
                </td>
                <td class="actions">
                  <a [routerLink]="['/vendor/products', p.id]" class="btn btn-outline btn-xs">Sửa</a>
                  @if (p.type !== 'mystery-ingredient') {
                    <button type="button" class="btn btn-outline btn-xs" (click)="openRescue(p)" [disabled]="!approved()"><svg class="icon" aria-hidden="true"><use href="icons.svg#rescue" /></svg> Giải cứu</button>
                  }
                  <button type="button" class="btn btn-outline btn-xs text-danger" (click)="remove(p)" [disabled]="!approved()">Xóa</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (rescueTarget(); as t) {
      <div class="modal-backdrop" (click)="rescueTarget.set(null)">
        <form class="modal card form" [formGroup]="rescueForm" (ngSubmit)="saveRescue()" (click)="$event.stopPropagation()">
          <h3><svg class="icon" aria-hidden="true"><use href="icons.svg#rescue" /></svg> Giải cứu: {{ t.name }}</h3>
          <p class="small muted">Giá bán = giá gốc × (1 − % giảm), làm tròn nghìn — do máy chủ tính. Mức giảm 30–50%.</p>
          <div class="form-row">
            <label>Giá gốc (đ)<input class="input" type="number" formControlName="originalPrice" min="1000" step="1000" /></label>
            <label>% giảm (30–50)<input class="input" type="number" formControlName="discountRate" min="30" max="50" /></label>
          </div>
          <label>Hạn bán<input class="input" type="datetime-local" formControlName="expiresAt" /></label>
          <label>Lý do giải cứu<input class="input" formControlName="reason" placeholder="Trầy vỏ, sai kích cỡ, dư cung..." /></label>
          @if (rescueForm.invalid && rescueForm.touched) { <div class="field-error">Kiểm tra lại: giảm 30–50%, hạn bán ở tương lai.</div> }
          <div class="note">Giá dự kiến: <b>{{ previewPrice() | money }}</b></div>
          <div class="row-between">
            @if (t.type === 'rescue') { <button type="button" class="btn btn-link text-danger" (click)="clearRescue(t)">Bỏ nhãn giải cứu</button> } @else { <span></span> }
            <div class="row-gap">
              <button type="button" class="btn btn-outline" (click)="rescueTarget.set(null)">Đóng</button>
              <button type="submit" class="btn btn-primary">Lưu</button>
            </div>
          </div>
        </form>
      </div>
    }
  `,
})
export class VendorProductsPage {
  private vendor = inject(VendorService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  protected items = signal<VendorProduct[]>([]);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');
  protected q = '';
  protected status = '';
  protected rescueTarget = signal<VendorProduct | null>(null);
  protected approved = () => this.auth.user()?.vendorStatus === 'approved';

  protected rescueForm = this.fb.nonNullable.group({
    originalPrice: [0, [Validators.required, Validators.min(1000)]],
    discountRate: [30, [Validators.required, Validators.min(30), Validators.max(50)]],
    expiresAt: ['', [Validators.required, futureAtLeast(1)]],
    reason: [''],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.vendor.products(this.q || undefined, this.status || undefined).subscribe({
      next: (r) => {
        this.items.set(r);
        this.state.set(r.length ? 'ok' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }

  private replace(p: VendorProduct): void {
    this.items.update((list) => list.map((x) => (x.id === p.id ? p : x)));
  }

  setStock(p: VendorProduct, stock: number): void {
    if (stock === p.stock) return;
    this.vendor.updateProduct(p.id, { stock }).subscribe({
      next: (fresh) => {
        this.replace(fresh);
        this.toast.success(`Đã cập nhật tồn kho "${p.name}": ${stock}`);
      },
      error: (e) => {
        this.toast.error(ApiError.from(e).message);
        this.load();
      },
    });
  }

  toggle(p: VendorProduct): void {
    this.vendor.updateProduct(p.id, { isActive: !p.isActive }).subscribe({
      next: (fresh) => this.replace(fresh),
      error: (e) => this.toast.error(ApiError.from(e).message),
    });
  }

  remove(p: VendorProduct): void {
    if (!confirm(`Xóa "${p.name}"? Nếu sản phẩm đã có đơn, hệ thống chỉ chuyển sang "ngừng bán" để giữ lịch sử.`)) return;
    this.vendor.deleteProduct(p.id).subscribe({
      next: (r) => {
        this.toast.success(r.softDeleted ? 'Sản phẩm đã có đơn nên được chuyển sang ngừng bán' : 'Đã xóa sản phẩm');
        this.load();
      },
      error: (e) => this.toast.error(ApiError.from(e).message),
    });
  }

  openRescue(p: VendorProduct): void {
    const tomorrow = new Date(Date.now() + 2 * 86400000);
    tomorrow.setHours(23, 59, 0, 0);
    const local = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    this.rescueForm.reset({
      originalPrice: p.rescue?.originalPrice ?? p.price,
      discountRate: p.rescue?.discountRate ?? 30,
      expiresAt: p.rescue && !p.rescue.expired ? new Date(new Date(p.rescue.expiresAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : local,
      reason: p.rescue?.reason ?? '',
    });
    this.rescueTarget.set(p);
  }

  previewPrice(): number {
    const v = this.rescueForm.getRawValue();
    return Math.max(1000, Math.round((v.originalPrice * (1 - v.discountRate / 100)) / 1000) * 1000);
  }

  saveRescue(): void {
    const t = this.rescueTarget();
    if (!t) return;
    if (this.rescueForm.invalid) {
      this.rescueForm.markAllAsTouched();
      return;
    }
    const v = this.rescueForm.getRawValue();
    this.vendor.setRescue(t.id, { ...v, expiresAt: new Date(v.expiresAt).toISOString(), reason: v.reason || undefined }).subscribe({
      next: (fresh) => {
        this.replace(fresh);
        this.rescueTarget.set(null);
        this.toast.success(`Đã bật giải cứu, giá mới ${fresh.price.toLocaleString('vi-VN')}đ`);
      },
      error: (e) => this.toast.error(ApiError.from(e).message),
    });
  }

  clearRescue(p: VendorProduct): void {
    this.vendor.clearRescue(p.id).subscribe({
      next: (fresh) => {
        this.replace(fresh);
        this.rescueTarget.set(null);
        this.toast.success('Đã bỏ nhãn giải cứu, giá trở về giá gốc');
      },
      error: (e) => this.toast.error(ApiError.from(e).message),
    });
  }
}
