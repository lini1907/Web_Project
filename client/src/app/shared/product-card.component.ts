import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../core/models';
import { ShopActions } from '../core/services/shop-actions.service';
import { MoneyPipe, TimeLeftPipe } from './pipes';
import { ImgFallbackDirective } from './img-fallback.directive';

/** Thẻ sản phẩm dùng chung (component interaction: nhận @Input product từ trang cha). */
@Component({
  selector: 'app-product-card',
  imports: [RouterLink, MoneyPipe, TimeLeftPipe, ImgFallbackDirective],
  template: `
    @let p = product();
    <article class="product-card" [class.rescue]="isRescue()">
      <a class="product-image-wrap" [routerLink]="['/products', p.slug]">
        <img [src]="p.mainImage" [alt]="p.name" loading="lazy" appImgFallback />
        @if (p.galleryImages.length) {
          <!-- Rê chuột: hiện ảnh phụ đầu tiên; góc dưới: số ảnh trong bộ ảnh -->
          <img class="img-alt" [src]="p.galleryImages[0]" alt="" loading="lazy" aria-hidden="true" appImgFallback />
          <span class="badge-photos" [attr.title]="(p.galleryImages.length + 1) + ' ảnh'"><svg class="icon" aria-hidden="true"><use href="icons.svg#camera" /></svg> {{ p.galleryImages.length + 1 }}</span>
        }
        @if (isRescue()) {
          <span class="badge-rescue">Giải cứu -{{ p.rescue!.discountRate }}%</span>
        }
        @if (!p.inStock) {
          <span class="badge-soldout">Hết hàng</span>
        } @else if (p.stockLeft <= 5) {
          <span class="badge-low">Còn {{ p.stockLeft }}</span>
        }
      </a>
      <a class="product-name line-clamp-2" [routerLink]="['/products', p.slug]">{{ p.name }}</a>
      @if (p.farm) {
        <a class="product-farm line-clamp-1" [routerLink]="['/farms', p.farm.slug]"><svg class="icon" aria-hidden="true"><use href="icons.svg#farm" /></svg> {{ p.farm.name }}</a>
      }
      @if (showRating() && p.rating) {
        <div class="product-rating" title="Đánh giá và lượt bán là dữ liệu demo"><svg class="icon" aria-hidden="true"><use href="icons.svg#star" /></svg> {{ p.rating }} · {{ p.soldCount }} đã bán <span class="sr-only">(dữ liệu demo)</span></div>
      }
      <div class="product-price">
        <span>{{ p.price | money }}</span><span class="unit">/{{ p.unit }}</span>
        @if (isRescue()) {
          <span class="old-price">{{ p.rescue!.originalPrice | money }}</span>
        }
      </div>
      @if (isRescue()) {
        <div class="rescue-left"><svg class="icon" aria-hidden="true"><use href="icons.svg#clock" /></svg> {{ p.rescue!.expiresAt | timeLeft }}</div>
      }
      <button
        type="button"
        class="btn-add-cart"
        [attr.aria-busy]="actions.busyId() === p.id"
        [class.red]="isRescue()"
        [disabled]="!p.inStock || actions.busyId() === p.id"
        (click)="actions.addProduct(p.id, p.name)"
      >
        <svg class="icon" aria-hidden="true"><use href="icons.svg#cart" /></svg> {{ !p.inStock ? 'Hết hàng' : actions.busyId() === p.id ? 'Đang thêm...' : 'Thêm vào giỏ' }}<span class="sr-only">: {{ p.name }}</span>
      </button>
    </article>
  `,
})
export class ProductCardComponent {
  readonly product = input.required<Product>();
  readonly showRating = input(true);
  protected actions = inject(ShopActions);
  protected isRescue = computed(() => {
    const p = this.product();
    return p.type === 'rescue' && !!p.rescue && !p.rescue.expired;
  });
}
