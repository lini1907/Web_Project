import { Component, computed, input } from '@angular/core';
import { MoneyPipe } from './pipes';

/** Biểu đồ cột đơn giản bằng CSS cho KPI theo ngày (không cần thư viện ngoài). */
@Component({
  selector: 'app-bar-chart',
  imports: [MoneyPipe],
  template: `
    @if (rows().length) {
      <div class="bar-chart" role="img" [attr.aria-label]="label()">
        @for (r of rows(); track r.date) {
          <div class="bar-col" [title]="r.date + ': ' + (r.value | money) + ' · ' + r.orders + ' phần đơn'">
            <div class="bar" [style.height.%]="r.pct"></div>
            <span class="bar-label">{{ r.date.slice(8, 10) }}/{{ r.date.slice(5, 7) }}</span>
          </div>
        }
      </div>
    } @else {
      <div class="muted small center">Chưa có đơn trong khoảng thời gian này</div>
    }
  `,
})
export class BarChartComponent {
  readonly data = input<{ date: string; orders: number; value: number }[]>([]);
  readonly label = input('Giá trị đơn theo ngày');
  readonly rows = computed(() => {
    const d = this.data();
    const max = Math.max(1, ...d.map((x) => x.value));
    return d.map((x) => ({ ...x, pct: Math.max(4, Math.round((x.value / max) * 100)) }));
  });
}
