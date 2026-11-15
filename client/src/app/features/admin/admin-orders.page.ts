import { Component, Injectable, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort, SortDirection } from '@angular/material/sort';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AdminOrderCounts, AdminOrderRow } from '../../core/models';
import { AdminService } from '../../core/services/admin.service';
import { ApiError } from '../../core/api';
import { ToastService } from '../../core/services/toast.service';
import { MoneyPipe } from '../../shared/pipes';
import { StateComponent, StatusBadgeComponent } from '../../shared/ui';

/** Nhãn tiếng Việt cho MatPaginator. */
@Injectable()
export class ViPaginatorIntl extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Số đơn mỗi trang';
  override nextPageLabel = 'Trang sau';
  override previousPageLabel = 'Trang trước';
  override firstPageLabel = 'Trang đầu';
  override lastPageLabel = 'Trang cuối';
  override getRangeLabel = (page: number, size: number, length: number): string => {
    if (length === 0) return '0 đơn';
    const start = page * size + 1;
    return `${start}–${Math.min(length, start + size - 1)} trong ${length} đơn`;
  };
}

const TABS: { key: string; label: string; count: keyof AdminOrderCounts }[] = [
  { key: '', label: 'Tất cả', count: 'all' },
  { key: 'pending', label: 'Chờ xác nhận', count: 'pending' },
  { key: 'processing', label: 'Đang xử lý', count: 'processing' },
  { key: 'confirmed', label: 'Đã xác nhận', count: 'confirmed' },
  { key: 'shipping', label: 'Đang giao', count: 'shipping' },
  { key: 'delivered', label: 'Đã giao', count: 'delivered' },
  { key: 'cancelled', label: 'Đã hủy', count: 'cancelled' },
];
const SORTABLE = ['createdAt', 'total', 'code'];

/**
 * Quản lý đơn hàng toàn sàn. Mọi bộ lọc (trạng thái, từ khóa, trang, sắp xếp) nằm trên query params
 * nên có thể tải lại / chia sẻ link mà vẫn giữ nguyên màn hình. Bảng dùng Angular Material (MatTable + MatSort + MatPaginator),
 * sắp xếp và phân trang làm ở server.
 */
