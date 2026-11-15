import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { CartService } from '../core/services/cart.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  template: `
    <div class="top-bar">
      <div class="container top-bar-inner">
        <span><svg class="icon" aria-hidden="true"><use href="icons.svg#truck" /></svg> Miễn phí giao hàng cho đơn từ 200.000đ · Thanh toán khi nhận hàng (COD)</span>
        <span class="hide-sm">
          @if (!auth.isLoggedIn()) {
            <a routerLink="/register" [queryParams]="{ as: 'vendor' }">Đăng ký bán hàng</a>
          } @else if (auth.role() === 'vendor') {
            <a routerLink="/vendor">Kênh nhà bán</a>
          }
        </span>
      </div>
    </div>
    <header class="navbar">
      <div class="container navbar-inner">
        <button type="button" class="icon-btn show-sm" (click)="menuOpen.set(!menuOpen())" [attr.aria-label]="menuOpen() ? 'Đóng danh mục' : 'Mở danh mục'" aria-controls="main-navigation" [attr.aria-expanded]="menuOpen()"><svg class="icon" aria-hidden="true"><use [attr.href]="menuOpen() ? 'icons.svg#close' : 'icons.svg#menu'" /></svg></button>
        <a routerLink="/" class="brand" aria-label="FarmTable - trang chủ">
          <img src="logo.svg" alt="" width="32" height="32" />
          <span>Farm<b>Table</b></span>
        </a>
        <form class="search" role="search" (ngSubmit)="search()">
          <input type="search" name="q" [(ngModel)]="q" placeholder="Tìm rau củ, trái cây, nông trại..." aria-label="Tìm kiếm sản phẩm" />
          <button type="submit" aria-label="Tìm"><svg class="icon" aria-hidden="true"><use href="icons.svg#search" /></svg></button>
        </form>
        <nav class="nav-actions" aria-label="Tài khoản và giỏ hàng">
          @if (auth.isBuyer() || !auth.isLoggedIn()) {
            <a routerLink="/cart" class="icon-link cart-link" [attr.aria-label]="'Giỏ hàng, ' + cart.count() + ' sản phẩm'">
              <svg class="icon" aria-hidden="true"><use href="icons.svg#cart" /></svg>
              @if (cart.count() > 0) {
                <span class="cart-badge">{{ cart.count() > 99 ? '99+' : cart.count() }}</span>
              }
              <span class="hide-sm">Giỏ hàng</span>
            </a>
          }
          @if (auth.user(); as u) {
            <div class="account-menu">
              <button id="account-trigger" type="button" class="icon-link" aria-controls="account-links" [attr.aria-label]="'Tài khoản của ' + u.name" (click)="accountOpen.set(!accountOpen())" [attr.aria-expanded]="accountOpen()">
                <svg class="icon" aria-hidden="true"><use href="icons.svg#user" /></svg> <span class="hide-sm">{{ u.name }}</span> <svg class="icon" aria-hidden="true"><use href="icons.svg#chevron-down" /></svg>
              </button>
              @if (accountOpen()) {
                <div id="account-links" class="dropdown" (click)="accountOpen.set(false)">
                  <div class="dropdown-head">{{ u.email }}<br /><small>{{ roleLabel[u.role] }}</small></div>
                  @if (u.role === 'buyer') {
                    <a routerLink="/orders"><svg class="icon" aria-hidden="true"><use href="icons.svg#box" /></svg> Đơn hàng của tôi</a>
                    <a routerLink="/account" [queryParams]="{ tab: 'group-buys' }"><svg class="icon" aria-hidden="true"><use href="icons.svg#users" /></svg> Mua chung của tôi</a>
                  }
                  @if (u.role === 'vendor') {
                    <a routerLink="/vendor"><svg class="icon" aria-hidden="true"><use href="icons.svg#store" /></svg> Kênh nhà bán</a>
                  }
                  @if (u.role === 'admin') {
                    <a routerLink="/admin"><svg class="icon" aria-hidden="true"><use href="icons.svg#shield" /></svg> Trang quản trị</a>
                  }
                  <a routerLink="/account"><svg class="icon" aria-hidden="true"><use href="icons.svg#settings" /></svg> Tài khoản</a>
                  <button type="button" (click)="auth.logout()"><svg class="icon" aria-hidden="true"><use href="icons.svg#logout" /></svg> Đăng xuất</button>
                </div>
              }
            </div>
          } @else {
            <a routerLink="/login" class="icon-link" aria-label="Đăng nhập"><svg class="icon" aria-hidden="true"><use href="icons.svg#user" /></svg> <span class="hide-sm">Đăng nhập</span></a>
          }
        </nav>
      </div>
    </header>
    <nav id="main-navigation" class="cat-nav" [class.open]="menuOpen()" aria-label="Danh mục chính">
      <div class="container cat-nav-inner">
        <a routerLink="/" routerLinkActive="active" ariaCurrentWhenActive="page" [routerLinkActiveOptions]="{ exact: true }">Trang chủ</a>
        <a routerLink="/shop" routerLinkActive="active">Cửa hàng</a>
        <a routerLink="/rescue" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#rescue" /></svg> Giải cứu</a>
        <a routerLink="/mystery-box" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#box" /></svg> Mystery Box</a>
        <a routerLink="/group-buy" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#users" /></svg> Mua chung</a>
        <a routerLink="/farms" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#farm" /></svg> Nông trại</a>
        <a routerLink="/recipes" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#leaf" /></svg> Công thức</a>
        <a routerLink="/blog" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#note" /></svg> Blog</a>
        @if (auth.isBuyer()) {
          <a routerLink="/orders" routerLinkActive="active" class="push-right"><svg class="icon" aria-hidden="true"><use href="icons.svg#box" /></svg> Theo dõi đơn</a>
        }
      </div>
    </nav>
  `,
})
export class HeaderComponent {
  protected auth = inject(AuthService);
  protected cart = inject(CartService);
  private router = inject(Router);
  private host: ElementRef<HTMLElement> = inject(ElementRef);

  @HostListener('document:click', ['$event'])
  closeOutside(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.accountOpen.set(false);
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeMenus(): void {
    if (this.accountOpen()) this.host.nativeElement.querySelector<HTMLButtonElement>('#account-trigger')?.focus();
    else if (this.menuOpen()) this.host.nativeElement.querySelector<HTMLButtonElement>('[aria-controls="main-navigation"]')?.focus();
    this.accountOpen.set(false);
    this.menuOpen.set(false);
  }
  protected q = '';
  protected menuOpen = signal(false);
  protected accountOpen = signal(false);
  protected roleLabel = { buyer: 'Người mua', vendor: 'Nhà bán', admin: 'Quản trị viên' } as const;

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.q = this.router.parseUrl(this.router.url).queryParams['q'] || '';
        this.menuOpen.set(false);
        this.accountOpen.set(false);
      });
  }

  search(): void {
    this.router.navigate(['/shop'], { queryParams: { q: this.q.trim() || null } });
  }
}
