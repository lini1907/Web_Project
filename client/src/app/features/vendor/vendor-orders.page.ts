import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiError } from '../../core/api';
import { Paged, PartStatus, VendorOrderPart } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { VendorService } from '../../core/services/vendor.service';
import { MoneyPipe, StatusLabelPipe } from '../../shared/pipes';
import { PaginationComponent, StateComponent, StatusBadgeComponent } from '../../shared/ui';

const ACTION_LABEL: Record<string, string> = {
  confirmed: '✔ Xác nhận',
  shipping: '🚚 Giao hàng',
  delivered: '📬 Đã giao',
  cancelled: '✕ Hủy',
};

/** Vendor chỉ thấy và xử lý PHẦN ĐƠN của mình (server lọc theo vendorId của session). */
@Component({
  selector: 'app-vendor-orders',
  imports: [DatePipe, MoneyPipe, StatusLabelPipe, PaginationComponent, StateComponent, StatusBadgeComponent],
  template: `
    <div class="page-head"><h1>Đơn hàng</h1></div>
    <div class="tabs">
      @for (t of tabs; track t) {
        <button type="button" class="tab" [class.active]="status() === t" (click)="setStatus(t)">{{ t ? (t | statusLabel) : 'Tất cả' }}</button>
      }
    </div>
    @if (state() !== 'ok') {
      <app-state [state]="state()" emptyText="Không có phần đơn nào" emptyIcon="📦" (retry)="load()" />
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
            <div class="small">👤 {{ o.buyer.name }} · {{ o.buyer.phone }} · {{ o.buyer.address }}</div>
            @if (o.note) { <div class="small muted">Ghi chú: {{ o.note }}</div> }
            <ul class="item-list">
              @for (i of o.items; track i.id) {
                <li>
                  {{ i.qty }} × {{ i.kind === 'box' ? '🎁 ' : '' }}{{ i.name }} <span class="muted">({{ i.unitPrice | money }}/{{ i.unit }})</span> — <b>{{ i.lineTotal | money }}</b>
                  @if (i.contents?.length) {
                    <div class="small muted">Đóng gói: @for (c of i.contents; track c.productId) { {{ c.qty }} × {{ c.name }}; }</div>
                  }
                </li>
              }
            </ul>
            <div class="row-between">
              <span>Tiền hàng phần này: <b>{{ o.subtotal | money }}</b> (COD)</span>
              <div class="row-gap">
                @for (s of o.nextStatuses; track s) {
                  <button type="button" class="btn btn-sm" [class.btn-primary]="s !== 'cancelled'" [class.btn-outline]="s === 'cancelled'" [disabled]="busy() === o.partId" (click)="setPartStatus(o, s)">{{ actionLabel[s] }}</button>
                }
                @if (o.status === 'delivered' && o.cod.status === 'unpaid') {
                  <button type="button" class="btn btn-sm btn-orange" [disabled]="busy() === o.partId" (click)="collect(o)">💵 Đã thu tiền COD</button>
                }
              </div>
            </div>
          </article>
        }
      </div>
      <app-pagination [page]="result()!.page" [totalPages]="result()!.totalPages" (pageChange)="page.set($event); load()" />
    }
  `,
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

  constructor() {
    this.load();
  }

  setStatus(s: string): void {
    this.status.set(s);
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.state.set('loading');
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
