import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Routes } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="container page dash-layout">
      <aside class="dash-nav">
        <div class="dash-nav-head"><b>🛡️ Quản trị</b><small class="muted">{{ auth.user()?.email }}</small></div>
        <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">📊 KPI toàn sàn</a>
        <a routerLink="/admin/vendors" routerLinkActive="active">🏪 Duyệt nhà bán</a>
        <a routerLink="/admin/users" routerLinkActive="active">👥 Tài khoản</a>
        <a routerLink="/admin/audit-logs" routerLinkActive="active">📝 Nhật ký thao tác</a>
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
      { path: 'audit-logs', loadComponent: () => import('./admin-audit.page').then((m) => m.AdminAuditPage), title: 'Nhật ký · Quản trị' },
    ],
  },
];
