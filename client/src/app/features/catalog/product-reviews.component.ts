import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { Review, ReviewPage } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ReviewService } from '../../core/services/review.service';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/ui';

/**
 * Đánh giá sản phẩm (CRUD phía người mua): xem danh sách, viết, sửa, xóa đánh giá của mình.
 * Chỉ người đã nhận hàng thành công mới được viết (server kiểm tra lại).
 */
@Component({
  selector: 'app-product-reviews',
  imports: [FormsModule, DatePipe, RouterLink, PaginationComponent],
  template: `
    <section class="section card reviews" aria-labelledby="reviews-title">
      <h2 id="reviews-title">Đánh giá từ người mua</h2>
      @if (page(); as pg) {
        @if (pg.total > 0) {
          <div class="review-summary">
            <div class="review-score"><b>{{ average() }}</b><span class="stars" aria-hidden="true">{{ stars(roundAvg()) }}</span><small class="muted">{{ pg.total }} đánh giá</small></div>
            <div class="review-bars">
              @for (n of [5, 4, 3, 2, 1]; track n) {
                <div class="review-bar"><span>{{ n }}★</span><div class="bar-track"><div class="bar-fill" [style.width.%]="percent(n)"></div></div><small>{{ dist(n) }}</small></div>
              }
            </div>
          </div>
        }
      }

      <!-- Form viết / sửa đánh giá -->
      @if (!auth.isLoggedIn()) {
        <p class="muted"><a routerLink="/login" [queryParams]="{ returnUrl: currentUrl() }">Đăng nhập</a> để viết đánh giá cho sản phẩm bạn đã mua.</p>
      } @else if (mine() && !editing()) {
        <div class="note note-success review-mine">
          <div><b>Đánh giá của bạn:</b> <span class="stars">{{ stars(mine()!.rating) }}</span>
            @if (mine()!.status === 'hidden') { <span class="tag">Đã bị ẩn bởi quản trị viên</span> }</div>
          <p>{{ mine()!.comment || '(không có nội dung)' }}</p>
          <div class="row-gap">
            <button type="button" class="btn btn-outline btn-xs" (click)="startEdit()">Sửa</button>
            <button type="button" class="btn btn-outline btn-xs text-danger" (click)="remove()">Xóa</button>
          </div>
        </div>
      } @else if (canReview() || editing()) {
        <form class="form review-form" (ngSubmit)="submit()" novalidate>
          <fieldset class="rating-input">
            <legend>{{ editing() ? 'Sửa đánh giá' : 'Viết đánh giá' }} — chọn số sao *</legend>
            @for (n of [1, 2, 3, 4, 5]; track n) {
              <button type="button" class="star-btn" [class.on]="n <= rating" (click)="rating = n" [attr.aria-pressed]="n === rating" [attr.aria-label]="n + ' sao'">★</button>
            }
            <span class="muted small">{{ ratingText[rating] || 'Chưa chọn' }}</span>
          </fieldset>
          <label>Nhận xét
            <textarea class="input" name="comment" [(ngModel)]="comment" rows="3" maxlength="1000" placeholder="Chất lượng, độ tươi, đóng gói, giao hàng..."></textarea>
          </label>
          @if (formError()) { <div class="field-error" role="alert">{{ formError() }}</div> }
          <div class="row-gap">
            <button type="submit" class="btn btn-primary btn-sm" [disabled]="saving()">{{ saving() ? 'Đang gửi...' : editing() ? 'Lưu thay đổi' : 'Gửi đánh giá' }}</button>
            @if (editing()) { <button type="button" class="btn btn-outline btn-sm" (click)="editing.set(false)">Hủy</button> }
          </div>
        </form>
      } @else if (auth.isBuyer()) {
        <p class="muted small">Bạn có thể đánh giá sau khi đơn hàng chứa sản phẩm này được giao thành công.</p>
      }

      <!-- Danh sách đánh giá -->
      @if (page(); as pg) {
        @for (r of pg.data; track r.id) {
          <article class="review-item">
            <div class="row-between"><b>{{ r.userName }}</b><small class="muted">{{ r.createdAt | date: 'dd/MM/yyyy' }}@if (r.updatedAt !== r.createdAt) { · đã sửa }</small></div>
            <span class="stars" [attr.aria-label]="r.rating + ' trên 5 sao'">{{ stars(r.rating) }}</span>
            @if (r.comment) { <p>{{ r.comment }}</p> }
          </article>
        } @empty {
          <p class="muted">Chưa có đánh giá nào cho sản phẩm này.</p>
        }
        <app-pagination [page]="pg.page" [totalPages]="pg.totalPages" (pageChange)="load($event)" />
      }
    </section>
  `,
  styles: [
    `
      .stars { color: #f59e0b; letter-spacing: 1px; }
      .review-summary { display: flex; gap: 24px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
      .review-score { display: flex; flex-direction: column; align-items: center; min-width: 110px; }
      .review-score b { font-size: 2.2rem; line-height: 1; }
      .review-bars { flex: 1; min-width: 220px; display: grid; gap: 4px; }
      .review-bar { display: grid; grid-template-columns: 32px 1fr 32px; gap: 8px; align-items: center; font-size: 0.85rem; }
      .bar-track { height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
      .bar-fill { height: 100%; background: #f59e0b; }
      .review-form { margin: 12px 0 20px; }
      .rating-input { border: none; padding: 0; margin: 0; display: flex; align-items: center; gap: 2px; flex-wrap: wrap; }
      .rating-input legend { font-weight: 600; margin-bottom: 4px; }
      .star-btn { background: none; border: none; font-size: 1.8rem; color: #d1d5db; cursor: pointer; padding: 0 2px; line-height: 1; }
      .star-btn.on { color: #f59e0b; }
      .review-mine { margin: 12px 0 20px; }
      .review-item { border-top: 1px solid var(--border); padding: 12px 0; }
      .review-item p { margin: 6px 0 0; }
    `,
  ],
})
export class ProductReviewsComponent {
  readonly productId = input.required<string>();
  /** Báo cho trang cha khi điểm trung bình thay đổi. */
  readonly changed = output<void>();
  protected auth = inject(AuthService);
  private api = inject(ReviewService);
  private toast = inject(ToastService);

