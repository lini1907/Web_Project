import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <section class="container page center-page">
      <div class="state-icon"><svg class="icon" aria-hidden="true"><use href="icons.svg#leaf" /></svg></div>
      <h1>404 · Không tìm thấy trang</h1>
      <p class="muted">Đường dẫn không tồn tại hoặc sản phẩm đã ngừng bán.</p>
      <div class="row-gap">
        <a routerLink="/" class="btn btn-primary">Về trang chủ</a>
        <a routerLink="/shop" class="btn btn-outline">Xem cửa hàng</a>
      </div>
    </section>
  `,
})
export class NotFoundPage {}

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink],
  template: `
    <section class="container page center-page">
      <div class="state-icon"><svg class="icon" aria-hidden="true"><use href="icons.svg#lock" /></svg></div>
      <h1>Bạn không có quyền vào trang này</h1>
      <p class="muted">Trang này dành cho vai trò khác (người mua / nhà bán / quản trị).</p>
      <a routerLink="/" class="btn btn-primary">Về trang chủ</a>
    </section>
  `,
})
export class ForbiddenPage {}
