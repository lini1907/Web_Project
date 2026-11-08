import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { GroupBuy } from '../../core/models';
import { ApiError, newIdempotencyKey } from '../../core/api';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { CountdownComponent, StateComponent, StatusBadgeComponent } from '../../shared/ui';
import { MoneyPipe } from '../../shared/pipes';
import { ImgFallbackDirective } from '../../shared/img-fallback.directive';
import { vnPhone } from '../../shared/validators';

const POLL_MS = 15000;

@Component({
  selector: 'app-group-buy-detail',
  imports: [RouterLink, DatePipe, ReactiveFormsModule, CountdownComponent, StateComponent, StatusBadgeComponent, MoneyPipe, ImgFallbackDirective],
  template: `
    <div class="container page">
      @if (state() !== 'ok') {
        <app-state [state]="state()" [errorText]="error()" (retry)="load(id())" />
      } @else {
        @let g = gb()!;
        <nav class="breadcrumb"><a routerLink="/">Trang chủ</a> › <a routerLink="/group-buy">Mua chung</a> › <span>{{ g.title }}</span></nav>
        <div class="detail">
          <div class="gallery"><div class="gallery-main"><img [src]="g.product.mainImage" [alt]="g.product.name" appImgFallback /></div></div>
          <div class="detail-info">
            <app-status [value]="g.status" />
            <h1>{{ g.title }}</h1>
            <div class="muted">Nhà bán: {{ g.vendor.name }} · <a [routerLink]="['/products', g.product.slug]">Xem sản phẩm</a></div>
            <div class="detail-price">{{ g.groupPrice | money }} <small>/ {{ g.product.unit }}</small> <s>{{ g.regularPrice | money }}</s> <span class="tag tag-orange">-{{ g.discountRate }}%</span></div>

            <div class="gb-progress-box">
              <div class="row-between"><b>{{ g.joinedQty }} / {{ g.targetQty }} {{ g.product.unit }}</b><span>{{ g.memberCount }} người tham gia</span></div>
              <div class="progress lg" [class.done]="g.reachedTarget"><div [style.width.%]="g.progress"></div></div>
              <div class="row-between small muted">
                <span>{{ g.reachedTarget ? '✅ Đã đạt ngưỡng — sẽ chốt đơn khi hết hạn hoặc đủ ' + g.maxQty : 'Cần thêm ' + (g.targetQty - g.joinedQty) + ' ' + g.product.unit + ' để đạt ngưỡng' }}</span>
                <span>Tối đa {{ g.maxQty }} · còn {{ g.remainingQty }}</span>
              </div>
              @if (g.status === 'open') {
                <div class="row-between"><span>Kết thúc sau</span><app-countdown [deadline]="g.deadline" [serverTime]="g.serverTime" /></div>
              } @else {
                <div class="note">Chiến dịch đã đóng lúc {{ g.closedAt | date: 'HH:mm dd/MM/yyyy' }} · {{ g.closeReason }}</div>
              }
              <div class="small muted">Tự cập nhật mỗi 15 giây · lần cuối {{ lastSync() | date: 'HH:mm:ss' }}</div>
            </div>

            @if (g.myMembership; as m) {
              <div class="note note-success">
                Bạn đã cam kết <b>{{ m.qty }} {{ g.product.unit }}</b> — trạng thái: <app-status [value]="m.status" />
                @if (m.orderId) { · <a [routerLink]="['/orders', m.orderId]">Xem đơn COD đã tạo</a> }
              </div>
              @if (m.status === 'committed' && g.status === 'open') {
                <button type="button" class="btn btn-outline" [disabled]="busy()" (click)="withdraw()">Rút cam kết</button>
              }
            } @else if (g.joinable) {
              @if (!auth.isLoggedIn()) {
                <a class="btn btn-orange btn-lg" routerLink="/login" [queryParams]="{ returnUrl: '/group-buy/' + g.id }">Đăng nhập để tham gia</a>
              } @else if (!auth.isBuyer()) {
                <div class="note">Chỉ tài khoản người mua mới tham gia mua chung được.</div>
              } @else {
                <form class="card form" [formGroup]="form" (ngSubmit)="join()">
                  <h3>Tham gia mua chung</h3>
                  <div class="form-row">
                    <label>Số lượng ({{ g.product.unit }})<input class="input" type="number" formControlName="qty" min="1" [max]="g.remainingQty" /></label>
                    <label>Người nhận<input class="input" formControlName="name" autocomplete="name" /></label>
                    <label>Số điện thoại<input class="input" formControlName="phone" autocomplete="tel" /></label>
                  </div>
                  <label>Địa chỉ giao hàng<input class="input" formControlName="address" autocomplete="street-address" /></label>
                  @if (form.invalid && form.touched) { <div class="field-error">Vui lòng nhập đủ thông tin hợp lệ (SĐT 10 số, địa chỉ ≥ 10 ký tự, số lượng ≤ {{ g.remainingQty }}).</div> }
                  <div class="row-between">
                    <span>Tạm tính khi chốt: <b>{{ (form.value.qty || 0) * g.groupPrice | money }}</b> (COD)</span>
                    <button type="submit" class="btn btn-orange" [disabled]="busy()">{{ busy() ? 'Đang gửi...' : 'Cam kết tham gia' }}</button>
                  </div>
                  <p class="small muted">Chưa thu tiền ở bước này. Đơn COD chỉ được tạo khi chiến dịch đạt ngưỡng.</p>
                </form>
              }
            } @else if (g.status === 'open') {
              <div class="note">Chiến dịch đã đủ số lượng hoặc đã hết hạn.</div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class GroupBuyDetailPage {
  readonly id = input.required<string>();
  private catalog = inject(CatalogService);
  private orders = inject(OrderService);
  private toast = inject(ToastService);
  private title = inject(Title);
  private router = inject(Router);
  protected auth = inject(AuthService);
  private fb = inject(FormBuilder);

  protected gb = signal<GroupBuy | null>(null);
  protected state = signal<'loading' | 'error' | 'ok'>('loading');
  protected error = signal<string | null>(null);
  protected busy = signal(false);
  protected lastSync = signal(new Date());
  private idemKey = newIdempotencyKey();

  protected form = this.fb.nonNullable.group({
    qty: [1, [Validators.required, Validators.min(1)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, vnPhone]],
    address: ['', [Validators.required, Validators.minLength(10)]],
  });
  protected remaining = computed(() => this.gb()?.remainingQty ?? 1);

  constructor() {
    effect(() => this.load(this.id()));
    effect(() => {
      const addr = this.auth.user()?.address;
      if (addr && !this.form.dirty) this.form.patchValue(addr);
      this.form.controls.qty.setValidators([Validators.required, Validators.min(1), Validators.max(Math.max(1, this.remaining()))]);
      this.form.controls.qty.updateValueAndValidity({ emitEvent: false });
    });
    const timer = setInterval(() => this.refresh(), POLL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  load(id: string): void {
    this.state.set('loading');
    this.catalog.groupBuy(id).subscribe({
      next: (g) => {
        this.gb.set(g);
        this.title.setTitle(`${g.title} · FarmTable`);
        this.lastSync.set(new Date());
        this.state.set('ok');
      },
      error: (e) => {
        this.error.set(ApiError.from(e).message);
        this.state.set('error');
      },
    });
  }

  /** Đồng bộ tiến độ theo server (polling) để nhiều trình duyệt thấy cùng số liệu. */
  private refresh(): void {
    const g = this.gb();
    if (!g || document.hidden) return;
    this.catalog.groupBuy(g.id).subscribe({
      next: (fresh) => {
        this.gb.set(fresh);
        this.lastSync.set(new Date());
      },
    });
  }

  join(): void {
    const g = this.gb();
    if (!g) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { qty, name, phone, address } = this.form.getRawValue();
    this.busy.set(true);
    this.orders.joinGroupBuy(g.id, { qty, shippingAddress: { name, phone, address } }, this.idemKey).subscribe({
      next: (fresh) => {
        this.gb.set(fresh);
        this.busy.set(false);
        this.idemKey = newIdempotencyKey();
        this.toast.success(fresh.status === 'succeeded' ? 'Chiến dịch đã đủ số lượng — đơn COD đã được tạo!' : 'Đã cam kết tham gia mua chung');
      },
      error: (e) => {
        this.busy.set(false);
        const err = ApiError.from(e);
        this.toast.error(err.message);
        if (['CAMPAIGN_FULL', 'CAMPAIGN_CLOSED', 'ALREADY_JOINED'].includes(err.code)) this.refresh();
      },
    });
  }

  withdraw(): void {
    const g = this.gb();
    if (!g || !confirm('Rút cam kết tham gia chiến dịch này?')) return;
    this.busy.set(true);
    this.orders.withdrawGroupBuy(g.id).subscribe({
      next: (fresh) => {
        this.gb.set(fresh);
        this.busy.set(false);
        this.toast.success('Đã rút cam kết');
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.error(ApiError.from(e).message);
      },
    });
  }
}
