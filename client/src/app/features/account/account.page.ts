import { Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { MyGroupBuy, RecHistoryEntry } from '../../core/models';
import { CatalogService } from '../../core/services/catalog.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { MoneyPipe } from '../../shared/pipes';
import { StateComponent, StatusBadgeComponent } from '../../shared/ui';
import { matchFields, strongPassword, vnPhone } from '../../shared/validators';

@Component({
  selector: 'app-account',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, MoneyPipe, StateComponent, StatusBadgeComponent],
  template: `
    <div class="container page">
      <h1><svg class="icon" aria-hidden="true"><use href="icons.svg#settings" /></svg> Tài khoản</h1>
      <div class="tabs">
        <a class="tab" [class.active]="tab() === 'profile'" [routerLink]="[]" [queryParams]="{ tab: null }">Hồ sơ</a>
        <a class="tab" [class.active]="tab() === 'password'" [routerLink]="[]" [queryParams]="{ tab: 'password' }">Đổi mật khẩu</a>
        @if (auth.isBuyer()) {
          <a class="tab" [class.active]="tab() === 'group-buys'" [routerLink]="[]" [queryParams]="{ tab: 'group-buys' }">Mua chung của tôi</a>
          <a class="tab" [class.active]="tab() === 'recs'" [routerLink]="[]" [queryParams]="{ tab: 'recs' }">Lịch sử gợi ý</a>
          <a class="tab" routerLink="/orders">Đơn hàng →</a>
        }
      </div>

      @switch (tab()) {
        @case ('password') {
          <form class="card form narrow" [formGroup]="pwForm" (ngSubmit)="changePassword()">
            <label>Mật khẩu hiện tại<input class="input" type="password" formControlName="currentPassword" autocomplete="current-password" /></label>
            @if (pwServerError()) { <span class="field-error">{{ pwServerError() }}</span> }
            <label>Mật khẩu mới<input class="input" type="password" formControlName="newPassword" autocomplete="new-password" /></label>
            @if (pwForm.controls.newPassword.errors?.['strongPassword'] && pwForm.controls.newPassword.touched) { <span class="field-error">8–72 ký tự, có cả chữ và số</span> }
            <label>Nhập lại mật khẩu mới<input class="input" type="password" formControlName="confirm" autocomplete="new-password" /></label>
            @if (pwForm.hasError('mismatch') && pwForm.controls.confirm.touched) { <span class="field-error">Mật khẩu nhập lại không khớp</span> }
            <button class="btn btn-primary" type="submit" [disabled]="busy()">Đổi mật khẩu</button>
          </form>
        }
        @case ('recs') {
          <p class="muted small">Các lần FarmTable gợi ý sản phẩm cho bạn, kèm lý do. Lịch sử tự xóa sau 90 ngày.</p>
          @if (recState() !== 'ok') {
            <app-state [state]="recState()" emptyText="Chưa có gợi ý nào. Hãy xem vài sản phẩm để hệ thống hiểu sở thích của bạn." emptyIcon="spark" (retry)="loadRecs()" />
          } @else {
            @for (h of recs(); track h.id) {
              <section class="card rec-history">
                <div class="row-between">
                  <b>@if (h.kind === 'for-me') { Gợi ý cho bạn } @else { Sản phẩm tương tự @if (h.context) { <a [routerLink]="['/products', h.context.slug]">{{ h.context.name }}</a> } }</b>
                  <small class="muted">{{ h.at | date: 'HH:mm dd/MM/yyyy' }} · <span class="tag" [class.tag-green]="h.source === 'model'">{{ h.source === 'model' ? 'Mô hình' : 'Phương pháp cơ sở' }}</span></small>
                </div>
                <ul class="rec-history-list">
                  @for (it of h.items; track it.product.id) {
                    <li><a [routerLink]="['/products', it.product.slug]">{{ it.product.name }}</a> <span class="muted">— {{ it.reason }}@if (it.score !== null) { (điểm {{ it.score }}) }</span></li>
                  }
                </ul>
              </section>
            }
          }
        }
        @case ('group-buys') {
          @if (gbState() !== 'ok') {
            <app-state [state]="gbState()" emptyText="Bạn chưa tham gia chiến dịch mua chung nào" emptyIcon="users" (retry)="loadGroupBuys()">
              <a routerLink="/group-buy" class="btn btn-orange">Xem chiến dịch đang mở</a>
            </app-state>
          } @else {
            <div class="table-wrap card">
              <table class="table">
                <thead><tr><th>Chiến dịch</th><th>Số lượng</th><th>Giá nhóm</th><th>Trạng thái chiến dịch</th><th>Cam kết của tôi</th><th></th></tr></thead>
                <tbody>
                  @for (m of myGroupBuys(); track m.id) {
                    <tr>
                      <td><a [routerLink]="['/group-buy', m.campaign.id]">{{ m.campaign.title }}</a><br /><small class="muted">Tham gia {{ m.joinedAt | date: 'dd/MM/yyyy' }}</small></td>
                      <td>{{ m.qty }} {{ m.campaign.product.unit }}</td>
                      <td>{{ m.campaign.groupPrice | money }}</td>
                      <td><app-status [value]="m.campaign.status" /> <small>{{ m.campaign.joinedQty }}/{{ m.campaign.targetQty }}</small></td>
                      <td><app-status [value]="m.status" /></td>
                      <td>@if (m.orderId) { <a [routerLink]="['/orders', m.orderId]">Xem đơn</a> }</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
        @default {
          <form class="card form narrow" [formGroup]="profile" (ngSubmit)="saveProfile()">
            <div class="muted">Email: <b>{{ auth.user()?.email }}</b> · Vai trò: <b>{{ roleLabel[auth.role() || 'buyer'] }}</b>
              @if (auth.user()?.vendorStatus; as vs) { · Trạng thái duyệt: <app-status [value]="vs" /> }
            </div>
            @if (auth.user()?.vendorNote) { <div class="note note-danger">Lý do: {{ auth.user()?.vendorNote }}</div> }
            <div class="form-row">
              <label>Họ tên<input class="input" formControlName="name" /></label>
              <label>Số điện thoại<input class="input" formControlName="phone" />
                @if (profile.controls.phone.invalid && profile.controls.phone.touched) { <span class="field-error">Số điện thoại không hợp lệ</span> }
              </label>
            </div>
            @if (auth.isBuyer()) {
              <fieldset formGroupName="address" class="fieldset">
                <legend>Địa chỉ giao hàng mặc định</legend>
                <div class="form-row">
                  <label>Người nhận<input class="input" formControlName="name" /></label>
                  <label>SĐT nhận hàng<input class="input" formControlName="phone" /></label>
                </div>
                <label>Địa chỉ<input class="input" formControlName="address" /></label>
              </fieldset>
            }
            <button class="btn btn-primary" type="submit" [disabled]="busy() || profile.invalid">Lưu thay đổi</button>
          </form>
        }
      }
    </div>
  `,
  styles: [`.rec-history { margin-bottom: 10px; } .rec-history-list { margin: 6px 0 0; padding-left: 18px; font-size: 0.9rem; }`],
})
export class AccountPage {
  readonly tabParam = input<string | undefined>(undefined, { alias: 'tab' });
  protected auth = inject(AuthService);
  private orders = inject(OrderService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  protected roleLabel = { buyer: 'Người mua', vendor: 'Nhà bán', admin: 'Quản trị viên' } as const;

  protected tab = signal<'profile' | 'password' | 'group-buys' | 'recs'>('profile');
  private catalog = inject(CatalogService);
  protected recs = signal<RecHistoryEntry[]>([]);
  protected recState = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');
  protected busy = signal(false);
  protected pwServerError = signal<string | null>(null);
  protected myGroupBuys = signal<MyGroupBuy[]>([]);
  protected gbState = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');

  protected profile = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [vnPhone]],
    address: this.fb.nonNullable.group({ name: [''], phone: ['', [vnPhone]], address: [''] }),
  });
  protected pwForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, strongPassword]],
      confirm: ['', Validators.required],
    },
    { validators: matchFields('newPassword', 'confirm') },
  );

  constructor() {
    effect(() => {
      const u = this.auth.user();
      if (u) this.profile.patchValue({ name: u.name, phone: u.phone, address: u.address ?? { name: u.name, phone: u.phone, address: '' } });
    });
    effect(() => {
      const t = this.tabParam();
      const tab = t === 'password' || t === 'group-buys' || t === 'recs' ? t : 'profile';
      this.tab.set(tab);
      if (tab === 'group-buys') this.loadGroupBuys();
      if (tab === 'recs') this.loadRecs();
    });
  }

  loadRecs(): void {
    this.recState.set('loading');
    this.catalog.recHistory(20).subscribe({
      next: (r) => {
        this.recs.set(r);
        this.recState.set(r.length ? 'ok' : 'empty');
      },
      error: () => this.recState.set('error'),
    });
  }

  loadGroupBuys(): void {
    this.gbState.set('loading');
    this.orders.myGroupBuys().subscribe({
      next: (r) => {
        this.myGroupBuys.set(r);
        this.gbState.set(r.length ? 'ok' : 'empty');
      },
      error: () => this.gbState.set('error'),
    });
  }

  async saveProfile(): Promise<void> {
    const v = this.profile.getRawValue();
    const addr = v.address.address.trim() ? v.address : null;
    this.busy.set(true);
    try {
      await this.auth.updateProfile({ name: v.name, phone: v.phone || undefined, ...(this.auth.isBuyer() ? { address: addr } : {}) });
      this.toast.success('Đã lưu hồ sơ');
    } catch (e) {
      this.toast.error(ApiError.from(e).message);
    } finally {
      this.busy.set(false);
    }
  }

  async changePassword(): Promise<void> {
    this.pwServerError.set(null);
    if (this.pwForm.invalid) {
      this.pwForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    try {
      const v = this.pwForm.getRawValue();
      await this.auth.changePassword(v.currentPassword, v.newPassword);
      this.pwForm.reset();
      this.toast.success('Đã đổi mật khẩu');
      this.router.navigate([], { queryParams: { tab: null } });
    } catch (e) {
      const err = ApiError.from(e);
      this.pwServerError.set(err.fieldErrors()['currentPassword'] || err.fieldErrors()['newPassword'] || err.message);
    } finally {
      this.busy.set(false);
    }
  }
}
