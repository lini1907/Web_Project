import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { DELIVERY_WINDOW_LABELS, Order, OrderPart, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, PartStatus, SHIPMENT_STATUS_LABELS } from '../../core/models';
import { RealtimeService } from '../../core/services/realtime.service';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { MoneyPipe, StatusLabelPipe } from '../../shared/pipes';
import { StateComponent, StatusBadgeComponent } from '../../shared/ui';
import { ImgFallbackDirective } from '../../shared/img-fallback.directive';

const FLOW: PartStatus[] = ['pending', 'confirmed', 'shipping', 'delivered'];

/** Theo dõi đơn: mỗi nhà bán xử lý PHẦN ĐƠN của mình nên tiến trình hiển thị theo từng phần. */
@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, DatePipe, MoneyPipe, StatusLabelPipe, StateComponent, StatusBadgeComponent, ImgFallbackDirective],
  template: `
    <div class="container page">
      @if (state() !== 'ok') {
        <app-state [state]="state()" [errorText]="error()" (retry)="load(id())" />
      } @else {
        @let o = order()!;
        <nav class="breadcrumb"><a routerLink="/orders">Đơn hàng của tôi</a> › <span>{{ o.code }}</span></nav>
        @if (placed()) {
          <div class="note note-success big-note"><svg class="icon" aria-hidden="true"><use href="icons.svg#check" /></svg> Đặt hàng thành công!
            @if (o.paymentMethod === 'cod') { Nhà bán sẽ xác nhận sớm. Bạn thanh toán <b>{{ o.total | money }}</b> khi nhận hàng. }
            @else if (o.payment.status !== 'paid') { Vui lòng thanh toán <b>{{ o.total | money }}</b> qua {{ methodLabel[o.paymentMethod] }} để nhà bán xác nhận đơn. }
          </div>
        }
        @if (paymentResult() === 'success' && o.payment.status === 'paid') {
          <div class="note note-success big-note" role="status"><svg class="icon" aria-hidden="true"><use href="icons.svg#check" /></svg> Thanh toán thành công qua {{ methodLabel[o.paymentMethod] }}. Mã giao dịch: {{ o.payment.transactionId }}</div>
        } @else if (paymentResult() === 'failed' || o.payment.status === 'failed') {
          <div class="note note-danger" role="alert">Thanh toán chưa thành công{{ o.payment.message ? ': ' + o.payment.message : '' }}. Bạn có thể thanh toán lại hoặc hủy đơn.</div>
        }
        <div class="page-head">
          <div>
            <h1>Đơn {{ o.code }}</h1>
            <div class="muted">Đặt lúc {{ o.createdAt | date: 'HH:mm dd/MM/yyyy' }} · {{ methodLabel[o.paymentMethod] }} @if (o.source === 'group-buy') { · <span class="tag tag-orange">Đơn mua chung</span> }</div>
          </div>
          <div class="row-gap">
            <app-status [value]="o.status" />
            @if (o.canPay) {
              <button type="button" class="btn btn-primary" [disabled]="paying()" (click)="pay()">{{ paying() ? 'Đang chuyển sang cổng...' : 'Thanh toán ' + methodLabel[o.paymentMethod] }}</button>
            }
            @if (o.canCancel) {
              <button type="button" class="btn btn-outline text-danger" [disabled]="busy()" (click)="cancel()">Hủy phần đơn chờ xác nhận</button>
            }
          </div>
        </div>

        <div class="order-layout">
          <div>
            @for (part of o.parts; track part.id) {
              <section class="card part">
                <div class="row-between">
                  <b><svg class="icon" aria-hidden="true"><use href="icons.svg#farm" /></svg> {{ part.vendor.name }}</b>
                  <div class="row-gap"><app-status [value]="part.status" />@if (o.paymentMethod === 'cod') { <app-status [value]="part.cod.status" /> }</div>
                </div>
                @if (part.status !== 'cancelled') {
                  <ol class="tracker">
                    @for (s of flow; track s; let i = $index) {
                      <li [class.done]="stepIndex(part) >= i" [class.current]="stepIndex(part) === i">
                        <span class="dot"></span>
                        <span>{{ s | statusLabel }}</span>
                        @if (timeOf(part, s); as t) { <small>{{ t | date: 'HH:mm dd/MM' }}</small> }
                      </li>
                    }
                  </ol>
                  @if (part.shipment; as sh) {
                    <details class="shipment" [open]="part.status === 'shipping'">
                      <summary><b>{{ sh.carrierLabel }}</b> · Mã vận đơn <code>{{ sh.trackingCode }}</code> · {{ shipLabel[sh.status] }}
                        @if (sh.estimatedDelivery) { · dự kiến {{ sh.estimatedDelivery | date: 'dd/MM' }} }</summary>
                      <ol class="ship-events">
                        @for (e of sh.events.slice().reverse(); track $index) {
                          <li><small class="muted">{{ e.at | date: 'HH:mm dd/MM' }}</small> <b>{{ shipLabel[e.status] }}</b>@if (e.location) { · {{ e.location }} }@if (e.note) { — {{ e.note }} }</li>
                        }
                      </ol>
                    </details>
                  }
                } @else {
                  <div class="note note-danger">Phần đơn đã hủy @if (timeOf(part, 'cancelled'); as t) { lúc {{ t | date: 'HH:mm dd/MM' }} } — hàng đã được hoàn kho.</div>
                }
                @for (i of part.items; track i.id) {
                  <div class="order-item">
                    <img [src]="i.image" alt="" appImgFallback />
                    <div class="grow">
                      <div>{{ i.kind === 'box' ? 'Hộp: ' : '' }}{{ i.name }} @if (i.isRescue) { <span class="tag tag-green">Giải cứu</span> }</div>
                      <div class="small muted">{{ i.unitPrice | money }} × {{ i.qty }} {{ i.unit }}</div>
                    </div>
                    <b>{{ i.lineTotal | money }}</b>
                  </div>
                }
                <div class="row-between small"><span>Tạm tính phần này</span><b>{{ part.subtotal | money }}</b></div>
              </section>
            }
          </div>
          <aside class="card summary">
            <h3>Giao tới</h3>
            <p><b>{{ o.shippingAddress.name }}</b> · {{ o.shippingAddress.phone }}<br />{{ o.shippingAddress.address }}</p>
            @if (o.deliverySlot) { <p class="small">Nhận hàng: <b>{{ o.deliverySlot.date | date: 'dd/MM/yyyy' }}</b>, {{ windowLabel[o.deliverySlot.window] }}</p> }
            @if (o.note) { <p class="small muted">Ghi chú: {{ o.note }}</p> }
            <hr />
            <div class="row-between"><span>Tạm tính</span><b>{{ o.subtotal | money }}</b></div>
            <div class="row-between"><span>Phí giao hàng</span><b>{{ o.shippingFee === 0 ? 'Miễn phí' : (o.shippingFee | money) }}</b></div>
            @if (o.discount > 0) { <div class="row-between"><span>Giảm giá @if (o.voucher) { ({{ o.voucher.code }}) }</span><b>−{{ o.discount | money }}</b></div> }
            <div class="row-between total"><span>Tổng {{ o.paymentMethod === 'cod' ? '(COD)' : '' }}</span><b>{{ o.total | money }}</b></div>
            @if (o.paymentMethod !== 'cod') {
              <div class="row-between small"><span>{{ methodLabel[o.paymentMethod] }}</span><b [class.text-danger]="o.payment.status === 'failed'">{{ payLabel[o.payment.status] }}</b></div>
              @if (o.payment.status === 'refund_pending') { <p class="small muted">Đơn đã hủy sau khi thanh toán. FarmTable sẽ hoàn tiền về tài khoản của bạn.</p> }
            }
            <p class="small muted">Giá trong đơn là bản chụp lúc đặt, không đổi khi nhà bán sửa giá sau này. Trạng thái thu tiền do nhà bán xác nhận khi giao.</p>
          </aside>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .shipment { margin: 8px 0 12px; padding: 8px 10px; background: #f9fafb; border-radius: 8px; }
      .shipment summary { cursor: pointer; }
      .ship-events { list-style: none; padding: 0; margin: 8px 0 0; display: grid; gap: 4px; font-size: 0.88rem; }
    `,
  ],
})
export class OrderDetailPage {
  readonly id = input.required<string>();
  readonly placedParam = input<string | undefined>(undefined, { alias: 'placed' });
  /** ?payment=success|failed khi cổng thanh toán chuyển về. */
  readonly paymentResult = input<string | undefined>(undefined, { alias: 'payment' });
  protected methodLabel = PAYMENT_METHOD_LABELS;
  protected payLabel = PAYMENT_STATUS_LABELS;
  protected shipLabel = SHIPMENT_STATUS_LABELS;
  protected windowLabel = DELIVERY_WINDOW_LABELS;
  protected paying = signal(false);
  private orders = inject(OrderService);
  private toast = inject(ToastService);
  protected flow = FLOW;
  protected order = signal<Order | null>(null);
  protected state = signal<'loading' | 'error' | 'ok'>('loading');
  protected error = signal<string | null>(null);
  protected busy = signal(false);
  protected placed = signal(false);

