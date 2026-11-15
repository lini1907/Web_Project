import { Component, DestroyRef, HostListener, ViewEncapsulation, inject, input, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../core/services/auth.service';

/**
 * Vỏ trang cho khu vực quản trị / nhà bán: tách hẳn khỏi giao diện cửa hàng (app.ts ẩn header, footer, chat).
 * Topbar riêng (thương hiệu + "Về cửa hàng" + email + đăng xuất), sidebar cao toàn màn hình;
 * dưới 900px sidebar thu vào sau nút menu (Escape hoặc chọn mục để đóng).
 * Dùng: <app-dash-shell area="Quản trị" home="/admin"><div dsHead>…</div><ng-container dsNav>…links…</ng-container> nội dung </app-dash-shell>
 */
@Component({
  selector: 'app-dash-shell',
  imports: [RouterLink],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="ds" [class.ds-open]="open()">
      <header class="ds-top">
        <button type="button" class="icon-btn ds-toggle" (click)="open.set(!open())" aria-controls="ds-nav" [attr.aria-expanded]="open()" [attr.aria-label]="open() ? 'Đóng menu quản lý' : 'Mở menu quản lý'">
          <svg class="icon" aria-hidden="true"><use [attr.href]="open() ? 'icons.svg#close' : 'icons.svg#menu'" /></svg>
        </button>
        <a class="brand brand-light ds-brand" [routerLink]="home()" [attr.aria-label]="'FarmTable ' + area()">
          <img src="logo.svg" alt="" width="28" height="28" />
          <span class="ds-hide-xs">Farm<b>Table</b></span>
          <span class="ds-area">{{ area() }}</span>
        </a>
        <span class="ds-spacer"></span>
        <a class="ds-top-link" routerLink="/"><svg class="icon" aria-hidden="true"><use href="icons.svg#store" /></svg><span class="ds-hide-sm">Về cửa hàng</span></a>
        <span class="ds-user" [title]="auth.user()?.email ?? ''"><svg class="icon" aria-hidden="true"><use href="icons.svg#user" /></svg><span class="ds-hide-sm">{{ auth.user()?.email }}</span></span>
        <button type="button" class="ds-top-link" (click)="auth.logout()"><svg class="icon" aria-hidden="true"><use href="icons.svg#logout" /></svg><span class="ds-hide-sm">Đăng xuất</span></button>
      </header>
      <div class="ds-body">
        <nav id="ds-nav" class="ds-side" [attr.aria-label]="'Menu ' + area()">
          <div class="ds-side-head"><ng-content select="[dsHead]" /></div>
          <ng-content select="[dsNav]" />
        </nav>
        @if (open()) { <div class="ds-backdrop" (click)="open.set(false)" aria-hidden="true"></div> }
        <section class="ds-main"><ng-content /></section>
      </div>
    </div>
  `,
  styles: [
    `
      .ds { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }
      .ds-top { position: sticky; top: 0; z-index: 40; height: 60px; display: flex; align-items: center; gap: 8px; padding: 0 20px; background: var(--green-dark); color: #fff; }
      .ds-brand { font-size: 1.25rem; gap: 8px; }
      .ds-area { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.02em; padding: 3px 9px; border-radius: 999px; background: rgba(255, 255, 255, 0.14); color: #fff; }
      .ds-spacer { flex: 1; }
      .ds-top-link, .ds-user { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 10px; border-radius: 8px; color: #e7f0e3; font: inherit; font-size: 0.85rem; font-weight: 600; background: none; border: 0; cursor: pointer; text-decoration: none; }
      .ds-user { cursor: default; font-weight: 500; color: #c9dbc5; max-width: 260px; }
      .ds-user span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ds-top-link:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
      .ds-top-link:focus-visible, .ds-toggle:focus-visible { outline: 2px solid var(--green-badge); outline-offset: 2px; }
      .ds-toggle { display: none; color: #fff; }
      .ds-toggle:hover { background: rgba(255, 255, 255, 0.12); }
      .ds-body { flex: 1; display: grid; grid-template-columns: 240px minmax(0, 1fr); }
      .ds-side { position: sticky; top: 60px; align-self: start; height: calc(100vh - 60px); overflow-y: auto; background: var(--surface); border-right: 1px solid var(--border); padding: 12px; display: flex; flex-direction: column; gap: 2px; }
      .ds-side-head { padding: 8px 10px 12px; margin-bottom: 6px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; word-break: break-word; }
      .ds-side-head:empty { display: none; }
      .ds-side a { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; color: var(--muted); font-weight: 600; font-size: 0.88rem; text-decoration: none; }
      .ds-side a:hover { background: var(--green-light); color: var(--green-dark); }
      .ds-side a.active { background: var(--green-light); color: var(--green-600); box-shadow: inset 3px 0 0 var(--green); }
      .ds-main { min-width: 0; padding: 28px 32px 56px; }
      @media (max-width: 900px) {
        .ds-top { padding: 0 8px 0 4px; }
        .ds-toggle { display: inline-flex; align-items: center; justify-content: center; }
        .ds-hide-sm { display: none; }
        .ds-body { grid-template-columns: minmax(0, 1fr); }
        .ds-side { position: fixed; top: 60px; left: 0; bottom: 0; width: min(280px, 84vw); height: auto; z-index: 35; transform: translateX(-100%); visibility: hidden; transition: transform 0.2s ease, visibility 0.2s; box-shadow: var(--shadow); }
        .ds-open .ds-side { transform: none; visibility: visible; }
        .ds-backdrop { position: fixed; inset: 60px 0 0 0; z-index: 30; background: rgba(23, 61, 39, 0.35); }
        .ds-main { padding: 18px 16px 40px; }
      }
      @media (max-width: 420px) { .ds-hide-xs { display: none; } }
      @media (prefers-reduced-motion: reduce) { .ds-side { transition: none; } }
    `,
  ],
})
export class DashShellComponent {
  readonly area = input.required<string>();
  readonly home = input('/');
  protected auth = inject(AuthService);
  protected open = signal(false);

  constructor() {
    // Chọn một mục menu (điều hướng xong) => đóng sidebar trên mobile.
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.open.set(false));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.open.set(false);
      document.querySelector<HTMLElement>('.ds-toggle')?.focus();
    }
  }
}
