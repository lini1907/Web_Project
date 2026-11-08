import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-vendor-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, StatusBadgeComponent],
  template: `
    <div class="container page dash-layout">
      <aside class="dash-nav">
        <div class="dash-nav-head">
          <b>🏪 {{ auth.user()?.name }}</b>
          @if (auth.user()?.vendorStatus; as vs) { <app-status [value]="vs" /> }
        </div>
        <a routerLink="/vendor" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">📊 Tổng quan</a>
        <a routerLink="/vendor/orders" routerLinkActive="active">📦 Đơn hàng</a>
        <a routerLink="/vendor/products" routerLinkActive="active">🥬 Sản phẩm & kho</a>
        <a routerLink="/vendor/mystery-boxes" routerLinkActive="active">🎁 Mystery Box</a>
        <a routerLink="/vendor/group-buys" routerLinkActive="active">👥 Mua chung</a>
        <a routerLink="/vendor/farm" routerLinkActive="active">🏡 Hồ sơ nông trại</a>
      </aside>
      <section class="dash-main">
        @if (auth.user()?.vendorStatus !== 'approved') {
          <div class="note note-danger">
            @if (auth.user()?.vendorStatus === 'rejected') {
              Hồ sơ nhà bán bị từ chối: {{ auth.user()?.vendorNote }}. Vui lòng cập nhật hồ sơ nông trại và liên hệ quản trị viên.
            } @else {
              ⏳ Tài khoản đang <b>chờ quản trị viên duyệt</b>. Bạn có thể cập nhật hồ sơ nông trại; chức năng đăng bán sẽ mở sau khi được duyệt.
            }
          </div>
        }
        <router-outlet />
      </section>
    </div>
  `,
})
export class VendorLayout {
  protected auth = inject(AuthService);
}
