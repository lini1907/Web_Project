import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { Product } from '../../core/models';
import { ApiError } from '../../core/api';
import { CatalogService } from '../../core/services/catalog.service';
import { ShopActions } from '../../core/services/shop-actions.service';
import { CategoryLabelPipe, MoneyPipe, TimeLeftPipe } from '../../shared/pipes';
import { QtyComponent, StateComponent } from '../../shared/ui';
import { ImgFallbackDirective } from '../../shared/img-fallback.directive';
import { SimilarProductsComponent } from '../recommend/recommend.components';

/** Chi tiết sản phẩm theo slug (route /products/:slug — slug thân thiện SEO). */
@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, DatePipe, MoneyPipe, TimeLeftPipe, CategoryLabelPipe, QtyComponent, StateComponent, ImgFallbackDirective, SimilarProductsComponent],
  template: `
    <div class="container page">
      @if (state() !== 'ok') {
        <app-state [state]="state()" [errorText]="error()" (retry)="load(slug())" />
      } @else {
        @let p = product()!;
        <nav class="breadcrumb">
          <a routerLink="/">Trang chủ</a> › <a [routerLink]="['/shop']" [queryParams]="{ category: p.category }">{{ p.category | categoryLabel }}</a> › <span>{{ p.name }}</span>
        </nav>
        <div class="detail">
          <div class="gallery" (keydown.arrowleft)="step(-1)" (keydown.arrowright)="step(1)">
            <div class="gallery-main">
              <img [src]="activeImage()" [alt]="p.name + ' — ảnh ' + (activeIndex() + 1)" appImgFallback />
              @if (images().length > 1) {
                <button type="button" class="gallery-nav prev" (click)="step(-1)" aria-label="Ảnh trước">‹</button>
                <button type="button" class="gallery-nav next" (click)="step(1)" aria-label="Ảnh sau">›</button>
                <span class="gallery-count">{{ activeIndex() + 1 }} / {{ images().length }}</span>
              }
            </div>
            @if (images().length > 1) {
              <div class="thumbs" role="tablist" aria-label="Bộ ảnh sản phẩm">
                @for (img of images(); track img; let i = $index) {
                  <button type="button" role="tab" [attr.aria-selected]="i === activeIndex()" [attr.aria-label]="'Xem ảnh ' + (i + 1)"
                    [class.active]="i === activeIndex()" (click)="activeImage.set(img)"><img [src]="img" alt="" loading="lazy" appImgFallback /></button>
                }
              </div>
            }
            @if (activeCredit(); as c) {
              <p class="photo-credit">Ảnh: {{ c.artist || 'không rõ tác giả' }} · {{ c.license }} ·
                <a [href]="c.page" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a></p>
            }
          </div>
          <div class="detail-info">
            @if (isRescue()) {
              <span class="tag tag-green">♻️ GIẢI CỨU · {{ p.rescue!.reason }}</span>
            }
            <h1>{{ p.name }}</h1>
            <div class="muted">
              @if (p.farm) { <a [routerLink]="['/farms', p.farm.slug]">🏡 {{ p.farm.name }}</a> · {{ p.farm.province }} · }
              ★ {{ p.rating }} ({{ p.reviewCount }} đánh giá demo) · đã bán {{ p.soldCount }}
            </div>
            <div class="detail-price" [class.rescue]="isRescue()">
              {{ p.price | money }} <small>/ {{ p.unit }}</small>
              @if (isRescue()) {
                <s>{{ p.rescue!.originalPrice | money }}</s> <span class="tag tag-red">-{{ p.rescue!.discountRate }}%</span>
              }
            </div>
            @if (p.rescue) {
              <div class="note" [class.note-danger]="p.rescue.expired">
                @if (p.rescue.expired) {
                  ⛔ Hàng giải cứu đã hết hạn bán ({{ p.rescue.expiresAt | date: 'dd/MM/yyyy HH:mm' }}).
                } @else {
                  ⏳ Giá giải cứu áp dụng đến {{ p.rescue.expiresAt | date: 'HH:mm dd/MM/yyyy' }} ({{ p.rescue.expiresAt | timeLeft }}). Giá do hệ thống tính từ giá gốc.
                }
              </div>
            }
            <div class="certs">
              @for (c of p.certifications; track c) { <span class="tag">✔ {{ c }}</span> }
            </div>
            <div class="stock-line">
              @if (p.inStock) { Còn <b>{{ p.stockLeft }}</b> {{ p.unit }} trong kho } @else { <span class="text-danger">Tạm hết hàng</span> }
            </div>
            <div class="buy-row">
              <app-qty [(value)]="qty" [max]="maxQty()" [disabled]="!canBuy()" />
              <button type="button" class="btn btn-primary btn-lg" [disabled]="!canBuy() || actions.busyId() === p.id" (click)="add()">
                🛒 {{ actions.busyId() === p.id ? 'Đang thêm...' : 'Thêm vào giỏ' }}
              </button>
              <button type="button" class="btn btn-orange btn-lg" [disabled]="!canBuy()" (click)="buyNow()">Mua ngay</button>
            </div>
            <ul class="perks">
              <li>🚚 Phí ship 20.000đ, miễn phí cho đơn từ 200.000đ</li>
              <li>💵 Thanh toán khi nhận hàng (COD)</li>
              <li>↩️ Hủy miễn phí khi nhà bán chưa xác nhận</li>
            </ul>
          </div>
        </div>
        <section class="section card">
          <h2>Mô tả sản phẩm</h2>
          <p class="prose">{{ p.description }}</p>
          @if (p.vendor) { <p class="muted">Nhà bán: {{ p.vendor.name }}</p> }
        </section>
        <app-similar-products [productId]="p.id" />
      }
    </div>
  `,
})
export class ProductDetailPage {
  /** Bind từ route param :slug nhờ withComponentInputBinding(). */
  readonly slug = input.required<string>();
  private catalog = inject(CatalogService);
  private title = inject(Title);
  protected actions = inject(ShopActions);
  private router = inject(Router);

