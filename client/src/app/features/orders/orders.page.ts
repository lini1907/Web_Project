import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Order, Paged } from '../../core/models';
import { OrderService } from '../../core/services/order.service';
import { MoneyPipe } from '../../shared/pipes';
import { PaginationComponent, StateComponent, StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-orders',
  imports: [RouterLink, DatePipe, MoneyPipe, PaginationComponent, StateComponent, StatusBadgeComponent],
  template: `
    <div class="container page">
      <h1><svg class="icon" aria-hidden="true"><use href="icons.svg#box" /></svg> Đơn hàng của tôi</h1>
      <div class="tabs">
        @for (t of tabs; track t.key) {
          <a class="tab" [class.active]="status() === t.key" [routerLink]="[]" [queryParams]="{ status: t.key || null, page: null }">{{ t.label }}</a>
        }
      </div>
      @if (state() !== 'ok') {
        <app-state [state]="state()" emptyText="Chưa có đơn hàng nào" emptyIcon="📦" (retry)="load()">
          <a routerLink="/shop" class="btn btn-primary">Bắt đầu mua sắm</a>
        </app-state>
      } @else {
        <div class="order-list">
          @for (o of result()!.data; track o.id) {
            <a class="order-card" [routerLink]="['/orders', o.id]">
              <div class="row-between">
                <div><b>{{ o.code }}</b> · <span class="muted">{{ o.createdAt | date: 'HH:mm dd/MM/yyyy' }}</span> @if (o.source === 'group-buy') { <span class="tag tag-orange">Mua chung</span> }</div>
                <app-status [value]="o.status" />
              </div>
              <div class="order-thumbs">
                @for (p of o.parts; track p.id) {
                  @for (i of p.items; track i.id) {
                    <span class="small">{{ i.qty }} × {{ i.name }}</span>
                  }
                }
              </div>
              <div class="row-between">
                <span class="muted small">{{ o.parts.length }} nhà bán · COD</span>
                <b>{{ o.total | money }}</b>
              </div>
            </a>
          }
        </div>
        <app-pagination [page]="result()!.page" [totalPages]="result()!.totalPages" (pageChange)="goPage($event)" />
      }
    </div>
  `,
})
export class OrdersPage {
  private orders = inject(OrderService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  protected tabs = [
    { key: '', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ xác nhận' },
    { key: 'shipping', label: 'Đang giao' },
    { key: 'delivered', label: 'Đã giao' },
    { key: 'cancelled', label: 'Đã hủy' },
  ];
  protected status = signal('');
  protected page = signal(1);
  protected result = signal<Paged<Order> | null>(null);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((p) => {
      this.status.set(p.get('status') || '');
      this.page.set(Number(p.get('page')) || 1);
      this.load();
    });
  }

  load(): void {
    this.state.set('loading');
    this.orders.list(this.page(), this.status() || undefined).subscribe({
      next: (r) => {
        this.result.set(r);
        this.state.set(r.data.length ? 'ok' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }

  goPage(p: number): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { page: p }, queryParamsHandling: 'merge' });
  }
}
