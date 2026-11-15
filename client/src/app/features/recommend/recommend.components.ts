import { Component, effect, inject, input, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Recommendation } from '../../core/models';
import { CatalogService } from '../../core/services/catalog.service';
import { ProductCardComponent } from '../../shared/product-card.component';

/**
 * Widget gợi ý (CLO3). Hiển thị rõ nguồn: "model" (TF-IDF + cosine) hay "fallback" (phương pháp cơ sở)
 * để không trình bày kết quả luật đơn giản như kết quả máy học.
 */
@Component({
  selector: 'app-rec-list',
  imports: [ProductCardComponent],
  template: `
    @if (rec(); as r) {
      @if (r.items.length) {
        <section class="section">
          <div class="section-head">
            <h2>{{ title() }}</h2>
            <span class="rec-source" [class.fallback]="r.source === 'fallback'" [title]="sourceHint(r)">
              {{ r.source === 'model' ? 'Theo sở thích của bạn' : 'Bán chạy cùng danh mục' }}
            </span>
          </div>
          <div class="product-grid cols-5">
            @for (it of r.items; track it.product.id) {
              <div class="rec-item">
                <app-product-card [product]="it.product" [showRating]="false" />
                @if (it.reason) { <small class="rec-reason" [title]="it.score !== null ? 'Điểm tương đồng: ' + it.score : ''">{{ it.reason }}</small> }
              </div>
            }
          </div>
        </section>
      }
    }
  `,
  styles: [`.rec-item { display: flex; flex-direction: column; gap: 4px; } .rec-reason { color: var(--muted); font-size: 0.78rem; line-height: 1.3; }`],
})
export class RecListComponent {
  readonly title = input('Có thể bạn cũng thích');
  readonly rec = input<Recommendation | null>(null);
  sourceHint(r: Recommendation): string {
    if (r.source === 'model') return `Độ tương đồng nội dung (TF-IDF, cosine). Thời gian: ${r.latencyMs} ms`;
    return r.reason === 'cold-start' ? 'Bạn chưa có lịch sử xem nên hệ thống dùng sản phẩm bán chạy' : 'Dịch vụ mô hình không phản hồi kịp nên dùng phương pháp cơ sở';
  }
}

/** Sản phẩm tương tự (trang chi tiết sản phẩm). */
@Component({
  selector: 'app-similar-products',
  imports: [RecListComponent],
  template: `<app-rec-list [rec]="rec()" title="Sản phẩm tương tự" />`,
})
export class SimilarProductsComponent {
  readonly productId = input.required<string>();
  private catalog = inject(CatalogService);
  protected rec = signal<Recommendation | null>(null);
  constructor() {
    effect((onCleanup) => {
      const id = this.productId();
      this.rec.set(null);
      const sub = this.catalog.similar(id, 5).subscribe({ next: (r) => this.rec.set(r), error: () => this.rec.set(null) });
      onCleanup(() => sub.unsubscribe());
    });
  }
}

/** Gợi ý cá nhân hóa theo lịch sử xem (trang chủ khi đã đăng nhập). */
@Component({
  selector: 'app-for-you',
  imports: [RecListComponent],
  template: `<app-rec-list [rec]="rec()" [title]="title()" />`,
})
export class ForYouComponent {
  readonly title = input('Gợi ý cho bạn');
  private catalog = inject(CatalogService);
  protected rec = signal<Recommendation | null>(null);
  constructor() {
    const src: Observable<Recommendation> = this.catalog.forMe(5);
    src.subscribe({ next: (r) => this.rec.set(r), error: () => this.rec.set(null) });
  }
}
