import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="container footer-grid">
        <div>
          <div class="brand brand-light"><img src="logo.svg" alt="" width="28" height="28" /> <span>Farm<b>Table</b></span></div>
          <p class="muted-light">Sàn nông sản kết nối trực tiếp nhà vườn với bếp gia đình. Giải cứu nông sản xấu mã, hộp bí ẩn theo mùa và mua chung giá tốt.</p>
        </div>
        <div>
          <h4>Mua sắm</h4>
          <a routerLink="/shop">Tất cả sản phẩm</a>
          <a routerLink="/rescue">Nông sản giải cứu</a>
          <a routerLink="/mystery-box">Mystery Box</a>
          <a routerLink="/group-buy">Mua chung</a>
          <a routerLink="/tracking">Tra cứu vận đơn</a>
        </div>
        <div>
          <h4>Nhà bán</h4>
          <a routerLink="/register" [queryParams]="{ as: 'vendor' }">Đăng ký bán hàng</a>
          <a routerLink="/login" [queryParams]="{ as: 'vendor' }">Đăng nhập nhà bán</a>
          <a routerLink="/farms">Danh sách nông trại</a>
        </div>
        <div>
          <h4>Hỗ trợ</h4>
          <span>Thanh toán: COD (tiền mặt khi nhận hàng)</span>
          <span>Phí ship 20.000đ · miễn phí từ 200.000đ</span>
          <a routerLink="/farms">Thông tin nhà bán và nguồn hàng</a>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="container">© 2026 FarmTable · Đồ án Phát triển Web kinh doanh nâng cao (BIE5061) · Dữ liệu đánh giá/đã bán là số liệu demo</div>
      </div>
    </footer>
  `,
})
export class FooterComponent {}
