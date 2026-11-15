import { Component, DOCUMENT, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Routes } from '@angular/router';
import { DashShellComponent } from '../../shared/dash-shell.component';

/** Theme Angular Material của khu admin: file CSS riêng (angular.json, inject: false), chỉ tải khi vào /admin. */
function loadAdminMaterialTheme(doc: Document): void {
  if (doc.getElementById('ft-admin-material')) return;
  const link = doc.createElement('link');
  link.id = 'ft-admin-material';
  link.rel = 'stylesheet';
  link.href = 'admin-material.css';
  doc.head.appendChild(link);
}

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DashShellComponent],
  host: { class: 'ft-mat' },
  template: `
    <app-dash-shell area="Quản trị" home="/admin">
      <div dsHead><b><svg class="icon" aria-hidden="true"><use href="icons.svg#shield" /></svg> Bảng quản trị</b></div>
      <ng-container dsNav>
        <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"><svg class="icon" aria-hidden="true"><use href="icons.svg#chart" /></svg> KPI toàn sàn</a>
        <a routerLink="/admin/orders" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#box" /></svg> Đơn hàng</a>
        <a routerLink="/admin/vendors" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#store" /></svg> Duyệt nhà bán</a>
        <a routerLink="/admin/users" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#users" /></svg> Tài khoản</a>
        <a routerLink="/admin/vouchers" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#tag" /></svg> Mã giảm giá</a>
        <a routerLink="/admin/reviews" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#star" /></svg> Đánh giá</a>
        <a routerLink="/admin/articles" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#note" /></svg> Công thức & Blog</a>
        <a routerLink="/admin/audit-logs" routerLinkActive="active"><svg class="icon" aria-hidden="true"><use href="icons.svg#clock" /></svg> Nhật ký thao tác</a>
      </ng-container>
      <router-outlet />
    </app-dash-shell>
  `,
  styles: [':host { display: block; }'],
})
export class AdminLayout {
  constructor() {
    loadAdminMaterialTheme(inject(DOCUMENT));
  }
}

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      { path: '', loadComponent: () => import('./admin-dashboard.page').then((m) => m.AdminDashboardPage), title: 'KPI · Quản trị' },
      { path: 'orders', loadComponent: () => import('./admin-orders.page').then((m) => m.AdminOrdersPage), title: 'Đơn hàng · Quản trị' },
      { path: 'orders/:id', loadComponent: () => import('./admin-order-detail.page').then((m) => m.AdminOrderDetailPage), title: 'Chi tiết đơn · Quản trị' },
      { path: 'vendors', loadComponent: () => import('./admin-vendors.page').then((m) => m.AdminVendorsPage), title: 'Nhà bán · Quản trị' },
      { path: 'users', loadComponent: () => import('./admin-users.page').then((m) => m.AdminUsersPage), title: 'Tài khoản · Quản trị' },
      { path: 'vouchers', loadComponent: () => import('./admin-vouchers.page').then((m) => m.AdminVouchersPage), title: 'Mã giảm giá · Quản trị' },
      { path: 'reviews', loadComponent: () => import('./admin-reviews.page').then((m) => m.AdminReviewsPage), title: 'Đánh giá · Quản trị' },
      { path: 'articles', loadComponent: () => import('./admin-articles.page').then((m) => m.AdminArticlesPage), title: 'Công thức & Blog · Quản trị' },
      { path: 'audit-logs', loadComponent: () => import('./admin-audit.page').then((m) => m.AdminAuditPage), title: 'Nhật ký · Quản trị' },
    ],
  },
];