@Component({
  selector: 'app-admin-orders',
  imports: [FormsModule, RouterLink, DatePipe, MoneyPipe, StateComponent, StatusBadgeComponent, MatTableModule, MatSortModule, MatPaginatorModule],
  providers: [{ provide: MatPaginatorIntl, useClass: ViPaginatorIntl }],
  template: `
    <div class="page-head">
      <div>
        <h1>Quản lý đơn hàng</h1>
        <p class="muted small">Toàn bộ đơn trên sàn. Trạng thái đơn được tổng hợp từ các phần đơn của từng nhà bán.</p>
      </div>
      <a class="btn btn-outline btn-sm" href="/api/v1/admin/export/orders.csv" download>Xuất CSV</a>
    </div>

    <nav class="tabs" aria-label="Lọc theo trạng thái">
      @for (t of tabs; track t.key) {
        <a class="tab" [class.active]="status() === t.key" [routerLink]="[]" [queryParams]="{ status: t.key || null, page: null }" queryParamsHandling="merge" [attr.aria-current]="status() === t.key ? 'page' : null">
          {{ t.label }} @if (counts(); as c) { <span class="tab-count">{{ c[t.count] }}</span> }
        </a>
      }
    </nav>

    <form class="toolbar" role="search" (ngSubmit)="search()">
      <input class="input" name="q" type="search" placeholder="Mã đơn, tên, email hoặc SĐT người mua" [(ngModel)]="qInput" aria-label="Tìm đơn hàng" />
      <button class="btn btn-outline btn-sm" type="submit">Tìm</button>
      @if (q()) { <button class="btn btn-link btn-sm" type="button" (click)="qInput = ''; search()">Xóa tìm kiếm</button> }
    </form>

    @if (state() === 'error' || (state() === 'loading' && !rows().length)) {
      <app-state [state]="state()" [errorText]="error()" (retry)="load()" />
    } @else {
      <div class="card table-wrap ao-wrap" [class.ao-busy]="state() === 'loading'" [attr.aria-busy]="state() === 'loading'">
        <table mat-table [dataSource]="rows()" matSort [matSortActive]="sort()" [matSortDirection]="dir()" matSortDisableClear (matSortChange)="sortChange($event)" class="ao-table">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Mã đơn</th>
            <td mat-cell *matCellDef="let o">
              <a class="ao-code" [routerLink]="['/admin/orders', o.id]">{{ o.code }}</a>
              @if (o.source === 'group-buy') { <span class="tag tag-orange">Mua chung</span> }
            </td>
          </ng-container>
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Ngày đặt</th>
            <td mat-cell *matCellDef="let o">{{ o.createdAt | date: 'HH:mm dd/MM/yyyy' }}</td>
          </ng-container>
          <ng-container matColumnDef="buyer">
            <th mat-header-cell *matHeaderCellDef>Người mua</th>
            <td mat-cell *matCellDef="let o"><b>{{ o.buyer.name }}</b><br /><small class="muted">{{ o.buyer.email }}@if (o.buyer.phone) { · {{ o.buyer.phone }} }</small></td>
          </ng-container>
          <ng-container matColumnDef="vendors">
            <th mat-header-cell *matHeaderCellDef>Nhà bán</th>
            <td mat-cell *matCellDef="let o"><span class="ao-vendors">{{ o.vendors.join(', ') }}</span><br /><small class="muted">{{ o.itemCount }} sản phẩm</small></td>
          </ng-container>
          <ng-container matColumnDef="total">
            <th mat-header-cell *matHeaderCellDef mat-sort-header arrowPosition="before" class="ao-num">Tổng tiền</th>
            <td mat-cell *matCellDef="let o" class="ao-num"><b>{{ o.total | money }}</b><br /><small class="muted">{{ o.paymentMethod === 'cod' ? 'COD' : o.paymentMethod.toUpperCase() }}</small></td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
            <td mat-cell *matCellDef="let o"><app-status [value]="o.status" /></td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let o; columns: columns" class="ao-row" (click)="open(o, $event)"></tr>
          <tr class="mat-mdc-row" *matNoDataRow>
            <td class="mat-mdc-cell ao-empty" [attr.colspan]="columns.length">Không có đơn hàng phù hợp</td>
          </tr>
        </table>
      </div>
      <mat-paginator [length]="total()" [pageIndex]="page() - 1" [pageSize]="limit()" [pageSizeOptions]="[10, 20, 50]" (page)="pageChange($event)" aria-label="Phân trang đơn hàng" />
    }
  `,
  styles: [
    `
      .tab-count { display: inline-block; min-width: 22px; margin-left: 4px; padding: 0 6px; border-radius: 999px; background: var(--green-light); color: var(--muted); font-size: 0.75rem; text-align: center; font-variant-numeric: tabular-nums; }
      .tab.active .tab-count { background: var(--green-badge); color: var(--green-dark); }
      .ao-wrap { transition: opacity 0.15s; }
      .ao-busy { opacity: 0.6; pointer-events: none; }
      .ao-table { width: 100%; min-width: 860px; }
      .ao-table .mat-mdc-header-cell { background: var(--green-light); color: var(--muted); font-weight: 700; font-size: 0.75rem; }
      .ao-table .mat-mdc-cell { padding-top: 12px; padding-bottom: 12px; font-size: 0.88rem; font-variant-numeric: tabular-nums; }
      .ao-row { cursor: pointer; }
      .ao-row:hover { background: #f8f9f4; }
      .ao-code { font-weight: 700; color: var(--green-600); margin-right: 6px; }
      .ao-vendors { display: inline-block; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }
      .ao-num { text-align: right; }
      .ao-empty { text-align: center; padding: 32px; color: var(--muted); }
      mat-paginator { background: transparent; margin-top: 8px; }
    `,
  ],
})
export class AdminOrdersPage {
  private admin = inject(AdminService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  protected readonly tabs = TABS;
  protected readonly columns = ['code', 'createdAt', 'buyer', 'vendors', 'total', 'status'];
  protected status = signal('');
  protected q = signal('');
  protected qInput = '';
  protected page = signal(1);
  protected limit = signal(10);
  protected sort = signal('createdAt');
  protected dir = signal<SortDirection>('desc');
  protected rows = signal<AdminOrderRow[]>([]);
  protected total = signal(0);
  protected counts = signal<AdminOrderCounts | null>(null);
  protected state = signal<'loading' | 'error' | 'ok'>('loading');
  protected error = signal<string | null>(null);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((p) => {
      this.status.set(p.get('status') || '');
      this.q.set(p.get('q') || '');
      this.qInput = this.q();
      this.page.set(Math.max(1, Number(p.get('page')) || 1));
      this.limit.set([10, 20, 50].includes(Number(p.get('limit'))) ? Number(p.get('limit')) : 10);
      this.sort.set(SORTABLE.includes(p.get('sort') || '') ? p.get('sort')! : 'createdAt');
      this.dir.set(p.get('dir') === 'asc' ? 'asc' : 'desc');
      this.load();
    });
  }

  load(): void {
    this.state.set('loading');
    this.admin
      .orders({ status: this.status() || undefined, q: this.q() || undefined, page: this.page(), limit: this.limit(), sort: this.sort(), dir: this.dir() || 'desc' })
      .subscribe({
        next: (r) => {
          this.rows.set(r.data);
          this.total.set(r.total);
          this.counts.set(r.counts);
          this.state.set('ok');
        },
        error: (e) => {
          const err = ApiError.from(e);
          this.error.set(err.message);
          this.state.set('error');
          this.toast.error(`Không tải được danh sách đơn: ${err.message}`);
        },
      });
  }

  private go(params: Params): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge' });
  }

  search(): void {
    this.go({ q: this.qInput.trim() || null, page: null });
  }

  sortChange(s: Sort): void {
    const isDefault = s.active === 'createdAt' && s.direction === 'desc';
    this.go({ sort: isDefault ? null : s.active, dir: isDefault ? null : s.direction || 'desc', page: null });
  }

  pageChange(e: PageEvent): void {
    this.go({ page: e.pageIndex > 0 ? e.pageIndex + 1 : null, limit: e.pageSize !== 10 ? e.pageSize : null });
  }

  /** Bấm cả dòng để mở chi tiết (trừ khi bấm vào link bên trong). */
  open(o: AdminOrderRow, ev: MouseEvent): void {
    if ((ev.target as HTMLElement).closest('a')) return;
    void this.router.navigate(['/admin/orders', o.id]);
  }
}
