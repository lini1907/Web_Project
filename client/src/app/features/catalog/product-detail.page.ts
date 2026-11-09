import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
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
import { ProductReviewsComponent } from './product-reviews.component';
import { StorefrontService } from '../../core/services/storefront.service';

/** Chi tiết sản phẩm theo slug (route /products/:slug — slug thân thiện SEO). */
@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, DatePipe, MoneyPipe, TimeLeftPipe, CategoryLabelPipe, QtyComponent, StateComponent, ImgFallbackDirective, SimilarProductsComponent, ProductReviewsComponent],
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
              <img [src]="activeImage()" [alt]="p.name + ' — ảnh ' + (activeIndex() + 1)" width="960" height="960" fetchpriority="high" appImgFallback />
              @if (images().length > 1) {
                <button type="button" class="gallery-nav prev" (click)="step(-1)" aria-label="Ảnh trước"><svg class="icon" aria-hidden="true"><use href="icons.svg#chevron-left" /></svg></button>
                <button type="button" class="gallery-nav next" (click)="step(1)" aria-label="Ảnh sau"><svg class="icon" aria-hidden="true"><use href="icons.svg#chevron-right" /></svg></button>
                <span class="gallery-count">{{ activeIndex() + 1 }} / {{ images().length }}</span>
              }
            </div>
            @if (images().length > 1) {
              <div class="thumbs" role="group" aria-label="Bộ ảnh sản phẩm">
                @for (img of images(); track img; let i = $index) {
                  <button type="button" [attr.aria-pressed]="i === activeIndex()" [attr.aria-label]="'Xem ảnh ' + (i + 1)"
                    [class.active]="i === activeIndex()" (click)="activeImage.set(img)"><img [src]="img" alt="" loading="lazy" appImgFallback /></button>
                }
              </div>
            }
            <p class="photo-credit">{{ p.photoStatus === 'needs-photo' ? 'Chưa có ảnh đúng loại hàng. Nhà bán cần bổ sung ảnh thực tế.' : p.photoStatus === 'illustration' ? 'Ảnh minh họa đúng nhóm thực phẩm; không thể hiện lô hàng, giống hoặc tình trạng thực tế.' : 'Ảnh do nhà bán cung cấp. Hình thức thực tế có thể khác.' }}</p>
            @if (activeCredit(); as c) {
              <p class="photo-credit">Ảnh: {{ c.artist || 'không rõ tác giả' }} · {{ c.license }} ·
                <a [href]="c.page" target="_blank" rel="noopener noreferrer">Nguồn ảnh</a>@if (c.licenseUrl) { · <a [href]="c.licenseUrl" target="_blank" rel="noopener noreferrer">Giấy phép</a> }@if (c.modified) { · Đã đổi kích thước và định dạng WebP. }</p>
            }
          </div>
          <div class="detail-info">
            @if (isRescue()) {
              <span class="tag tag-green"><svg class="icon" aria-hidden="true"><use href="icons.svg#rescue" /></svg> GIẢI CỨU · {{ p.rescue!.reason }}</span>
            }
            <h1>{{ p.name }}</h1>
            <div class="muted">
              @if (p.farm) { <a [routerLink]="['/farms', p.farm.slug]"><svg class="icon" aria-hidden="true"><use href="icons.svg#farm" /></svg> {{ p.farm.name }}</a> · {{ p.farm.province }} · }
              @if (p.isDemo) { <span class="demo-label">Dữ liệu mẫu · chưa phải hồ sơ nhà bán đã xác minh</span> }
              @else if (p.reviewCount > 0) { <svg class="icon" aria-hidden="true"><use href="icons.svg#star" /></svg> {{ p.rating }} ({{ p.reviewCount }} đánh giá) }
            </div>
            <div class="detail-price" [class.rescue]="isRescue()">
              {{ p.price | money }} <small>/ {{ p.unit }}</small>
              @if (isRescue()) {
                <s>{{ p.rescue!.originalPrice | money }}</s> <span class="tag tag-red">-{{ p.rescue!.discountRate }}%</span>
              }
            </div>
            @if (p.rescue) {
              <div class="note" [class.note-danger]="rescueEnded()">
                @if (rescueEnded()) {
                  <svg class="icon" aria-hidden="true"><use href="icons.svg#alert" /></svg> Hàng giải cứu đã hết hạn bán ({{ p.rescue.expiresAt | date: 'dd/MM/yyyy HH:mm' }}).
                } @else {
                  <svg class="icon" aria-hidden="true"><use href="icons.svg#clock" /></svg> Giá giải cứu áp dụng đến {{ p.rescue.expiresAt | date: 'HH:mm dd/MM/yyyy' }} ({{ p.rescue.expiresAt | timeLeft }}). Giá do hệ thống tính từ giá gốc.
                }
              </div>
            }
            <dl class="product-facts">
              <div><dt>Đơn vị bán</dt><dd>1 {{ p.unit }}</dd></div>
              <div><dt>Quy cách</dt><dd>{{ p.packagingNote || 'Chưa có mô tả đóng gói chi tiết từ nhà bán.' }}</dd></div>
              <div><dt>Nguồn hàng</dt><dd>{{ p.farm?.province || 'Nhà bán chưa cung cấp địa phương.' }}</dd></div>
            </dl>
            <div class="stock-line">
              @if (p.inStock) { Còn <b>{{ p.stockLeft }}</b> {{ p.unit }} trong kho } @else { <span class="text-danger">Tạm hết hàng</span> }
            </div>
            <div class="buy-row">
              <app-qty [(value)]="qty" [max]="maxQty()" [disabled]="!canBuy()" />
              <button type="button" class="btn btn-primary btn-lg" [disabled]="!canBuy() || actions.busyId() === p.id" (click)="add()">
                <svg class="icon" aria-hidden="true"><use href="icons.svg#cart" /></svg> {{ actions.busyId() === p.id ? 'Đang thêm...' : 'Thêm vào giỏ' }}
              </button>
              <button type="button" class="btn btn-orange btn-lg" [disabled]="!canBuy()" (click)="buyNow()">Mua ngay</button>
            </div>
            <p class="quantity-total" aria-live="polite" aria-atomic="true">{{ qty() }} {{ p.unit }} · Tiền hàng <b>{{ qty() * p.price | money }}</b> <span class="muted small">(chưa gồm phí giao hàng)</span></p>
            <ul class="perks">
              <li><svg class="icon" aria-hidden="true"><use href="icons.svg#truck" /></svg> @if (storefront.info(); as info) { Phí giao hàng {{ info.shippingFee | money }}, miễn phí cho đơn từ {{ info.freeShippingFrom | money }} } @else { Phí giao hàng được hiển thị trong giỏ trước khi đặt. }</li>
              <li><svg class="icon" aria-hidden="true"><use href="icons.svg#wallet" /></svg> Thanh toán khi nhận hàng (COD)</li>
              <li><svg class="icon" aria-hidden="true"><use href="icons.svg#undo" /></svg> Hủy miễn phí khi nhà bán chưa xác nhận</li>
            </ul>
          </div>
        </div>
        <section class="section card">
          <h2>Mô tả sản phẩm</h2>
          <p class="prose">{{ p.description }}</p>
          @if (p.vendor) { <p class="muted">Nhà bán: {{ p.vendor.name }}</p> }
        </section>
        <section class="section product-guidance" aria-label="Thông tin trước khi mua">
          <div><h2>Giao hàng và bảo quản</h2><h3>Lịch giao</h3><p>{{ p.deliveryNote || 'Nhà bán chưa công bố thời gian giao dự kiến. Kiểm tra thông tin nhà bán nếu bạn cần nhận vào ngày cụ thể.' }}</p><h3>Bảo quản</h3><p>{{ p.storageNote || 'Chưa có hướng dẫn riêng từ nhà bán. Kiểm tra nhãn và hướng dẫn đi kèm khi nhận sản phẩm.' }}</p></div>
          <div id="product-origin"><h2>Nguồn gốc và chứng nhận</h2>@if (p.farm) { <p><a [routerLink]="['/farms', p.farm.slug]">{{ p.farm.name }}</a> · {{ p.farm.province }}</p> }<p class="small muted">Các thông tin dưới đây do nhà bán khai báo; chưa có hồ sơ chứng nhận được xác minh trên FarmTable.</p><div class="certs">@for (c of p.certifications; track c) { <span class="tag">{{ c }}</span> } @empty { <span class="muted">Chưa cung cấp chứng nhận.</span> }</div>@if (p.isDemo) { <p class="small muted">Tên, vùng trồng và chứng nhận của bản ghi này là dữ liệu mẫu cho đồ án.</p> }</div>
        </section>
        <app-product-reviews [productId]="p.id" (changed)="refreshRating()" />
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
  protected storefront = inject(StorefrontService);
  private now = signal(Date.now());
  protected rescueEnded = computed(() => { const r = this.product()?.rescue; return !!r && (r.expired || new Date(r.expiresAt).getTime() <= this.now()); });
  private requestId = 0;

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
  protected isRescue = computed(() => !!this.product()?.rescue && !this.rescueEnded());
  protected canBuy = computed(() => {
    const p = this.product();
    return !!p && p.inStock && !this.rescueEnded();
  });
  protected maxQty = computed(() => Math.max(1, Math.min(99, this.product()?.stockLeft ?? 1)));

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    effect(() => this.load(this.slug()));
  }

  load(slug: string): void {
    const requestId = ++this.requestId;
    this.state.set('loading');
    this.qty.set(1);
    this.catalog.product(slug).subscribe({
      next: (p) => {
        if (requestId !== this.requestId) return;
        this.product.set(p);
        this.activeImage.set(p.mainImage);
        this.title.setTitle(`${p.name} · FarmTable`);
        this.state.set('ok');
        this.catalog.track('view', p.id);
      },
      error: (e) => {
        if (requestId !== this.requestId) return;
        const err = ApiError.from(e);
        this.error.set(err.status === 404 ? 'Sản phẩm không tồn tại hoặc đã ngừng bán.' : err.message);
        this.state.set('error');
      },
    });
  }

  /** Sau khi viết/sửa/xóa đánh giá: tải lại điểm trung bình hiển thị ở đầu trang. */
  refreshRating(): void {
    this.catalog.product(this.slug()).subscribe({
      next: (p) => this.product.update((cur) => (cur ? { ...cur, rating: p.rating, reviewCount: p.reviewCount } : cur)),
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
