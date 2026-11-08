import { Component, OnDestroy, OnInit, computed, input, model, output, signal } from '@angular/core';
import { StatusLabelPipe } from './pipes';

/** Trạng thái tải / rỗng / lỗi dùng chung cho mọi trang. */
@Component({
  selector: 'app-state',
  template: `
    @switch (state()) {
      @case ('loading') {
        <div class="state-box" role="status">
          <span class="spinner" aria-hidden="true"></span>
          <span>{{ loadingText() }}</span>
        </div>
      }
      @case ('error') {
        <div class="state-box state-error" role="alert">
          <div class="state-icon">⚠️</div>
          <div>{{ errorText() || 'Không tải được dữ liệu.' }}</div>
          <button class="btn btn-outline btn-sm" type="button" (click)="retry.emit()">Thử lại</button>
        </div>
      }
      @case ('empty') {
        <div class="state-box">
          <div class="state-icon">{{ emptyIcon() }}</div>
          <div>{{ emptyText() }}</div>
          <ng-content />
        </div>
      }
    }
  `,
})
export class StateComponent {
  readonly state = input<'loading' | 'error' | 'empty' | 'ok'>('loading');
  readonly loadingText = input('Đang tải...');
  readonly errorText = input<string | null>(null);
  readonly emptyText = input('Chưa có dữ liệu');
  readonly emptyIcon = input('🧺');
  readonly retry = output<void>();
}

/** Phân trang; phát ra số trang mới. */
@Component({
  selector: 'app-pagination',
  template: `
    @if (totalPages() > 1) {
      <nav class="pagination" aria-label="Phân trang">
        <button type="button" class="page-btn" [disabled]="page() <= 1" (click)="go(page() - 1)" aria-label="Trang trước">‹</button>
        @for (p of pages(); track $index) {
          @if (p === 0) {
            <span class="page-gap">…</span>
          } @else {
            <button type="button" class="page-btn" [class.active]="p === page()" (click)="go(p)" [attr.aria-current]="p === page() ? 'page' : null">{{ p }}</button>
          }
        }
        <button type="button" class="page-btn" [disabled]="page() >= totalPages()" (click)="go(page() + 1)" aria-label="Trang sau">›</button>
      </nav>
    }
  `,
})
export class PaginationComponent {
  readonly page = input(1);
  readonly totalPages = input(1);
  readonly pageChange = output<number>();
  readonly pages = computed(() => {
    const total = this.totalPages();
    const cur = this.page();
    const set = new Set([1, total, cur - 1, cur, cur + 1].filter((p) => p >= 1 && p <= total));
    const sorted = [...set].sort((a, b) => a - b);
    const out: number[] = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) out.push(0);
      out.push(p);
    });
    return out;
  });
  go(p: number): void {
    if (p >= 1 && p <= this.totalPages() && p !== this.page()) this.pageChange.emit(p);
  }
}

/** Nhãn trạng thái có màu. */
@Component({
  selector: 'app-status',
  imports: [StatusLabelPipe],
  template: `<span class="badge" [class]="'badge badge-' + value()">{{ value() | statusLabel }}</span>`,
})
export class StatusBadgeComponent {
  readonly value = input.required<string>();
}

/** Ô chọn số lượng (two-way binding qua model()). */
@Component({
  selector: 'app-qty',
  template: `
    <div class="qty" [class.qty-sm]="small()">
      <button type="button" (click)="set(value() - 1)" [disabled]="disabled() || value() <= min()" aria-label="Giảm">−</button>
      <input type="number" [value]="value()" [min]="min()" [max]="max()" (change)="onInput($event)" [disabled]="disabled()" aria-label="Số lượng" />
      <button type="button" (click)="set(value() + 1)" [disabled]="disabled() || value() >= max()" aria-label="Tăng">+</button>
    </div>
  `,
})
export class QtyComponent {
  readonly value = model(1);
  readonly min = input(1);
  readonly max = input(99);
  readonly small = input(false);
  readonly disabled = input(false);
  set(v: number): void {
    const n = Math.max(this.min(), Math.min(this.max(), Math.floor(v) || this.min()));
    this.value.set(n);
  }
  onInput(e: Event): void {
    this.set(Number((e.target as HTMLInputElement).value));
  }
}

/** Đồng hồ đếm ngược tới hạn chót (tính theo giờ server gửi kèm để không lệch giờ máy). */
@Component({
  selector: 'app-countdown',
  template: `
    @if (left() > 0) {
      <span class="countdown" [class.urgent]="left() < 3600000">
        @if (d() > 0) { <b>{{ d() }}</b> ngày }
        <b>{{ pad(h()) }}</b>:<b>{{ pad(m()) }}</b>:<b>{{ pad(s()) }}</b>
      </span>
    } @else {
      <span class="countdown ended">Đã hết hạn</span>
    }
  `,
})
export class CountdownComponent implements OnInit, OnDestroy {
  readonly deadline = input.required<string>();
  readonly serverTime = input<string | null>(null);
  private offset = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private now = signal(Date.now());
  readonly left = computed(() => Math.max(0, new Date(this.deadline()).getTime() - (this.now() + this.offset)));
  readonly d = computed(() => Math.floor(this.left() / 86400000));
  readonly h = computed(() => Math.floor((this.left() % 86400000) / 3600000));
  readonly m = computed(() => Math.floor((this.left() % 3600000) / 60000));
  readonly s = computed(() => Math.floor((this.left() % 60000) / 1000));
  ngOnInit(): void {
    const st = this.serverTime();
    if (st) this.offset = new Date(st).getTime() - Date.now();
    this.timer = setInterval(() => this.now.set(Date.now()), 1000);
  }
  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
  pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}
