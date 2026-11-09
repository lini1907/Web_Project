import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Health, Kpi } from '../../core/models';
import { AdminService } from '../../core/services/admin.service';
import { MoneyPipe } from '../../shared/pipes';
import { StateComponent } from '../../shared/ui';
import { BarChartComponent } from '../../shared/bar-chart.component';
import { isoDay } from '../vendor/vendor-dashboard.page';

@Component({
  selector: 'app-admin-dashboard',
  imports: [FormsModule, RouterLink, MoneyPipe, StateComponent, BarChartComponent],
  template: `
    <div class="page-head">
      <h1>KPI toàn sàn</h1>
      <form class="row-gap" (ngSubmit)="load()">
        <label class="small">Từ <input class="input" type="date" name="from" [(ngModel)]="from" /></label>
        <label class="small">Đến <input class="input" type="date" name="to" [(ngModel)]="to" /></label>
        <button class="btn btn-outline btn-sm" type="submit">Xem</button>
      </form>
    </div>
    @if (health(); as h) {
      <div class="health-row">
        <span class="health" [class.ok]="h.api === 'ok'">API: {{ h.api }}</span>
        <span class="health" [class.ok]="h.db === 'ok'">MongoDB: {{ h.db }}</span>
        <span class="health" [class.ok]="h.ml === 'ok'">Dịch vụ gợi ý: {{ h.ml }} {{ h.modelVersion || '' }}</span>
      </div>
    }
    @if (state() !== 'ok') {
      <app-state [state]="state()" (retry)="load()" />
    } @else {
      @let k = kpi()!;
      <div class="kpi-grid">
        <div class="kpi"><span>Đơn đặt trong kỳ</span><b>{{ k.checkoutOrders }}</b><small>{{ k.orderCount }} phần đơn hợp lệ</small></div>
        <div class="kpi"><span>Giá trị đơn hoàn tất</span><b>{{ k.deliveredValue | money }}</b><small>{{ k.deliveredCount }} phần đã giao</small></div>
        <div class="kpi kpi-green"><span>COD đã thu</span><b>{{ k.codCollected | money }}</b></div>
        <div class="kpi kpi-red"><span>Phần đơn hủy</span><b>{{ k.cancelledCount }}</b></div>
        <div class="kpi"><span>Người dùng</span><b>{{ (k.users?.['buyer'] || 0) + (k.users?.['vendor'] || 0) }}</b><small>{{ k.users?.['buyer'] || 0 }} người mua · {{ k.users?.['vendor'] || 0 }} nhà bán</small></div>
        <div class="kpi kpi-orange"><span>Nhà bán chờ duyệt</span><b>{{ k.pendingVendors }}</b><a routerLink="/admin/vendors" [queryParams]="{ status: 'pending' }" class="small">Duyệt ngay →</a></div>
      </div>
      <section class="card">
        <h3>Giá trị phần đơn theo ngày</h3>
        <app-bar-chart [data]="k.daily" />
      </section>
      <section class="card table-wrap" tabindex="0" aria-label="KPI theo nhà bán, cuộn ngang để xem đầy đủ">
        <h3>Theo nhà bán</h3>
        <table class="table">
          <thead><tr><th>Nhà bán</th><th>Phần đơn</th><th>Giá trị hoàn tất</th><th>COD đã thu</th><th>Hủy</th></tr></thead>
          <tbody>
            @for (v of k.byVendor; track v.vendorId) {
              <tr><td>{{ v.vendorName }}</td><td>{{ v.orderCount }}</td><td>{{ v.deliveredValue | money }}</td><td>{{ v.codCollected | money }}</td><td>{{ v.cancelledCount }}</td></tr>
            } @empty { <tr><td colspan="5" class="muted">Chưa có đơn trong kỳ</td></tr> }
          </tbody>
        </table>
      </section>
      <section class="card">
        <h3>Xuất dữ liệu (CSV, mở bằng Excel)</h3>
        <div class="row-gap wrap">
          <a class="btn btn-outline btn-sm" [href]="'/api/v1/admin/export/orders.csv?from=' + from + '&to=' + to" download>Đơn hàng trong kỳ</a>
          <a class="btn btn-outline btn-sm" href="/api/v1/admin/export/products.csv" download>Sản phẩm</a>
          <a class="btn btn-outline btn-sm" href="/api/v1/admin/export/users.csv" download>Người dùng</a>
          <a class="btn btn-outline btn-sm" href="/api/v1/admin/export/vouchers.csv" download>Mã giảm giá</a>
          <a class="btn btn-outline btn-sm" href="/api/v1/admin/export/reviews.csv" download>Đánh giá</a>
        </div>
      </section>
    }
  `,
})
export class AdminDashboardPage {
  private admin = inject(AdminService);
  protected kpi = signal<Kpi | null>(null);
  protected health = signal<Health | null>(null);
  protected state = signal<'loading' | 'error' | 'ok'>('loading');
  protected to = isoDay(new Date());
  protected from = isoDay(new Date(Date.now() - 29 * 86400000));

  constructor() {
    this.load();
    this.admin.health().subscribe({ next: (h) => this.health.set(h) });
  }
  load(): void {
    this.state.set('loading');
    this.admin.kpi(this.from, this.to).subscribe({
      next: (k) => {
        this.kpi.set(k);
        this.state.set('ok');
      },
      error: () => this.state.set('error'),
    });
  }
}
