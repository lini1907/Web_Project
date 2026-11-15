import { Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ApiError } from '../../core/api';
import { AdminOrderDetail, DELIVERY_WINDOW_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, PartStatus, SHIPMENT_STATUS_LABELS, StatusEvent } from '../../core/models';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';
import { MoneyPipe, StatusLabelPipe } from '../../shared/pipes';
import { StateComponent, StatusBadgeComponent } from '../../shared/ui';

/** Hộp thoại xác nhận hủy cả đơn (MatDialog). Trả về lý do hoặc undefined nếu bỏ qua. */
@Component({
  selector: 'app-cancel-order-dialog',
  imports: [FormsModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Hủy đơn {{ data.code }}?</h2>
    <mat-dialog-content>
      <p>Mọi phần đơn chưa hủy sẽ bị hủy và hàng được hoàn kho. Người mua và các nhà bán nhận thông báo ngay. Không thể hoàn tác.</p>
      <label class="cd-label" for="cancel-reason">Lý do hủy (bắt buộc, người mua sẽ thấy)</label>
      <textarea id="cancel-reason" class="input" rows="3" maxlength="300" [(ngModel)]="reason" [attr.aria-invalid]="touched && !valid()" aria-describedby="cancel-reason-hint" cdkFocusInitial></textarea>
      <small id="cancel-reason-hint" class="field-error" [class.cd-hidden]="!(touched && !valid())">Nhập lý do (ít nhất 5 ký tự)</small>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="btn btn-outline btn-sm" mat-dialog-close>Giữ đơn</button>
      <button type="button" class="btn btn-sm cd-danger" (click)="confirm()">Hủy đơn</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .cd-label { display: block; font-weight: 600; margin: 12px 0 6px; color: var(--text); }
      textarea.input { width: 100%; resize: vertical; font: inherit; }
      .cd-hidden { visibility: hidden; }
      .cd-danger { background: var(--red); color: #fff; }
      .cd-danger:hover { filter: brightness(0.92); }
    `,
  ],
})
export class CancelOrderDialog {
  protected data = inject<{ code: string }>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<CancelOrderDialog, string>);
  protected reason = '';
  protected touched = false;
  protected valid = () => this.reason.trim().length >= 5;
  confirm(): void {
    this.touched = true;
    if (this.valid()) this.ref.close(this.reason.trim());
  }
}

const ACTION_LABELS: Partial<Record<PartStatus, string>> = {
  confirmed: 'Xác nhận đơn',
  shipping: 'Chuyển sang đang giao',
  delivered: 'Xác nhận đã giao',
  cancelled: 'Hủy đơn',
};
const BY_LABELS: Record<StatusEvent['by'], string> = { buyer: 'Người mua', vendor: 'Nhà bán', system: 'Hệ thống', admin: 'Quản trị viên' };

@Component({
  selector: 'app-admin-order-detail',
  imports: [RouterLink, DatePipe, MoneyPipe, StatusLabelPipe, StateComponent, StatusBadgeComponent, MatDialogModule],
  template: `
    <a routerLink="/admin/orders" class="small back-link"><svg class="icon" aria-hidden="true"><use href="icons.svg#chevron-left" /></svg> Danh sách đơn hàng</a>
    @if (state() !== 'ok') {
      <app-state [state]="state()" [errorText]="error()" (retry)="load()" />
    } @else {
      @if (order(); as o) {
        <div class="page-head">
          <div>
            <h1>Đơn {{ o.code }} <app-status [value]="o.status" /></h1>
            <p class="muted small">Đặt lúc {{ o.createdAt | date: 'HH:mm dd/MM/yyyy' }} · {{ o.parts.length }} nhà bán · {{ o.itemCount }} sản phẩm
              @if (o.source === 'group-buy') { · <span class="tag tag-orange">Mua chung</span> }</p>
          </div>
        </div>

        <section class="card od-actions" aria-labelledby="od-actions-title">
          <h2 id="od-actions-title">Đổi trạng thái cả đơn</h2>
          @if (o.nextStatuses.length) {
            <p class="small muted">Áp dụng cho mọi phần đơn chưa hủy (hiện đang <b>{{ o.uniformStatus | statusLabel }}</b>).</p>
            <div class="row-gap wrap">
              @for (s of o.nextStatuses; track s) {
                <button type="button" class="btn btn-sm" [class.btn-primary]="s !== 'cancelled'" [class.btn-outline]="s === 'cancelled'" [class.text-danger]="s === 'cancelled'" [disabled]="busy()" (click)="change(o, s)">{{ actionLabel[s] }}</button>
              }
            </div>
          } @else {
            <p class="note">{{ o.lockedReason || 'Không có thao tác khả dụng.' }}</p>
          }
        </section>

        <div class="od-grid">
          <div>
            @for (part of o.parts; track part.id) {
              <section class="card od-part">
                <div class="row-between">
                  <b><svg class="icon" aria-hidden="true"><use href="icons.svg#farm" /></svg> {{ part.vendorName || 'Nhà bán' }}</b>
                  <app-status [value]="part.status" />
                </div>
                <div class="table-wrap">
                  <table class="table od-items">
                    <thead><tr><th>Sản phẩm</th><th>Danh mục</th><th class="num">Đơn giá</th><th class="num">SL</th><th class="num">Thành tiền</th></tr></thead>
                    <tbody>
                      @for (i of part.items; track i.id) {
                        <tr>
                          <td>{{ i.kind === 'box' ? 'Hộp: ' : '' }}{{ i.name }} @if (i.isRescue) { <span class="tag tag-green">Giải cứu</span> }
                            @if (i.contents?.length) { <br /><small class="muted">Gồm: @for (c of i.contents; track c.productId) { {{ c.qty }} × {{ c.name }}; }</small> }</td>
                          <td>{{ i.categoryName || '—' }}</td>
                          <td class="num">{{ i.unitPrice | money }}/{{ i.unit }}</td>
                          <td class="num">{{ i.qty }}</td>
                          <td class="num"><b>{{ i.lineTotal | money }}</b></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <div class="row-between small"><span>Tạm tính phần này · COD {{ part.cod.status === 'collected' ? 'đã thu' : 'chưa thu' }}</span><b>{{ part.subtotal | money }}</b></div>
                @if (part.shipment; as sh) {
                  <p class="small">Vận đơn <code>{{ sh.trackingCode }}</code> · {{ sh.carrierLabel }} · {{ shipLabel[sh.status] }}</p>
                }
                <h3>Lịch sử trạng thái</h3>
                <ol class="od-history">
                  @for (h of part.history; track $index) {
                    <li [class.od-admin]="h.by === 'admin'">
                      <span class="muted">{{ h.at | date: 'HH:mm dd/MM/yyyy' }}</span>
                      <b>{{ h.status | statusLabel }}</b> · {{ byLabel[h.by] || h.by }}@if (h.note) { — {{ h.note }} }
                    </li>
                  }
                </ol>
              </section>
            }
          </div>
          <aside>
            <section class="card">
              <h3>Người mua</h3>
              <p><b>{{ o.buyer.name }}</b><br />{{ o.buyer.email }}@if (o.buyer.phone) { <br />{{ o.buyer.phone }} }</p>
              <h3>Giao tới</h3>
              <p><b>{{ o.shippingAddress.name }}</b> · {{ o.shippingAddress.phone }}<br />{{ o.shippingAddress.address }}</p>
              @if (o.deliverySlot; as ds) { <p class="small">Nhận hàng: {{ ds.date | date: 'dd/MM/yyyy' }}, {{ windowLabel[ds.window] }}</p> }
              @if (o.note) { <p class="small muted">Ghi chú: {{ o.note }}</p> }
            </section>
            <section class="card">
              <h3>Thanh toán</h3>
              <p class="small">{{ methodLabel[o.paymentMethod] }} · <b>{{ payLabel[o.payment.status] }}</b>
                @if (o.payment.transactionId) { <br />Mã giao dịch: <code>{{ o.payment.transactionId }}</code> }</p>
              <div class="row-between small"><span>Tạm tính</span><span>{{ o.subtotal | money }}</span></div>
              <div class="row-between small"><span>Phí giao hàng</span><span>{{ o.shippingFee | money }}</span></div>
              @if (o.discount) { <div class="row-between small"><span>Giảm giá @if (o.voucher) { ({{ o.voucher.code }}) }</span><span>−{{ o.discount | money }}</span></div> }
              <div class="row-between od-total"><span>Tổng cộng</span><b>{{ o.total | money }}</b></div>
            </section>
          </aside>
        </div>
      }
    }
  `,
  styles: [
    `
      .back-link { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 12px; }
      .page-head h1 { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .od-actions h2 { margin: 0 0 6px; font-size: 1.05rem; }
      .od-grid h3 { font-size: 0.95rem; margin: 14px 0 8px; }
      .od-grid aside h3:first-child { margin-top: 0; }
      .od-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; align-items: start; }
      .od-part .table-wrap { margin: 12px 0; border: 1px solid var(--border); border-radius: 10px; }
      .od-items { min-width: 560px; }
      .od-items th, .od-items td { padding: 10px 12px; }
      .num { text-align: right; white-space: nowrap; }
      .od-history { list-style: none; margin: 0; padding: 0 0 0 14px; border-left: 2px solid var(--border); display: grid; gap: 8px; font-size: 0.88rem; }
      .od-history li { position: relative; }
      .od-history li::before { content: ''; position: absolute; left: -20px; top: 7px; width: 10px; height: 10px; border-radius: 50%; background: var(--border); }
      .od-history li.od-admin::before { background: var(--green); }
      .od-history .muted { margin-right: 6px; font-variant-numeric: tabular-nums; }
      .od-total { border-top: 1px solid var(--border); margin-top: 8px; padding-top: 8px; font-size: 1.05rem; }
      @media (max-width: 1100px) { .od-grid { grid-template-columns: minmax(0, 1fr); } }
    `,
  ],
})
export class AdminOrderDetailPage {
  readonly id = input.required<string>();
  private admin = inject(AdminService);
  private toast = inject(ToastService);
  private dialog = inject(MatDialog);

  protected readonly actionLabel = ACTION_LABELS;
  protected readonly byLabel = BY_LABELS;
  protected readonly shipLabel = SHIPMENT_STATUS_LABELS;
  protected readonly methodLabel = PAYMENT_METHOD_LABELS;
  protected readonly payLabel = PAYMENT_STATUS_LABELS;
  protected readonly windowLabel = DELIVERY_WINDOW_LABELS;
  protected order = signal<AdminOrderDetail | null>(null);
  protected state = signal<'loading' | 'error' | 'ok'>('loading');
  protected error = signal<string | null>(null);
  protected busy = signal(false);

  constructor() {
    effect(() => {
      this.id();
      this.load();
    });
  }

  load(): void {
    this.state.set('loading');
    this.admin.order(this.id()).subscribe({
      next: (o) => {
        this.order.set(o);
        this.state.set('ok');
      },
      error: (e) => {
        const err = ApiError.from(e);
        this.error.set(err.status === 404 ? 'Không tìm thấy đơn hàng.' : err.message);
        this.state.set('error');
      },
    });
  }

  change(o: AdminOrderDetail, status: PartStatus): void {
    if (status !== 'cancelled') {
      this.submit(o, status);
      return;
    }
    this.dialog
      .open<CancelOrderDialog, { code: string }, string>(CancelOrderDialog, { data: { code: o.code }, width: '480px', maxWidth: '92vw', autoFocus: 'dialog' })
      .afterClosed()
      .subscribe((reason) => {
        if (reason) this.submit(o, status, reason);
      });
  }

  private submit(o: AdminOrderDetail, status: PartStatus, reason?: string): void {
    this.busy.set(true);
    this.admin.setOrderStatus(o.id, status, reason).subscribe({
      next: (fresh) => {
        this.order.set(fresh);
        this.busy.set(false);
        this.toast.success(status === 'cancelled' ? `Đã hủy đơn ${o.code}, hàng đã được hoàn kho` : `Đơn ${o.code}: ${this.statusText(status)}`);
      },
      error: (e) => {
        this.busy.set(false);
        const err = ApiError.from(e);
        this.toast.error(`Không đổi được trạng thái: ${err.message}`);
        // Có thể đơn vừa bị nhà bán / người mua đổi => tải lại để thấy trạng thái mới nhất.
        if (err.status === 409) this.load();
      },
    });
  }

  private statusText(s: PartStatus): string {
    return { confirmed: 'đã xác nhận', shipping: 'đang giao', delivered: 'đã giao', cancelled: 'đã hủy', pending: 'chờ xác nhận' }[s];
  }
}