  protected product = signal<Product | null>(null);
  protected state = signal<'loading' | 'error' | 'ok'>('loading');
  protected error = signal<string | null>(null);
  protected activeImage = signal('');
  protected qty = signal(1);
  protected images = computed(() => {
    const p = this.product();
    return p ? [p.mainImage, ...p.galleryImages].filter(Boolean) : [];
  });
  protected activeIndex = computed(() => Math.max(0, this.images().indexOf(this.activeImage())));
  /** Ghi nguồn cho ảnh giấy phép mở đang xem (nếu có). */
  protected activeCredit = computed(() => this.product()?.imageCredits?.find((c) => c.url === this.activeImage()) ?? null);
  protected isRescue = computed(() => !!this.product()?.rescue && !this.product()!.rescue!.expired);
  protected canBuy = computed(() => {
    const p = this.product();
    return !!p && p.inStock && !(p.rescue && p.rescue.expired);
  });
  protected maxQty = computed(() => Math.max(1, Math.min(99, this.product()?.stockLeft ?? 1)));

  constructor() {
    effect(() => this.load(this.slug()));
  }

  load(slug: string): void {
    this.state.set('loading');
    this.qty.set(1);
    this.catalog.product(slug).subscribe({
      next: (p) => {
        this.product.set(p);
        this.activeImage.set(p.mainImage);
        this.title.setTitle(`${p.name} · FarmTable`);
        this.state.set('ok');
        this.catalog.track('view', p.id);
      },
      error: (e) => {
        const err = ApiError.from(e);
        this.error.set(err.status === 404 ? 'Sản phẩm không tồn tại hoặc đã ngừng bán.' : err.message);
        this.state.set('error');
      },
    });
  }

  /** Chuyển ảnh trước/sau, quay vòng. */
  step(delta: number): void {
    const imgs = this.images();
    if (imgs.length < 2) return;
    this.activeImage.set(imgs[(this.activeIndex() + delta + imgs.length) % imgs.length]);
  }

  add(): void {
    const p = this.product();
    if (p) this.actions.addProduct(p.id, p.name, this.qty());
  }

  async buyNow(): Promise<void> {
    const p = this.product();
    if (p && (await this.actions.addProduct(p.id, p.name, this.qty()))) {
      this.router.navigate(['/cart']);
    }
  }
}