  constructor() {
    effect(() => {
      this.placed.set(this.placedParam() === '1');
      this.load(this.id());
    });
    // Real-time: nhà bán đổi trạng thái / thanh toán xong => tải lại đơn, không cần F5.
    const sub = inject(RealtimeService)
      .on()
      .subscribe((e) => {
        if (e.orderId === this.id()) this.load(this.id(), true);
      });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  pay(): void {
    const o = this.order();
    if (!o) return;
    this.paying.set(true);
    this.orders.pay(o.id).subscribe({
      next: (r) => (window.location.href = r.payUrl),
      error: (e) => {
        this.paying.set(false);
        this.toast.error(ApiError.from(e).message);
      },
    });
  }

  load(id: string, silent = false): void {
    if (!silent) this.state.set('loading');
    this.orders.get(id).subscribe({
      next: (o) => {
        this.order.set(o);
        this.state.set('ok');
      },
      error: (e) => {
        const err = ApiError.from(e);
        this.error.set(err.status === 404 ? 'Không tìm thấy đơn hàng (hoặc đơn không thuộc tài khoản của bạn).' : err.message);
        this.state.set('error');
      },
    });
  }

  stepIndex(part: OrderPart): number {
    return FLOW.indexOf(part.status);
  }
  timeOf(part: OrderPart, status: string): string | null {
    return part.history.find((h) => h.status === status)?.at ?? null;
  }

  cancel(): void {
    const o = this.order();
    if (!o || !confirm('Hủy các phần đơn đang chờ xác nhận? Phần đã được nhà bán xác nhận sẽ không bị hủy.')) return;
    this.busy.set(true);
    this.orders.cancel(o.id).subscribe({
      next: (fresh) => {
        this.order.set(fresh);
        this.busy.set(false);
        this.toast.success('Đã hủy phần đơn chờ xác nhận');
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.error(ApiError.from(e).message);
        this.load(o.id);
      },
    });
  }
}
