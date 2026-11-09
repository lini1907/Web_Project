import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Routes } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="container page dash-layout">
      <aside class="dash-nav">
        <div class="dash-nav-head"><b><svg class="icon" aria-hidden="true"><use href="icons.svg#shield" /></svg> Quản trị</b><small class="muted">{{ auth.user()?.email }}</small></div>
        <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"><svg class="icon" aria-hidden="true"><use href="icons.svg#chart" /></svg> KPI toàn sàn</a>
        <a routerLink="/admin/vendors" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#store" /></svg> Duyệt nhà bán</a>
        <a routerLink="/admin/users" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#users" /></svg> Tài khoản</a>
        <a routerLink="/admin/vouchers" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#tag" /></svg> Mã giảm giá</a>
        <a routerLink="/admin/reviews" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#star" /></svg> Đánh giá</a>
        <a routerLink="/admin/articles" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#note" /></svg> Công thức & Blog</a>
        <a routerLink="/admin/audit-logs" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#note" /></svg> Nhật ký thao tác</a>
      </aside>
      <section class="dash-main"><router-outlet /></section>
    </div>
  `,
})
export class AdminLayout {
  protected auth = inject(AuthService);
}

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      { path: '', loadComponent: () => import('./admin-dashboard.page').then((m) => m.AdminDashboardPage), title: 'KPI · Quản trị' },
      { path: 'vendors', loadComponent: () => import('./admin-vendors.page').then((m) => m.AdminVendorsPage), title: 'Nhà bán · Quản trị' },
      { path: 'users', loadComponent: () => import('./admin-users.page').then((m) => m.AdminUsersPage), title: 'Tài khoản · Quản trị' },
      { path: 'vouchers', loadComponent: () => import('./admin-vouchers.page').then((m) => m.AdminVouchersPage), title: 'Mã giảm giá · Quản trị' },
      { path: 'reviews', loadComponent: () => import('./admin-reviews.page').then((m) => m.AdminReviewsPage), title: 'Đánh giá · Quản trị' },
      { path: 'articles', loadComponent: () => import('./admin-articles.page').then((m) => m.AdminArticlesPage), title: 'Công thức & Blog · Quản trị' },
      { path: 'audit-logs', loadComponent: () => import('./admin-audit.page').then((m) => m.AdminAuditPage), title: 'Nhật ký · Quản trị' },
    ],
  },
];
