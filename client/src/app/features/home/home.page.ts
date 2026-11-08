import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CATEGORY_ICONS, CATEGORY_LABELS, Category, Farm, GroupBuy, MysteryBox, Product } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { ProductCardComponent } from '../../shared/product-card.component';
import { CountdownComponent, StateComponent } from '../../shared/ui';
import { MoneyPipe } from '../../shared/pipes';
import { ImgFallbackDirective } from '../../shared/img-fallback.directive';
import { ForYouComponent } from '../recommend/recommend.components';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ProductCardComponent, StateComponent, CountdownComponent, MoneyPipe, ImgFallbackDirective, ForYouComponent],
  template: `
    <div class="container page">
      <section class="hero-row">
        <aside class="cat-side hide-sm">
          <div class="cat-side-head">Danh mục sản phẩm</div>
          @for (c of categories(); track c.slug) {
            <a [routerLink]="['/shop']" [queryParams]="{ category: c.slug }">{{ icons[c.slug] }} {{ labels[c.slug] }} <small>{{ c.count }}</small></a>
          }
          <a routerLink="/rescue">♻️ Nông sản xấu mã <span class="tag tag-green">GIẢI CỨU</span></a>
          <a routerLink="/mystery-box">🎁 Mystery Box <span class="tag tag-purple">BÍ ẨN</span></a>
          <a routerLink="/group-buy">👥 Đang mua chung <span class="tag tag-orange">HOT</span></a>
          <a routerLink="/farms">🏡 Cửa hàng nông trại</a>
        </aside>
        <div class="hero">
          <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200" alt="" appImgFallback />
          <div class="hero-text">
            <span class="hero-chip">🌱 Từ nhà vườn tới bếp nhà bạn</span>
            <h1>Nông sản sạch,<br />giá tận vườn</h1>
            <p>Hơn 20 nông trại tại Lâm Đồng, Sơn La, miền Tây... giao trong ngày, trả tiền khi nhận hàng.</p>
            <div class="row-gap">
              <a routerLink="/shop" class="btn btn-light">Mua ngay</a>
              <a routerLink="/rescue" class="btn btn-ghost-light">Giải cứu nông sản →</a>
            </div>
          </div>
        </div>
        <div class="hero-side hide-md">
          <a routerLink="/rescue" class="hero-tile tile-orange">
            <b>♻️ Giải cứu</b><span>Giảm 30–50% hàng xấu mã</span>
          </a>
          <a routerLink="/group-buy" class="hero-tile tile-green">
            <b>👥 Mua chung</b><span>Đủ người là chốt giá nhóm</span>
          </a>
        </div>
      </section>

      <section class="features-strip">
        <div>🚚 <b>Giao nhanh</b><span>Miễn phí từ 200.000đ</span></div>
        <div>💵 <b>COD</b><span>Nhận hàng mới trả tiền</span></div>
        <div>🌿 <b>Truy xuất</b><span>Biết rõ nông trại</span></div>
        <div>🤖 <b>Gợi ý thông minh</b><span>Theo sở thích của bạn</span></div>
      </section>

      @if (state() !== 'ok') {
        <app-state [state]="state()" (retry)="load()" />
      } @else {
        @if (rescue().length) {
          <section class="section rescue-band">
            <div class="section-head">
              <h2>♻️ Giải cứu nông sản — sắp hết hạn</h2>
              <a routerLink="/rescue" class="link">Xem tất cả →</a>
            </div>
            <div class="product-grid cols-5">
              @for (p of rescue(); track p.id) {
                <app-product-card [product]="p" />
              }
            </div>
          </section>
        }

        @if (groupBuys().length) {
          <section class="section">
            <div class="section-head">
              <h2>👥 Đang mua chung</h2>
              <a routerLink="/group-buy" class="link">Xem tất cả →</a>
            </div>
            <div class="gb-grid">
              @for (g of groupBuys(); track g.id) {
                <a class="gb-card" [routerLink]="['/group-buy', g.id]">
                  <img [src]="g.product.mainImage" alt="" appImgFallback />
                  <div class="gb-body">
                    <div class="gb-title line-clamp-2">{{ g.title }}</div>
                    <div class="gb-price">{{ g.groupPrice | money }} <s>{{ g.regularPrice | money }}</s> <span class="tag tag-orange">-{{ g.discountRate }}%</span></div>
                    <div class="progress"><div [style.width.%]="g.progress"></div></div>
                    <div class="gb-meta"><span>{{ g.joinedQty }}/{{ g.targetQty }} {{ g.product.unit }}</span><app-countdown [deadline]="g.deadline" [serverTime]="g.serverTime" /></div>
                  </div>
                </a>
              }
            </div>
          </section>
        }

        @if (auth.isLoggedIn()) {
          <app-for-you />
        }

        <section class="section">
          <div class="section-head">
            <h2>🔥 Bán chạy</h2>
            <a [routerLink]="['/shop']" [queryParams]="{ sort: 'popular' }" class="link">Xem thêm →</a>
          </div>
          <div class="product-grid cols-5">
            @for (p of popular(); track p.id) {
              <app-product-card [product]="p" />
            }
          </div>
        </section>

        @if (boxes().length) {
          <section class="section mystery-band">
            <div>
              <h2>🎁 Mystery Box — mở hộp mới biết</h2>
              <p>Hộp nông sản theo mùa, giá trị ước tính cao hơn giá bán. Thành phần được giữ bí mật tới khi bạn nhận hàng.</p>
              <a routerLink="/mystery-box" class="btn btn-purple">Khám phá hộp bí ẩn</a>
            </div>
            <div class="mystery-mini">
              @for (b of boxes(); track b.id) {
                <a routerLink="/mystery-box" class="mini-box">
                  <span class="big-emoji">🎁</span>
                  <b>{{ b.name }}</b>
                  <span>{{ b.price | money }} · còn {{ b.available }} hộp</span>
                </a>
              }
            </div>
          </section>
        }

        <section class="section">
          <div class="section-head">
            <h2>🆕 Mới lên kệ</h2>
            <a routerLink="/shop" class="link">Xem cửa hàng →</a>
          </div>
          <div class="product-grid cols-5">
            @for (p of newest(); track p.id) {
              <app-product-card [product]="p" />
            }
          </div>
        </section>

        <section class="section">
          <div class="section-head">
            <h2>🏡 Nông trại đối tác</h2>
            <a routerLink="/farms" class="link">Tất cả nông trại →</a>
          </div>
          <div class="farm-strip">
            @for (f of farms(); track f.id) {
              <a class="farm-chip" [routerLink]="['/farms', f.slug]">
                <b>{{ f.name }}</b><span>{{ f.province }} · {{ f.productCount }} sản phẩm</span>
              </a>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class HomePage {
  private catalog = inject(CatalogService);
  protected auth = inject(AuthService);
  protected labels = CATEGORY_LABELS;
  protected icons = CATEGORY_ICONS;

  protected state = signal<'loading' | 'error' | 'ok'>('loading');
  protected categories = signal<{ slug: Category; count: number }[]>([]);
  protected rescue = signal<Product[]>([]);
  protected popular = signal<Product[]>([]);
  protected newest = signal<Product[]>([]);
  protected groupBuys = signal<GroupBuy[]>([]);
  protected boxes = signal<MysteryBox[]>([]);
  protected farms = signal<Farm[]>([]);

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    forkJoin({
      categories: this.catalog.categories(),
      rescue: this.catalog.rescue(1, 5),
      popular: this.catalog.products({ sort: 'popular', limit: 10 }),
      newest: this.catalog.products({ sort: 'newest', limit: 5, type: 'regular' }),
      groupBuys: this.catalog.groupBuys('open'),
      boxes: this.catalog.mysteryBoxes(),
      farms: this.catalog.farms(),
    }).subscribe({
      next: (r) => {
        this.categories.set(r.categories);
        this.rescue.set(r.rescue.data);
        this.popular.set(r.popular.data);
        this.newest.set(r.newest.data);
        this.groupBuys.set(r.groupBuys.slice(0, 3));
        this.boxes.set(r.boxes);
        this.farms.set(r.farms.filter((f) => (f.productCount ?? 0) > 0).slice(0, 10));
        this.state.set('ok');
      },
      error: () => this.state.set('error'),
    });
  }
}
