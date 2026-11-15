import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/api';
import { AdminVoucher, Paged, VoucherInput, VoucherType } from '../../core/models';
import { VoucherService, voucherLabel } from '../../core/services/voucher.service';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent, StateComponent } from '../../shared/ui';

/** Quản lý mã giảm giá: đủ 4 thao tác CRUD (thêm, xem, sửa, xóa) + bật/tắt nhanh. */
@Component({
  selector: 'app-admin-vouchers',
  imports: [FormsModule, ReactiveFormsModule, DatePipe, PaginationComponent, StateComponent],
  template: `
    <div class="page-head">
      <h1>Mã giảm giá</h1>
      <div class="row-gap">
        <a class="btn btn-outline btn-sm" href="/api/v1/admin/export/vouchers.csv" download>Xuất CSV</a>
        <button type="button" class="btn btn-primary btn-sm" (click)="openCreate()">+ Thêm mã</button>
      </div>
    </div>
    <form class="toolbar" (ngSubmit)="page.set(1); load()">
      <input class="input" name="q" type="search" placeholder="Tìm mã hoặc mô tả" [(ngModel)]="q" aria-label="Tìm mã giảm giá" />
      <select class="input" name="status" [(ngModel)]="status" (ngModelChange)="page.set(1); load()" aria-label="Trạng thái">
        <option value="">Tất cả</option><option value="active">Đang áp dụng</option><option value="inactive">Đã tắt</option><option value="expired">Hết hạn</option>
      </select>
      <button class="btn btn-outline btn-sm" type="submit">Tìm</button>
    </form>

    @if (state() !== 'ok') {
      <app-state [state]="state()" emptyIcon="note" emptyText="Chưa có mã giảm giá nào" (retry)="load()" />
    } @else {
      <div class="table-wrap card">
        <table class="table">
          <thead><tr><th>Mã</th><th>Mức giảm</th><th>Đã dùng</th><th>Hiệu lực</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            @for (v of result()!.data; track v.id) {
              <tr>
                <td><b>{{ v.code }}</b><br /><small class="muted">{{ v.description }}</small></td>
                <td>{{ label(v) }}</td>
                <td>{{ v.usedCount }} / {{ v.maxUses || '∞' }}</td>
                <td class="small">
                  {{ v.startsAt ? (v.startsAt | date: 'dd/MM/yyyy') : 'Ngay' }} → {{ v.expiresAt ? (v.expiresAt | date: 'dd/MM/yyyy') : 'Không hạn' }}
                </td>
                <td>
                  @if (isExpired(v)) { <span class="tag tag-red">Hết hạn</span> }
                  @else if (v.isActive) { <span class="tag tag-green">Đang bật</span> }
                  @else { <span class="tag">Đã tắt</span> }
                </td>
                <td class="row-gap">
                  <button type="button" class="btn btn-outline btn-xs" (click)="toggle(v)">{{ v.isActive ? 'Tắt' : 'Bật' }}</button>
                  <button type="button" class="btn btn-outline btn-xs" (click)="openEdit(v)">Sửa</button>
                  <button type="button" class="btn btn-outline btn-xs text-danger" (click)="remove(v)" [disabled]="v.usedCount > 0" [title]="v.usedCount > 0 ? 'Mã đã được dùng, chỉ có thể tắt' : 'Xóa mã'">Xóa</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination [page]="result()!.page" [totalPages]="result()!.totalPages" (pageChange)="page.set($event); load()" />
      <p class="small muted">Mã đã có đơn hàng sử dụng thì không xóa được (giữ lại để đối soát), chỉ có thể tắt. Khi cả đơn bị hủy, lượt dùng được hoàn lại.</p>
    }

    @if (editing() !== undefined) {
      <div class="modal-backdrop" (click)="close()">
        <form class="modal card form" [formGroup]="form" (ngSubmit)="save()" (click)="$event.stopPropagation()" novalidate>
          <h2>{{ editing() ? 'Sửa mã ' + editing()!.code : 'Thêm mã giảm giá' }}</h2>
          <div class="form-row">
            <label>Mã *
              <input class="input" formControlName="code" maxlength="30" style="text-transform: uppercase" placeholder="VD: GIAM20K" />
              @if (err('code')) { <span class="field-error">{{ err('code') }}</span> }
            </label>
            <label>Loại *
              <select class="input" formControlName="type">
                <option value="percent">Giảm theo %</option>
                <option value="fixed">Giảm số tiền</option>
                <option value="freeship">Miễn phí ship</option>
              </select>
            </label>
          </div>
          <label>Mô tả
            <input class="input" formControlName="description" maxlength="200" placeholder="Hiện cho người mua ở trang thanh toán" />
          </label>
          @if (form.controls.type.value !== 'freeship') {
            <div class="form-row">
              <label>{{ form.controls.type.value === 'percent' ? 'Phần trăm giảm (1–100) *' : 'Số tiền giảm (đ) *' }}
                <input class="input" type="number" formControlName="value" min="0" />
                @if (err('value')) { <span class="field-error">{{ err('value') }}</span> }
              </label>
              @if (form.controls.type.value === 'percent') {
                <label>Giảm tối đa (đ, 0 = không giới hạn)
                  <input class="input" type="number" formControlName="maxDiscount" min="0" />
                </label>
              }
            </div>
          }
          <div class="form-row">
            <label>Đơn tối thiểu (đ)
              <input class="input" type="number" formControlName="minOrderValue" min="0" />
            </label>
            <label>Tổng lượt dùng (0 = không giới hạn)
              <input class="input" type="number" formControlName="maxUses" min="0" />
              @if (err('maxUses')) { <span class="field-error">{{ err('maxUses') }}</span> }
            </label>
          </div>
          <div class="form-row">
            <label>Bắt đầu <input class="input" type="date" formControlName="startsAt" /></label>
            <label>Hết hạn
              <input class="input" type="date" formControlName="expiresAt" />
              @if (err('expiresAt')) { <span class="field-error">{{ err('expiresAt') }}</span> }
            </label>
          </div>
          <label class="checkbox"><input type="checkbox" formControlName="isActive" /> Bật mã ngay</label>
          @if (formError()) { <div class="note note-danger" role="alert">{{ formError() }}</div> }
          <div class="row-gap">
            <button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Đang lưu...' : 'Lưu' }}</button>
            <button type="button" class="btn btn-outline" (click)="close()">Hủy</button>
          </div>
        </form>
      </div>
    }
  `,
})
export class AdminVouchersPage {
  private api = inject(VoucherService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  protected q = '';
  protected status = '';
  protected page = signal(1);
  protected result = signal<Paged<AdminVoucher> | null>(null);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');
  /** undefined = đóng form; null = đang thêm mới; object = đang sửa. */
  protected editing = signal<AdminVoucher | null | undefined>(undefined);
  protected saving = signal(false);
  protected formError = signal<string | null>(null);
  private fieldErrors = signal<Record<string, string>>({});
  protected label = voucherLabel;

  protected form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
    type: ['percent' as VoucherType],
    description: [''],
    value: [10],
    maxDiscount: [0],
    minOrderValue: [0],
    maxUses: [0],
    startsAt: [''],
    expiresAt: [''],
    isActive: [true],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.api.list({ q: this.q || undefined, status: this.status || undefined, page: this.page() }).subscribe({
      next: (r) => {
        this.result.set(r);
        this.state.set(r.data.length ? 'ok' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }

  isExpired(v: AdminVoucher): boolean {
    return !!v.expiresAt && new Date(v.expiresAt).getTime() < Date.now();
  }

  err(field: string): string | null {
    const c = this.form.get(field);
    if (this.fieldErrors()[field]) return this.fieldErrors()[field];
    if (c && c.invalid && c.touched) return field === 'code' ? 'Mã 3–30 ký tự, chỉ gồm chữ, số, "-" và "_"' : 'Giá trị không hợp lệ';
    return null;
  }

  openCreate(): void {
    this.form.reset();
    this.form.controls.code.enable();
    this.resetErrors();
    this.editing.set(null);
  }

  openEdit(v: AdminVoucher): void {
    const day = (d: string | null) => (d ? new Date(d).toLocaleDateString('sv-SE') : '');
    this.form.reset({
      code: v.code,
      type: v.type,
      description: v.description,
      value: v.value,
      maxDiscount: v.maxDiscount,
      minOrderValue: v.minOrderValue,
      maxUses: v.maxUses,
      startsAt: day(v.startsAt),
      expiresAt: day(v.expiresAt),
      isActive: v.isActive,
    });
    // Mã đã được dùng thì không cho đổi mã (server cũng chặn).
    if (v.usedCount > 0) this.form.controls.code.disable();
    else this.form.controls.code.enable();
    this.resetErrors();
    this.editing.set(v);
  }

  close(): void {
    this.editing.set(undefined);
  }

  private resetErrors(): void {
    this.formError.set(null);
    this.fieldErrors.set({});
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const f = this.form.getRawValue();
    // Ngày theo giờ Việt Nam: bắt đầu từ 00:00, hết hạn đến 23:59 của ngày chọn.
    const body: VoucherInput = {
      code: f.code.trim().toUpperCase(),
      type: f.type,
      description: f.description.trim(),
      value: f.type === 'freeship' ? 0 : Number(f.value) || 0,
      maxDiscount: f.type === 'percent' ? Number(f.maxDiscount) || 0 : 0,
      minOrderValue: Number(f.minOrderValue) || 0,
      maxUses: Number(f.maxUses) || 0,
      startsAt: f.startsAt ? `${f.startsAt}T00:00:00+07:00` : null,
      expiresAt: f.expiresAt ? `${f.expiresAt}T23:59:59+07:00` : null,
      isActive: f.isActive,
    };
    const current = this.editing();
    this.saving.set(true);
    this.resetErrors();
    const req = current ? this.api.update(current.id, body) : this.api.create(body);
    req.subscribe({
      next: (v) => {
        this.saving.set(false);
        this.toast.success(current ? `Đã cập nhật mã ${v.code}` : `Đã thêm mã ${v.code}`);
        this.close();
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        const err = ApiError.from(e);
        this.fieldErrors.set(err.fieldErrors());
        this.formError.set(err.message);
      },
    });
  }

  toggle(v: AdminVoucher): void {
    this.api.update(v.id, { isActive: !v.isActive }).subscribe({
      next: (x) => {
        this.toast.success(x.isActive ? `Đã bật mã ${x.code}` : `Đã tắt mã ${x.code}`);
        this.load();
      },
      error: (e) => this.toast.error(ApiError.from(e).message),
    });
  }

  remove(v: AdminVoucher): void {
    if (!confirm(`Xóa mã ${v.code}? Thao tác này không hoàn tác được.`)) return;
    this.api.remove(v.id).subscribe({
      next: () => {
        this.toast.success(`Đã xóa mã ${v.code}`);
        this.load();
      },
      error: (e) => this.toast.error(ApiError.from(e).message),
    });
  }
}
