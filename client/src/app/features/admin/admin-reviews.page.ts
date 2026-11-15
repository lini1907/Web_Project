import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { AdminReview, Paged } from '../../core/models';
import { ReviewService } from '../../core/services/review.service';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent, StateComponent } from '../../shared/ui';

/** Kiểm duyệt đánh giá: xem, ẩn/hiện, xóa đánh giá vi phạm. */
@Component({
  selector: 'app-admin-reviews',
  imports: [FormsModule, DatePipe, RouterLink, PaginationComponent, StateComponent],
  template: `
    <div class="page-head">
      <h1>Đánh giá sản phẩm</h1>
      <a class="btn btn-outline btn-sm" href="/api/v1/admin/export/reviews.csv" download>Xuất CSV</a>
    </div>
    <form class="toolbar" (ngSubmit)="page.set(1); load()">
      <input class="input" name="q" type="search" placeholder="Nội dung, người viết, sản phẩm" [(ngModel)]="q" aria-label="Tìm đánh giá" />
      <select class="input" name="rating" [(ngModel)]="rating" (ngModelChange)="page.set(1); load()" aria-label="Số sao">
        <option value="">Mọi số sao</option>
        @for (n of [5, 4, 3, 2, 1]; track n) { <option [value]="n">{{ n }} sao</option> }
      </select>
      <select class="input" name="status" [(ngModel)]="status" (ngModelChange)="page.set(1); load()" aria-label="Trạng thái">
        <option value="">Mọi trạng thái</option><option value="visible">Đang hiện</option><option value="hidden">Đã ẩn</option>
      </select>
      <button class="btn btn-outline btn-sm" type="submit">Tìm</button>
    </form>
    @if (state() !== 'ok') {
      <app-state [state]="state()" emptyIcon="star" emptyText="Chưa có đánh giá phù hợp" (retry)="load()" />
    } @else {
      <div class="table-wrap card">
        <table class="table">
          <thead><tr><th>Sản phẩm</th><th>Người viết</th><th>Đánh giá</th><th>Ngày</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            @for (r of result()!.data; track r.id) {
              <tr>
                <td>@if (r.product.slug) { <a [routerLink]="['/products', r.product.slug]">{{ r.product.name }}</a> } @else { {{ r.product.name }} }</td>
                <td>{{ r.userName }}</td>
                <td><span class="stars" [attr.aria-label]="r.rating + ' sao'">{{ stars(r.rating) }}</span><br /><small>{{ r.comment || '(không có nội dung)' }}</small></td>
                <td class="small">{{ r.createdAt | date: 'dd/MM/yyyy' }}</td>
                <td>@if (r.status === 'hidden') { <span class="tag">Đã ẩn</span> } @else { <span class="tag tag-green">Đang hiện</span> }</td>
                <td class="row-gap">
                  <button type="button" class="btn btn-outline btn-xs" (click)="toggle(r)">{{ r.status === 'hidden' ? 'Hiện' : 'Ẩn' }}</button>
                  <button type="button" class="btn btn-outline btn-xs text-danger" (click)="remove(r)">Xóa</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination [page]="result()!.page" [totalPages]="result()!.totalPages" (pageChange)="page.set($event); load()" />
      <p class="small muted">Đánh giá bị ẩn không hiện ở trang sản phẩm và không tính vào điểm trung bình.</p>
    }
  `,
  styles: [`.stars { color: #f59e0b; letter-spacing: 1px; }`],
})
export class AdminReviewsPage {
  private api = inject(ReviewService);
  private toast = inject(ToastService);
  protected q = '';
  protected rating = '';
  protected status = '';
  protected page = signal(1);
  protected result = signal<Paged<AdminReview> | null>(null);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');

  constructor() {
    this.load();
  }

  stars(n: number): string {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  load(): void {
    this.state.set('loading');
    this.api.adminList({ q: this.q || undefined, rating: this.rating || undefined, status: this.status || undefined, page: this.page() }).subscribe({
      next: (r) => {
        this.result.set(r);
        this.state.set(r.data.length ? 'ok' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }

  toggle(r: AdminReview): void {
    const status = r.status === 'hidden' ? 'visible' : 'hidden';
    const reason = status === 'hidden' ? prompt('Lý do ẩn đánh giá:')?.trim() : undefined;
    if (status === 'hidden' && reason === undefined) return;
    this.api.setStatus(r.id, status, reason || undefined).subscribe({
      next: () => {
        this.toast.success(status === 'hidden' ? 'Đã ẩn đánh giá' : 'Đã hiện lại đánh giá');
        this.load();
      },
      error: (e) => this.toast.error(ApiError.from(e).message),
    });
  }

  remove(r: AdminReview): void {
    if (!confirm(`Xóa vĩnh viễn đánh giá của ${r.userName}?`)) return;
    this.api.remove(r.id).subscribe({
      next: () => {
        this.toast.success('Đã xóa đánh giá');
        this.load();
      },
      error: (e) => this.toast.error(ApiError.from(e).message),
    });
  }
}
