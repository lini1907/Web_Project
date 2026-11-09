import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiError } from '../../core/api';
import { Carrier, DELIVERY_WINDOW_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, Paged, PartStatus, SHIPMENT_STATUS_LABELS, VendorOrderPart } from '../../core/models';
import { RealtimeService } from '../../core/services/realtime.service';
import { ToastService } from '../../core/services/toast.service';
import { VendorService } from '../../core/services/vendor.service';
import { MoneyPipe, StatusLabelPipe } from '../../shared/pipes';
import { PaginationComponent, StateComponent, StatusBadgeComponent } from '../../shared/ui';

const ACTION_LABEL: Record<string, string> = {
  confirmed: 'Xác nhận',
  shipping: 'Giao hàng',
  delivered: 'Đã giao',
  cancelled: 'Hủy',
};

/** Vendor chỉ thấy và xử lý PHẦN ĐƠN của mình (server lọc theo vendorId của session). */
@Component({
  selector: 'app-vendor-orders',
  imports: [FormsModule, DatePipe, MoneyPipe, StatusLabelPipe, PaginationComponent, StateComponent, StatusBadgeComponent],
  template: `
    <div class="page-head"><h1>Đơn hàng</h1></div>
    <div class="tabs">
      @for (t of tabs; track t) {
        <button type="button" class="tab" [class.active]="status() === t" (click)="setStatus(t)">{{ t ? (t | statusLabel) : 'Tất cả' }}</button>
      }
    </div>
    @if (state() !== 'ok') {
      <app-state [state]="state()" emptyText="Không có phần đơn nào" emptyIcon="box" (retry)="load()" />
    } @else {
      <div class="order-list">
        @for (o of result()!.data; track o.partId) {
          <article class="card part">
            <div class="row-between">
              <div>
                <b>{{ o.code }}</b> · <span class="muted small">{{ o.createdAt | date: 'HH:mm dd/MM/yyyy' }}</span>
                @if (o.source === 'group-buy') { <span class="tag tag-orange">Mua chung</span> }
              </div>
              <div class="row-gap"><app-status [value]="o.status" /><app-status [value]="o.cod.status" /></div>
            </div>
            <div class="small"><svg class="icon" aria-hidden="true"><use href="icons.svg#user" /></svg> {{ o.buyer.name }} · {{ o.buyer.phone }} · {{ o.buyer.address }}</div>
            @if (o.deliverySlot) { <div class="small"><svg class="icon" aria-hidden="true"><use href="icons.svg#clock" /></svg> Khách muốn nhận: <b>{{ o.deliverySlot.date | date: 'dd/MM' }}</b>, {{ windowLabel[o.deliverySlot.window] }}</div> }
            @if (o.paymentMethod !== 'cod') {
              <div class="small">Thanh toán: {{ methodLabel[o.paymentMethod] }} — <b [class.text-danger]="o.awaitingPayment">{{ payLabel[o.paymentStatus] }}</b>
                @if (o.awaitingPayment && o.status === 'pending') { <span class="muted">(chờ người mua thanh toán xong mới xác nhận được)</span> }</div>
            }
            @if (o.note) { <div class="small muted">Ghi chú: {{ o.note }}</div> }
            <ul class="item-list">
              @for (i of o.items; track i.id) {
                <li>
                  {{ i.qty }} × {{ i.kind === 'box' ? 'Hộp: ' : '' }}{{ i.name }} <span class="muted">({{ i.unitPrice | money }}/{{ i.unit }})</span> — <b>{{ i.lineTotal | money }}</b>
                  @if (i.contents?.length) {
                    <div class="small muted">Đóng gói: @for (c of i.contents; track c.productId) { {{ c.qty }} × {{ c.name }}; }</div>
                  }
                </li>
              }
            </ul>
            @if (o.shipment; as sh) {
              <div class="ship-box small">
                <div><b>{{ sh.carrierLabel }}</b> · <code>{{ sh.trackingCode }}</code> · {{ shipLabel[sh.status] }}
                  @if (sh.estimatedDelivery) { · dự kiến {{ sh.estimatedDelivery | date: 'dd/MM' }} }</div>
                <div class="muted">@for (e of sh.events; track $index) { {{ e.at | date: 'HH:mm dd/MM' }} {{ shipLabel[e.status] }}@if (e.location) { ({{ e.location }}) }{{ $last ? '' : ' → ' }} }</div>
                @if (o.status === 'shipping') {
                  <div class="row-gap wrap">
                    @if (sh.status === 'picked') { <button type="button" class="btn btn-outline btn-xs" (click)="shipEvent(o, 'in_transit')">Đang trung chuyển</button> }
                    @if (sh.status === 'picked' || sh.status === 'in_transit' || sh.status === 'failed') { <button type="button" class="btn btn-outline btn-xs" (click)="shipEvent(o, 'out_for_delivery')">{{ sh.status === 'failed' ? 'Giao lại' : 'Đang đi giao' }}</button> }
                    @if (sh.status !== 'failed') { <button type="button" class="btn btn-outline btn-xs text-danger" (click)="shipEvent(o, 'failed')">Giao thất bại</button> }
                  </div>
                }
              </div>
            }
            <div class="row-between">
              <span>Tiền hàng phần này: <b>{{ o.subtotal | money }}</b> {{ o.paymentMethod === 'cod' ? '(COD)' : '' }}</span>
              <div class="row-gap">
                @for (s of o.nextStatuses; track s) {
                  <button type="button" class="btn btn-sm" [class.btn-primary]="s !== 'cancelled'" [class.btn-outline]="s === 'cancelled'" [disabled]="busy() === o.partId || (s === 'confirmed' && o.awaitingPayment)" (click)="s === 'shipping' ? openShip(o) : setPartStatus(o, s)">{{ actionLabel[s] }}</button>
                }
                @if (o.status === 'delivered' && o.cod.status === 'unpaid' && o.paymentMethod === 'cod') {
                  <button type="button" class="btn btn-sm btn-orange" [disabled]="busy() === o.partId" (click)="collect(o)"><svg class="icon" aria-hidden="true"><use href="icons.svg#wallet" /></svg> Đã thu tiền COD</button>
                }
              </div>
            </div>
          </article>
        }
      </div>
      <app-pagination [page]="result()!.page" [totalPages]="result()!.totalPages" (pageChange)="page.set($event); load()" />
    }

    @if (shipTarget(); as t) {
      <div class="modal-backdrop" (click)="shipTarget.set(null)">
        <form class="modal card form" (ngSubmit)="confirmShip()" (click)="$event.stopPropagation()">
          <h2>Giao hàng đơn {{ t.code }}</h2>
          <label>Đơn vị vận chuyển
            <select class="input" name="carrier" [(ngModel)]="ship.carrier">
              @for (c of carriers; track c.value) { <option [value]="c.value">{{ c.label }}</option> }
            </select>
          </label>
          <label>Mã vận đơn {{ ship.carrier === 'self' ? '(để trống để hệ thống tự tạo)' : '' }}
            <input class="input" name="trackingCode" [(ngModel)]="ship.trackingCode" maxlength="40" placeholder="VD: GHN123456VN" style="text-transform: uppercase" />
          </label>
          <label>Ngày giao dự kiến <input class="input" type="date" name="eta" [(ngModel)]="ship.estimatedDelivery" /></label>
          @if (t.deliverySlot) { <p class="small muted">Khách muốn nhận {{ t.deliverySlot.date | date: 'dd/MM/yyyy' }}, {{ windowLabel[t.deliverySlot.window] }}.</p> }
          <div class="row-gap">
            <button type="submit" class="btn btn-primary" [disabled]="busy() === t.partId">Bắt đầu giao</button>
            <button type="button" class="btn btn-outline" (click)="shipTarget.set(null)">Hủy</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: [`.ship-box { background: #f9fafb; border-radius: 8px; padding: 8px 10px; margin: 6px 0; display: grid; gap: 4px; }`],
})
export class VendorOrdersPage {
  private vendor = inject(VendorService);
  private toast = inject(ToastService);
  protected tabs = ['', 'pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
  protected actionLabel = ACTION_LABEL;
  protected status = signal('pending');
  protected page = signal(1);
  protected result = signal<Paged<VendorOrderPart> | null>(null);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');
  protected busy = signal<string | null>(null);
  protected windowLabel = DELIVERY_WINDOW_LABELS;
  protected methodLabel = PAYMENT_METHOD_LABELS;
  protected payLabel = PAYMENT_STATUS_LABELS;
  protected shipLabel = SHIPMENT_STATUS_LABELS;
  protected carriers: { value: Carrier; label: string }[] = [
    { value: 'self', label: 'Nhà vườn tự giao' },
    { value: 'ghn', label: 'Giao Hàng Nhanh' },
    { value: 'ghtk', label: 'Giao Hàng Tiết Kiệm' },
    { value: 'viettel-post', label: 'Viettel Post' },
    { value: 'other', label: 'Đơn vị khác' },
  ];
  protected shipTarget = signal<VendorOrderPart | null>(null);
  protected ship: { carrier: Carrier; trackingCode: string; estimatedDelivery: string } = { carrier: 'self', trackingCode: '', estimatedDelivery: '' };

  constructor() {
    this.load();
    // Real-time: có đơn mới / người mua hủy / thanh toán xong => tải lại danh sách.
    const sub = inject(RealtimeService)
      .on()
      .subscribe(() => this.load(true));
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  openShip(o: VendorOrderPart): void {
    this.ship = { carrier: 'self', trackingCode: '', estimatedDelivery: o.deliverySlot?.date || '' };
    this.shipTarget.set(o);
  }

  confirmShip(): void {
    const o = this.shipTarget();
    if (!o) return;
    const body = {
      carrier: this.ship.carrier,
      trackingCode: this.ship.trackingCode.trim().toUpperCase() || undefined,
      estimatedDelivery: this.ship.estimatedDelivery ? `${this.ship.estimatedDelivery}T12:00:00+07:00` : undefined,
    };
    this.busy.set(o.partId);
    this.vendor.setPartStatus(o.orderId, o.partId, 'shipping', body).subscribe({
      next: (fresh) => {
        this.replace(fresh);
        this.busy.set(null);
        this.shipTarget.set(null);
        this.toast.success(`Đơn ${o.code}: đã bắt đầu giao (vận đơn ${fresh.shipment?.trackingCode})`);
      },
      error: (e) => {
        this.busy.set(null);
        this.toast.error(ApiError.from(e).message);
      },
    });
  }

  shipEvent(o: VendorOrderPart, status: 'in_transit' | 'out_for_delivery' | 'failed'): void {
    const note = status === 'failed' ? prompt('Lý do giao không thành công (vd: khách không nghe máy):')?.trim() : undefined;
    if (status === 'failed' && note === undefined) return;
    this.busy.set(o.partId);
    this.vendor.addShipmentEvent(o.orderId, o.partId, { status, note: note || undefined }).subscribe({
      next: (fresh) => {
        this.replace(fresh);
        this.busy.set(null);
        this.toast.success(`Đơn ${o.code}: ${this.shipLabel[status].toLowerCase()}`);
      },
      error: (e) => {
        this.busy.set(null);
        this.toast.error(ApiError.from(e).message);
      },
    });
  }

  setStatus(s: string): void {
    this.status.set(s);
    this.page.set(1);
    this.load();
  }

  load(silent = false): void {
    if (!silent) this.state.set('loading');
    this.vendor.orders(this.page(), this.status() || undefined).subscribe({
      next: (r) => {
        this.result.set(r);
        this.state.set(r.data.length ? 'ok' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }

  private replace(p: VendorOrderPart): void {
    this.result.update((r) => (r ? { ...r, data: r.data.map((x) => (x.partId === p.partId ? p : x)) } : r));
  }

  setPartStatus(o: VendorOrderPart, s: PartStatus): void {
    if (s === 'cancelled' && !confirm(`Hủy phần đơn ${o.code}? Hàng sẽ được hoàn lại kho.`)) return;
    this.busy.set(o.partId);
    this.vendor.setPartStatus(o.orderId, o.partId, s).subscribe({
      next: (fresh) => {
        this.replace(fresh);
        this.busy.set(null);
        this.toast.success(`Đơn ${o.code}: ${ACTION_LABEL[s].replace(/^\S+ /, '')}`);
      },
      error: (e) => {
        this.busy.set(null);
        this.toast.error(ApiError.from(e).message);
        this.load();
      },
    });
  }

  collect(o: VendorOrderPart): void {
    this.busy.set(o.partId);
    this.vendor.collectCod(o.orderId, o.partId).subscribe({
      next: (fresh) => {
        this.replace(fresh);
        this.busy.set(null);
        this.toast.success(`Đã ghi nhận thu tiền COD đơn ${o.code}`);
      },
      error: (e) => {
        this.busy.set(null);
        this.toast.error(ApiError.from(e).message);
      },
    });
  }
}
