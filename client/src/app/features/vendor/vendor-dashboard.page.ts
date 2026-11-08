import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Kpi } from '../../core/models';
import { VendorService } from '../../core/services/vendor.service';
import { MoneyPipe, StatusLabelPipe } from '../../shared/pipes';
import { StateComponent } from '../../shared/ui';
import { BarChartComponent } from '../../shared/bar-chart.component';

export function isoDay(d: Date): string {
  return new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}

@Component({
  selector: 'app-vendor-dashboard',
  imports: [FormsModule, RouterLink, MoneyPipe, StatusLabelPipe, StateComponent, BarChartComponent],
  template: `
    <div class="page-head">
      <h1>Tổng quan bán hàng</h1>
      <form class="row-gap" (ngSubmit)="load()">
        <label class="small">Từ <input class="input" type="date" name="from" [(ngModel)]="from" /></label>
        <label class="small">Đến <input class="input" type="date" name="to" [(ngModel)]="to" /></label>
        <button class="btn btn-outline btn-sm" type="submit">Xem</button>
      </form>
    </div>
    @if (state() !== 'ok') {
      <app-state [state]="state()" (retry)="load()" />
    } @else {
      @let k = kpi()!;
      <div class="kpi-grid">
        <div class="kpi"><span>Phần đơn (không tính hủy)</span><b>{{ k.orderCount }}</b><small>{{ k.pendingCount }} chờ xác nhận</small></div>
        <div class="kpi"><span>Giá trị đơn hoàn tất</span><b>{{ k.deliveredValue | money }}</b><small>{{ k.deliveredCount }} phần đơn đã giao</small></div>
        <div class="kpi kpi-green"><span>Doanh thu COD đã thu</span><b>{{ k.codCollected | money }}</b><small>đã xác nhận thu tiền</small></div>
        <div class="kpi"><span>Đang xử lý</span><b>{{ k.openValue | money }}</b><small>chờ/đã xác nhận/đang giao</small></div>
        <div class="kpi kpi-red"><span>Phần đơn bị hủy</span><b>{{ k.cancelledCount }}</b><small>loại khỏi giá trị</small></div>
        <div class="kpi"><span>Sản phẩm đang bán</span><b>{{ k.productCount }}</b><small>{{ k.openCampaigns }} chiến dịch mua chung mở</small></div>
      </div>
      <div class="grid-2">
        <section class="card">
          <h3>Giá trị phần đơn theo ngày</h3>
          <app-bar-chart [data]="k.daily" />
        </section>
        <section class="card">
          <h3>Theo trạng thái</h3>
          @for (s of statusKeys; track s) {
            <div class="row-between"><span>{{ s | statusLabel }}</span><b>{{ k.byStatus[s] || 0 }}</b></div>
          }
          <a routerLink="/vendor/orders" class="link">Xử lý đơn →</a>
        </section>
      </div>
      <div class="grid-2">
        <section class="card">
          <h3>⚠️ Sắp hết hàng (tồn khả dụng ≤ 5)</h3>
          @for (p of k.lowStock; track p.id) {
            <div class="row-between"><a [routerLink]="['/vendor/products', p.id]">{{ p.name }}</a><b [class.text-danger]="p.stockLeft <= 0">{{ p.stockLeft }} {{ p.unit }}</b></div>
          } @empty { <p class="muted">Không có sản phẩm sắp hết.</p> }
        </section>
        <section class="card">
          <h3>🏆 Sản phẩm bán tốt</h3>
          @for (p of k.topProducts; track p.name) {
            <div class="row-between"><span>{{ p.name }} <small class="muted">× {{ p.qty }}</small></span><b>{{ p.value | money }}</b></div>
          } @empty { <p class="muted">Chưa có dữ liệu.</p> }
        </section>
      </div>
      <p class="small muted">Định nghĩa: "Giá trị đơn hoàn tất" = tổng tiền hàng các phần đơn đã giao; "Doanh thu COD đã thu" = phần đơn bạn đã xác nhận thu tiền. Không tính phí ship và phần đơn đã hủy.</p>
    }
  `,
})
export class VendorDashboardPage {
  private vendor = inject(VendorService);
  protected kpi = signal<Kpi | null>(null);
  protected state = signal<'loading' | 'error' | 'ok'>('loading');
  protected statusKeys = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
  protected to = isoDay(new Date());
  protected from = isoDay(new Date(Date.now() - 29 * 86400000));

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.vendor.kpi(this.from, this.to).subscribe({
      next: (k) => {
        this.kpi.set(k);
        this.state.set('ok');
      },
      error: () => this.state.set('error'),
    });
  }
}
