import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../core/models';
import { CatalogService } from '../../core/services/catalog.service';
import { ProductCardComponent } from '../../shared/product-card.component';
import { StateComponent } from '../../shared/ui';
import { MoneyPipe } from '../../shared/pipes';

/** Giải cứu nông sản: hàng xấu mã/dư cung giảm 30–50%, có hạn bán; giá do server tính. */
@Component({
  selector: 'app-rescue',
  imports: [RouterLink, ProductCardComponent, StateComponent, MoneyPipe],
  template: `
    <section class="band band-green">
      <div class="container band-inner">
        <div>
          <h1>Xấu mã nhưng ngon — giảm 30–50%</h1>
          <p>Nông sản trầy vỏ, sai kích cỡ hoặc dư cung cuối vụ được bán với giá giải cứu trong thời gian giới hạn. Mua để giảm lãng phí thực phẩm và hỗ trợ nhà vườn.</p>
        </div>
        <div class="band-stats">
          <div><b>{{ items().length }}</b><span>sản phẩm đang giải cứu</span></div>
          <div><b>{{ saved() | money }}</b><span>tiết kiệm nếu mua mỗi thứ 1 đơn vị</span></div>
        </div>
      </div>
    </section>
    <div class="container page">
      <div class="steps">
        <div><b>1</b> Nhà vườn đăng hàng xấu mã kèm hạn bán</div>
        <div><b>2</b> Hệ thống tự tính giá giảm 30–50%</div>
        <div><b>3</b> Hết hạn là tự gỡ khỏi kệ, không thể đặt</div>
      </div>
      @if (state() !== 'ok') {
        <app-state [state]="state()" emptyText="Hiện chưa có nông sản cần giải cứu" emptyIcon="leaf" (retry)="load()" />
      } @else {
        <div class="section-head"><h2>Sắp hết hạn trước</h2><a routerLink="/shop" [queryParams]="{ type: 'rescue' }" class="link">Lọc nâng cao →</a></div>
        <div class="product-grid cols-5">
          @for (p of items(); track p.id) {
            <app-product-card [product]="p" />
          }
        </div>
      }
    </div>
  `,
})
export class RescuePage {
  private catalog = inject(CatalogService);
  protected items = signal<Product[]>([]);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');
  protected saved = computed(() => this.items().reduce((s, p) => s + ((p.rescue?.originalPrice ?? p.price) - p.price), 0));

  constructor() {
    this.load();
  }
  load(): void {
    this.state.set('loading');
    this.catalog.rescue(1, 50).subscribe({
      next: (r) => {
        this.items.set(r.data);
        this.state.set(r.data.length ? 'ok' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }
}