  protected page = signal<ReviewPage | null>(null);
  protected mine = signal<Review | null>(null);
  protected canReview = signal(false);
  protected editing = signal(false);
  protected saving = signal(false);
  protected formError = signal<string | null>(null);
  protected rating = 0;
  protected comment = '';
  protected ratingText: Record<number, string> = { 1: 'Rất tệ', 2: 'Chưa tốt', 3: 'Bình thường', 4: 'Tốt', 5: 'Tuyệt vời' };

  protected average = computed(() => {
    const pg = this.page();
    if (!pg || !pg.total) return '0';
    const sum = ([1, 2, 3, 4, 5] as const).reduce((s, n) => s + n * (pg.distribution[n] || 0), 0);
    return (sum / pg.total).toFixed(1);
  });
  protected roundAvg = computed(() => Math.round(Number(this.average())));

  constructor() {
    effect(() => {
      const id = this.productId();
      this.load(1, id);
      this.loadMine(id);
    });
  }

  currentUrl(): string {
    return typeof location !== 'undefined' ? location.pathname : '/';
  }
  stars(n: number): string {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }
  dist(n: number): number {
    return this.page()?.distribution[n as 1 | 2 | 3 | 4 | 5] || 0;
  }
  percent(n: number): number {
    const total = this.page()?.total || 0;
    return total ? Math.round((this.dist(n) / total) * 100) : 0;
  }

  load(page = 1, id = this.productId()): void {
    this.api.list(id, page).subscribe({ next: (r) => this.page.set(r), error: () => this.page.set(null) });
  }

  private loadMine(id = this.productId()): void {
    if (!this.auth.isLoggedIn()) return;
    this.api.mine(id).subscribe({
      next: (r) => {
        this.mine.set(r.review);
        this.canReview.set(r.canReview);
      },
    });
  }

  startEdit(): void {
    const m = this.mine();
    if (!m) return;
    this.rating = m.rating;
    this.comment = m.comment;
    this.formError.set(null);
    this.editing.set(true);
  }

  submit(): void {
    if (this.rating < 1) {
      this.formError.set('Vui lòng chọn số sao');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    const body = { rating: this.rating, comment: this.comment.trim() };
    const m = this.mine();
    const req = this.editing() && m ? this.api.update(m.id, body) : this.api.create(this.productId(), body);
    req.subscribe({
      next: (r) => {
        this.saving.set(false);
        this.toast.success(this.editing() ? 'Đã cập nhật đánh giá' : 'Cảm ơn bạn đã đánh giá!');
        this.mine.set(r);
        this.canReview.set(false);
        this.editing.set(false);
        this.rating = 0;
        this.comment = '';
        this.load(1);
        this.changed.emit();
      },
      error: (e) => {
        this.saving.set(false);
        this.formError.set(ApiError.from(e).message);
      },
    });
  }

  remove(): void {
    const m = this.mine();
    if (!m || !confirm('Xóa đánh giá của bạn?')) return;
    this.api.remove(m.id).subscribe({
      next: () => {
        this.toast.success('Đã xóa đánh giá');
        this.mine.set(null);
        this.load(1);
        this.loadMine();
        this.changed.emit();
      },
      error: (e) => this.toast.error(ApiError.from(e).message),
    });
  }
}
