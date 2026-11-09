import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { GroupBuy, VendorProduct } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { VendorService } from '../../core/services/vendor.service';
import { MoneyPipe } from '../../shared/pipes';
import { CountdownComponent, StateComponent, StatusBadgeComponent } from '../../shared/ui';
import { futureAtLeast, lessOrEqual } from '../../shared/validators';

@Component({
  selector: 'app-vendor-group-buys',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, MoneyPipe, CountdownComponent, StateComponent, StatusBadgeComponent],
  template: `
    <div class="page-head">
      <h1>Chiến dịch mua chung</h1>
      @if (approved()) { <button type="button" class="btn btn-orange" (click)="showForm.set(!showForm())">{{ showForm() ? 'Đóng form' : '+ Tạo chiến dịch' }}</button> }
    </div>
    @if (showForm()) {
      <form class="card form" [formGroup]="form" (ngSubmit)="create()" novalidate>
        <h3>Tạo chiến dịch</h3>
        <label>Sản phẩm *
          <select class="input" formControlName="productId">
            <option value="">-- Chọn sản phẩm đang bán --</option>
            @for (p of products(); track p.id) { <option [value]="p.id">{{ p.name }} — {{ p.price | money }}/{{ p.unit }} (khả dụng {{ p.stock - p.reservedStock }})</option> }
          </select>
        </label>
        <label>Tiêu đề (tùy chọn)<input class="input" formControlName="title" placeholder="Mua chung ..." /></label>
        <div class="form-row three">
          <label>Giá nhóm (đ) *<input class="input" type="number" formControlName="groupPrice" min="1000" step="1000" />
            @if (selected() && fv().groupPrice >= selected()!.price) { <span class="field-error">Phải thấp hơn giá lẻ {{ selected()!.price | money }}</span> }
          </label>
          <label>Ngưỡng thành công *<input class="input" type="number" formControlName="targetQty" min="2" /></label>
          <label>Số lượng tối đa *<input class="input" type="number" formControlName="maxQty" min="2" />
            @if (selected() && fv().maxQty > selected()!.stock - selected()!.reservedStock) { <span class="field-error">Vượt tồn khả dụng</span> }
          </label>
        </div>
        @if (form.hasError('order')) { <span class="field-error">Ngưỡng thành công không được lớn hơn số lượng tối đa</span> }
        <label>Hạn chót * (sau hiện tại ít nhất 1 giờ)<input class="input" type="datetime-local" formControlName="deadline" />
          @if (form.controls.deadline.errors?.['future'] && form.controls.deadline.touched) { <span class="field-error">Hạn chót phải sau hiện tại ít nhất 1 giờ</span> }
        </label>
        @if (selected(); as p) {
          <div class="note">Giảm {{ discount() }}% so với giá lẻ · Doanh thu tối đa nếu đầy: {{ fv().groupPrice * fv().maxQty | money }}</div>
        }
        @if (error()) { <div class="note note-danger">{{ error() }}</div> }
        <button class="btn btn-orange" type="submit" [disabled]="busy()">Tạo chiến dịch</button>
      </form>
    }
    @if (state() !== 'ok') {
      <app-state [state]="state()" emptyText="Chưa có chiến dịch nào" emptyIcon="users" (retry)="load()" />
    } @else {
      <div class="table-wrap card">
        <table class="table">
          <thead><tr><th>Chiến dịch</th><th>Giá nhóm</th><th>Tiến độ</th><th>Hạn chót</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            @for (g of items(); track g.id) {
              <tr>
                <td><a [routerLink]="['/group-buy', g.id]">{{ g.title }}</a></td>
                <td>{{ g.groupPrice | money }}<br /><s class="small muted">{{ g.regularPrice | money }}</s></td>
                <td>
                  <div class="progress" [class.done]="g.reachedTarget"><div [style.width.%]="g.progress"></div></div>
                  <small>{{ g.joinedQty }}/{{ g.targetQty }} (tối đa {{ g.maxQty }}) · {{ g.memberCount }} người</small>
                </td>
                <td>@if (g.status === 'open') { <app-countdown [deadline]="g.deadline" [serverTime]="g.serverTime" /> } @else { {{ g.deadline | date: 'dd/MM HH:mm' }} }</td>
                <td><app-status [value]="g.status" /><br /><small class="muted">{{ g.closeReason }}</small></td>
                <td>@if (g.status === 'open') { <button type="button" class="btn btn-outline btn-xs text-danger" (click)="cancel(g)">Hủy</button> }</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="small muted">Khi hết hạn hoặc đủ số lượng tối đa: đạt ngưỡng ⇒ hệ thống tự tạo một đơn COD giá nhóm cho mỗi thành viên (xuất hiện trong "Đơn hàng"); không đạt ⇒ trả lại hàng giữ chỗ.</p>
    }
  `,
})
export class VendorGroupBuysPage {
  private vendor = inject(VendorService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  protected items = signal<GroupBuy[]>([]);
  protected products = signal<VendorProduct[]>([]);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');
  protected showForm = signal(false);
  protected busy = signal(false);
  protected error = signal<string | null>(null);
  protected approved = () => this.auth.user()?.vendorStatus === 'approved';

  protected form = this.fb.nonNullable.group(
    {
      productId: ['', Validators.required],
      title: [''],
      groupPrice: [0, [Validators.required, Validators.min(1000)]],
      targetQty: [10, [Validators.required, Validators.min(2)]],
      maxQty: [20, [Validators.required, Validators.min(2)]],
      deadline: [this.defaultDeadline(), [Validators.required, futureAtLeast(60)]],
    },
    { validators: lessOrEqual('targetQty', 'maxQty', 'order') },
  );
  protected fv = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() }) as () => ReturnType<typeof this.form.getRawValue>;
  protected selected = computed(() => this.products().find((p) => p.id === this.fv().productId) ?? null);
  protected discount = computed(() => {
    const p = this.selected();
    return p ? Math.round((1 - this.fv().groupPrice / p.price) * 100) : 0;
  });

  constructor() {
    this.load();
    this.vendor.products(undefined, 'active').subscribe({ next: (p) => this.products.set(p.filter((x) => x.type === 'regular')) });
  }

  private defaultDeadline(): string {
    const d = new Date(Date.now() + 3 * 86400000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  load(): void {
    this.state.set('loading');
    this.vendor.groupBuys().subscribe({
      next: (r) => {
        this.items.set(r);
        this.state.set(r.length ? 'ok' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }

  create(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.vendor.createGroupBuy({ ...v, title: v.title || undefined, deadline: new Date(v.deadline).toISOString() }).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Đã tạo chiến dịch mua chung');
        this.showForm.set(false);
        this.form.reset({ productId: '', title: '', groupPrice: 0, targetQty: 10, maxQty: 20, deadline: this.defaultDeadline() });
        this.load();
      },
      error: (e) => {
        this.busy.set(false);
        const err = ApiError.from(e);
        const fields = Object.values(err.fieldErrors());
        this.error.set(fields.length ? fields.join(' · ') : err.message);
      },
    });
  }

  cancel(g: GroupBuy): void {
    if (!confirm(`Hủy chiến dịch "${g.title}"? Toàn bộ hàng giữ chỗ sẽ được trả lại.`)) return;
    this.vendor.cancelGroupBuy(g.id).subscribe({
      next: () => {
        this.toast.success('Đã hủy chiến dịch');
        this.load();
      },
      error: (e) => this.toast.error(ApiError.from(e).message),
    });
  }
}
