import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { CartLine } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { MoneyPipe } from '../../shared/pipes';
import { QtyComponent, StateComponent } from '../../shared/ui';
import { ImgFallbackDirective } from '../../shared/img-fallback.directive';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, MoneyPipe, QtyComponent, StateComponent, ImgFallbackDirective],
  template: `
    <div class="container page">
      <h1><svg class="icon" aria-hidden="true"><use href="icons.svg#cart" /></svg> Giỏ hàng</h1>
      @if (auth.isLoggedIn() && !auth.isBuyer()) {
        <app-state state="empty" emptyIcon="store" emptyText="Tài khoản nhà bán/quản trị không có giỏ hàng." />
      } @else if (state() !== 'ok') {
        <app-state [state]="state()" (retry)="load()" />
      } @else if (!cart()?.items?.length) {
        <app-state state="empty" emptyText="Giỏ hàng đang trống">
          <a class="btn btn-primary" routerLink="/shop">Tiếp tục mua sắm</a>
        </app-state>
      } @else {
        @let c = cart()!;
        @if (c.guest) {
          <div class="note guest-note">
            <svg class="icon" aria-hidden="true"><use href="icons.svg#info" /></svg> Giỏ hàng đang được lưu trên trình duyệt này. Đăng nhập để giữ sản phẩm trong tài khoản.
            <a routerLink="/login" [queryParams]="{ returnUrl: '/cart' }">Đăng nhập</a> ·
            <a routerLink="/register" [queryParams]="{ returnUrl: '/cart' }">Tạo tài khoản</a>
          </div>
        }
        <div class="cart-layout">
          <section class="card">
            @for (group of groups(); track group.vendor) {
              <div class="cart-vendor"><svg class="icon" aria-hidden="true"><use href="icons.svg#farm" /></svg> {{ group.vendor }}</div>
              @for (l of group.lines; track l.id) {
                <div class="cart-line" [class.has-warning]="l.warning">
                  <img [src]="l.image" alt="" appImgFallback />
                  <div class="cart-line-info">
                    @if (l.kind === 'product' && l.slug) {
                      <a [routerLink]="['/products', l.slug]" class="cart-name">{{ l.name }}</a>
                    } @else {
                      <span class="cart-name"><svg class="icon" aria-hidden="true"><use href="icons.svg#box" /></svg> {{ l.name }}</span>
                    }
                    <div class="small muted">
                      {{ l.unitPrice | money }} / {{ l.unit }}
                      @if (l.isRescue) { · <span class="tag tag-green">Giải cứu</span> }
                    </div>
                    @if (l.warning) { <div class="field-error"><svg class="icon" aria-hidden="true"><use href="icons.svg#alert" /></svg> {{ l.warning.message }} @if (l.available > 0) { (còn {{ l.available }}) }</div> }
                  </div>
                  <app-qty [value]="l.qty" [max]="l.available > 0 ? l.available : l.qty" [small]="true" [disabled]="busy() === l.id" (valueChange)="setQty(l, $event)" />
                  <div class="cart-line-total">{{ l.lineTotal | money }}</div>
                  <button type="button" class="icon-btn" (click)="setQty(l, 0)" aria-label="Xóa khỏi giỏ" title="Xóa"><svg class="icon" aria-hidden="true"><use href="icons.svg#close" /></svg></button>
                </div>
              }
            }
            <div class="row-between cart-foot">
              <a routerLink="/shop" class="link">← Tiếp tục mua sắm</a>
              <button type="button" class="btn btn-link text-danger" (click)="clear()">Xóa toàn bộ giỏ</button>
            </div>
          </section>
          <aside class="card summary">
            <h3>Tóm tắt đơn hàng</h3>
            <div class="row-between"><span>Tạm tính ({{ c.itemCount }} món)</span><b>{{ c.subtotal | money }}</b></div>
            <div class="row-between"><span>Phí giao hàng</span><b>{{ c.shippingFee === 0 ? 'Miễn phí' : (c.shippingFee | money) }}</b></div>
            @if (c.shippingFee > 0) {
              <div class="ship-hint">Mua thêm <b>{{ c.shippingRule.freeFrom - c.subtotal | money }}</b> để được miễn phí giao hàng
                <div class="progress"><div [style.width.%]="(c.subtotal / c.shippingRule.freeFrom) * 100"></div></div>
              </div>
            }
            <div class="row-between total"><span>Tổng cộng</span><b>{{ c.total | money }}</b></div>
            <p class="small muted">Giá được tính lại ở máy chủ theo giá hiện tại khi đặt hàng.</p>
            @if (c.hasIssues) { <div class="field-error">Có sản phẩm không đủ hàng/hết hạn. Vui lòng điều chỉnh trước khi đặt.</div> }
            @if (c.guest) {
              <a class="btn btn-primary btn-block btn-lg" [class.disabled]="c.hasIssues" [attr.aria-disabled]="c.hasIssues"
                [routerLink]="c.hasIssues ? null : '/login'" [queryParams]="{ returnUrl: '/checkout' }">Đăng nhập để đặt hàng</a>
              <p class="small muted">Giỏ tạm sẽ được gộp vào tài khoản ngay khi đăng nhập.</p>
            } @else {
              <a class="btn btn-primary btn-block btn-lg" [class.disabled]="c.hasIssues" [attr.aria-disabled]="c.hasIssues" [routerLink]="c.hasIssues ? null : '/checkout'">Tiến hành đặt hàng</a>
            }
          </aside>
        </div>
      }
    </div>
  `,
})
export class CartPage {
  protected auth = inject(AuthService);
  private cartService = inject(CartService);
  private toast = inject(ToastService);
  protected cart = this.cartService.cart;
  protected state = signal<'loading' | 'error' | 'ok'>('loading');
  protected busy = signal<string | null>(null);
  /** Nhóm dòng giỏ theo nhà bán (mỗi nhà bán sẽ là một "phần đơn"). */
  protected groups = computed(() => {
    const map = new Map<string, CartLine[]>();
    for (const l of this.cart()?.items ?? []) {
      const key = l.vendor?.name || 'Khác';
      map.set(key, [...(map.get(key) ?? []), l]);
    }
    return [...map.entries()].map(([vendor, lines]) => ({ vendor, lines }));
  });

  constructor() {
    if (!this.auth.isLoggedIn() || this.auth.isBuyer()) this.load();
  }

  load(): void {
    this.state.set('loading');
    this.cartService.refresh().then(
      () => this.state.set('ok'),
      () => this.state.set('error'),
    );
  }

  async setQty(line: CartLine, qty: number): Promise<void> {
    if (qty === line.qty) return;
    this.busy.set(line.id);
    try {
      await this.cartService.setQty(line.id, qty);
    } catch (e) {
      this.toast.error(ApiError.from(e).message);
      await this.cartService.refresh();
    } finally {
      this.busy.set(null);
    }
  }

  async clear(): Promise<void> {
    if (!confirm('Xóa toàn bộ sản phẩm trong giỏ?')) return;
    await this.cartService.clear();
  }
}
