import { Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { Order, OrderPart, PartStatus } from '../../core/models';
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
          <div class="note note-success big-note"><svg class="icon" aria-hidden="true"><use href="icons.svg#check" /></svg> Đặt hàng thành công! Nhà bán sẽ xác nhận sớm. Bạn thanh toán <b>{{ o.total | money }}</b> khi nhận hàng.</div>
        }
        <div class="page-head">
          <div>
            <h1>Đơn {{ o.code }}</h1>
            <div class="muted">Đặt lúc {{ o.createdAt | date: 'HH:mm dd/MM/yyyy' }} · Thanh toán khi nhận hàng (COD) @if (o.source === 'group-buy') { · <span class="tag tag-orange">Đơn mua chung</span> }</div>
          </div>
          <div class="row-gap">
            <app-status [value]="o.status" />
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
                  <div class="row-gap"><app-status [value]="part.status" /><app-status [value]="part.cod.status" /></div>
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
            @if (o.note) { <p class="small muted">Ghi chú: {{ o.note }}</p> }
            <hr />
            <div class="row-between"><span>Tạm tính</span><b>{{ o.subtotal | money }}</b></div>
            <div class="row-between"><span>Phí giao hàng</span><b>{{ o.shippingFee === 0 ? 'Miễn phí' : (o.shippingFee | money) }}</b></div>
            <div class="row-between total"><span>Tổng (COD)</span><b>{{ o.total | money }}</b></div>
            <p class="small muted">Giá trong đơn là bản chụp lúc đặt, không đổi khi nhà bán sửa giá sau này. Trạng thái thu tiền do nhà bán xác nhận khi giao.</p>
          </aside>
        </div>
      }
    </div>
  `,
})
export class OrderDetailPage {
  readonly id = input.required<string>();
  readonly placedParam = input<string | undefined>(undefined, { alias: 'placed' });
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
  }

  load(id: string): void {
    this.state.set('loading');
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
