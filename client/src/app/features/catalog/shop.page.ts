import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CATEGORY_ICONS, CATEGORY_LABELS, Category, Farm, Paged, Product } from '../../core/models';
import { CatalogService, ProductQuery } from '../../core/services/catalog.service';
import { ProductCardComponent } from '../../shared/product-card.component';
import { PaginationComponent, StateComponent } from '../../shared/ui';
import { ApiError } from '../../core/api';
import { CategoryLabelPipe } from '../../shared/pipes';

/**
 * Trang cửa hàng: tìm kiếm, lọc, sắp xếp, phân trang. Toàn bộ trạng thái lọc nằm trong query string
 * (/shop?category=trai-cay&sort=price_asc&page=2) nên refresh/chia sẻ link không mất bộ lọc.
 */
@Component({
  selector: 'app-shop',
  imports: [FormsModule, RouterLink, CategoryLabelPipe, ProductCardComponent, PaginationComponent, StateComponent],
  template: `
    <div class="container page">
      <nav class="breadcrumb"><a routerLink="/">Trang chủ</a> › <span>Cửa hàng</span>@if (f.category) { › <span>{{ f.category | categoryLabel }}</span> }</nav>
      <div class="shop-layout">
        <aside class="filters" [class.open]="filtersOpen()">
          <div class="filter-group">
            <h3>Danh mục</h3>
            <button type="button" class="filter-btn" [class.active]="!f.category" (click)="apply({ category: null })">Tất cả</button>
            @for (c of categoryList; track c) {
              <button type="button" class="filter-btn" [class.active]="f.category === c" (click)="apply({ category: c })">{{ icons[c] }} {{ labels[c] }}</button>
            }
          </div>
          <div class="filter-group">
            <h3>Loại hàng</h3>
            <label class="radio"><input type="radio" name="type" [checked]="!f.type" (change)="apply({ type: null })" /> Tất cả</label>
            <label class="radio"><input type="radio" name="type" [checked]="f.type === 'regular'" (change)="apply({ type: 'regular' })" /> Hàng tiêu chuẩn</label>
            <label class="radio"><input type="radio" name="type" [checked]="f.type === 'rescue'" (change)="apply({ type: 'rescue' })" /> ♻️ Hàng giải cứu</label>
          </div>
          <div class="filter-group">
            <h3>Nông trại</h3>
            <select class="input" [ngModel]="f.farm || ''" (ngModelChange)="apply({ farm: $event || null })" aria-label="Lọc theo nông trại">
              <option value="">Tất cả nông trại</option>
              @for (farm of farms(); track farm.id) {
                <option [value]="farm.slug">{{ farm.name }} ({{ farm.productCount }})</option>
              }
            </select>
          </div>
          <div class="filter-group">
            <h3>Khoảng giá (đ)</h3>
            <div class="price-range">
              <input class="input" type="number" min="0" step="1000" placeholder="Từ" [(ngModel)]="minPrice" aria-label="Giá từ" />
              <input class="input" type="number" min="0" step="1000" placeholder="Đến" [(ngModel)]="maxPrice" aria-label="Giá đến" />
            </div>
            <button type="button" class="btn btn-outline btn-sm" (click)="apply({ minPrice: minPrice || null, maxPrice: maxPrice || null })">Áp dụng</button>
          </div>
          <label class="checkbox"><input type="checkbox" [checked]="f.inStock" (change)="apply({ inStock: $any($event.target).checked ? 'true' : null })" /> Chỉ hiện hàng còn</label>
          <button type="button" class="btn btn-link" (click)="reset()">Xóa bộ lọc</button>
        </aside>

        <section class="shop-main">
          <div class="shop-toolbar">
            <button type="button" class="btn btn-outline btn-sm show-sm" (click)="filtersOpen.set(!filtersOpen())">⚙ Bộ lọc</button>
            <div class="muted">
              @if (f.q) { Kết quả cho "<b>{{ f.q }}</b>": }
              {{ result()?.total ?? 0 }} sản phẩm
            </div>
            <label class="sort">
              Sắp xếp
              <select class="input" [ngModel]="f.sort || 'newest'" (ngModelChange)="apply({ sort: $event })">
                <option value="newest">Mới nhất</option>
                <option value="popular">Bán chạy</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
              </select>
            </label>
          </div>

          @if (state() !== 'ok') {
            <app-state [state]="state()" [errorText]="error()" emptyText="Không có sản phẩm phù hợp bộ lọc" emptyIcon="🔍" (retry)="reload()">
              <button type="button" class="btn btn-outline btn-sm" (click)="reset()">Xóa bộ lọc</button>
            </app-state>
          } @else {
            <div class="product-grid cols-4">
              @for (p of result()!.data; track p.id) {
                <app-product-card [product]="p" />
              }
            </div>
            <app-pagination [page]="result()!.page" [totalPages]="result()!.totalPages" (pageChange)="apply({ page: $event }, false)" />
          }
        </section>
      </div>
    </div>
  `,
})
export class ShopPage {
  private catalog = inject(CatalogService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected labels = CATEGORY_LABELS;
  protected icons = CATEGORY_ICONS;
  protected categoryList = Object.keys(CATEGORY_LABELS) as Category[];

  protected f: ProductQuery = {};
  protected minPrice: number | null = null;
  protected maxPrice: number | null = null;
  protected farms = signal<Farm[]>([]);
  protected result = signal<Paged<Product> | null>(null);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');
  protected error = signal<string | null>(null);
  protected filtersOpen = signal(false);

  constructor() {
    this.catalog.farms().subscribe({ next: (f) => this.farms.set(f.filter((x) => (x.productCount ?? 0) > 0)) });
    // Mỗi lần query string đổi (kể cả nút back/forward) => tải lại danh sách.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((p) => this.load(p));
  }

  private load(p: ParamMap): void {
    const num = (k: string) => (p.get(k) ? Number(p.get(k)) : undefined);
    this.f = {
      q: p.get('q') || undefined,
      category: p.get('category') || undefined,
      farm: p.get('farm') || undefined,
      type: p.get('type') || undefined,
      sort: p.get('sort') || undefined,
      page: num('page') || 1,
      minPrice: num('minPrice'),
      maxPrice: num('maxPrice'),
      inStock: p.get('inStock') === 'true',
      limit: 12,
    };
    this.minPrice = this.f.minPrice ?? null;
    this.maxPrice = this.f.maxPrice ?? null;
    this.state.set('loading');
    this.catalog.products(this.f).subscribe({
      next: (r) => {
        this.result.set(r);
        this.state.set(r.data.length ? 'ok' : 'empty');
      },
      error: (e) => {
        this.error.set(ApiError.from(e).message);
        this.state.set('error');
      },
    });
  }

  reload(): void {
    this.load(this.route.snapshot.queryParamMap);
  }

  /** Đổi bộ lọc => cập nhật URL (merge với query hiện tại); đổi lọc thì về trang 1. */
  apply(change: Record<string, string | number | null>, resetPage = true): void {
    this.filtersOpen.set(false);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: resetPage ? { ...change, page: null } : change,
      queryParamsHandling: 'merge',
    });
  }

  reset(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
}
