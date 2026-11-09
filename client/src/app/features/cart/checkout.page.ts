import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError, newIdempotencyKey } from '../../core/api';
import { Cart } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { MoneyPipe } from '../../shared/pipes';
import { StateComponent } from '../../shared/ui';

/**
 * Thanh toán COD — dùng Template-driven Form (ngModel + validation trên template).
 * Nút đặt hàng bị khóa khi đang gửi; mỗi lần bấm có Idempotency-Key riêng để server chống tạo đơn trùng.
 */
@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink, MoneyPipe, StateComponent],
  template: `
    <div class="container page">
      <nav class="breadcrumb"><a routerLink="/cart">Giỏ hàng</a> › <span>Đặt hàng</span></nav>
      <h1>Đặt hàng</h1>
      @if (!auth.isBuyer()) {
        <app-state state="empty" emptyIcon="🏪" emptyText="Chỉ tài khoản người mua mới đặt hàng được." />
      } @else if (!cart()) {
        <app-state state="loading" />
      } @else if (!cart()!.items.length) {
        <app-state state="empty" emptyText="Giỏ hàng trống, chưa thể đặt hàng"><a routerLink="/shop" class="btn btn-primary">Mua sắm</a></app-state>
      } @else {
        @let c = cart()!;
        <form #f="ngForm" class="checkout-layout" (ngSubmit)="submit(f)" novalidate>
          <section class="card form">
            <h3>1. Thông tin nhận hàng</h3>
            <div class="form-row">
              <label>Họ tên người nhận *
                <input class="input" name="name" [(ngModel)]="model.name" required minlength="2" maxlength="80" #name="ngModel" autocomplete="name" />
                @if (name.invalid && (name.touched || f.submitted)) { <span class="field-error">Nhập họ tên (ít nhất 2 ký tự)</span> }
              </label>
              <label>Số điện thoại *
                <input class="input" name="phone" [(ngModel)]="model.phone" required pattern="^(\\+84|0)[0-9]{9,10}$" #phone="ngModel" autocomplete="tel" inputmode="tel" />
                @if (phone.invalid && (phone.touched || f.submitted)) { <span class="field-error">Số điện thoại không hợp lệ (vd 0901234567)</span> }
              </label>
            </div>
            <label>Địa chỉ giao hàng *
              <input class="input" name="address" [(ngModel)]="model.address" required minlength="10" maxlength="300" #address="ngModel" autocomplete="street-address" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" />
              @if (address.invalid && (address.touched || f.submitted)) { <span class="field-error">Địa chỉ cần ít nhất 10 ký tự</span> }
            </label>
            <label>Ghi chú cho nhà bán
              <textarea class="input" name="note" [(ngModel)]="model.note" maxlength="500" rows="2" placeholder="Giao giờ hành chính, gọi trước khi giao..."></textarea>
            </label>
            <label class="checkbox"><input type="checkbox" name="save" [(ngModel)]="model.saveAddress" /> Lưu địa chỉ này cho lần sau</label>

            <h3>2. Phương thức thanh toán</h3>
            <label class="pay-option active"><input type="radio" name="pay" checked /> <svg class="icon" aria-hidden="true"><use href="icons.svg#wallet" /></svg> Thanh toán khi nhận hàng (COD)</label>
            <label class="pay-option disabled" title="Chưa tích hợp cổng thanh toán"><input type="radio" name="pay" disabled /> 🏦 Chuyển khoản ngân hàng — <i>chưa hỗ trợ</i></label>
            <label class="pay-option disabled" title="Chưa tích hợp cổng thanh toán"><input type="radio" name="pay" disabled /> 📱 Ví MoMo — <i>chưa hỗ trợ</i></label>
          </section>

          <aside class="card summary">
            <h3>Đơn hàng ({{ c.itemCount }} món)</h3>
            @for (l of c.items; track l.id) {
              <div class="row-between small"><span class="line-clamp-1">{{ l.qty }} × {{ l.name }}</span><span>{{ l.lineTotal | money }}</span></div>
            }
            <hr />
            <div class="row-between"><span>Tạm tính</span><b>{{ c.subtotal | money }}</b></div>
            <div class="row-between"><span>Phí giao hàng</span><b>{{ c.shippingFee === 0 ? 'Miễn phí' : (c.shippingFee | money) }}</b></div>
            <div class="row-between total"><span>Tổng thanh toán</span><b>{{ c.total | money }}</b></div>
            @if (priceChanged()) {
              <div class="note note-danger">Giá hoặc phí ship vừa thay đổi. Tổng mới: <b>{{ c.total | money }}</b>. Vui lòng kiểm tra và bấm đặt hàng lại.</div>
            }
            @if (c.hasIssues) { <div class="field-error">Giỏ có sản phẩm không hợp lệ. <a routerLink="/cart">Quay lại giỏ hàng</a></div> }
            <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="submitting() || c.hasIssues">
              {{ submitting() ? 'Đang đặt hàng...' : 'Đặt hàng (COD)' }}
            </button>
            <p class="small muted">Bấm đặt hàng nghĩa là bạn đồng ý thanh toán {{ c.total | money }} khi nhận hàng.</p>
          </aside>
        </form>
      }
    </div>
  `,
})
export class CheckoutPage {
  protected auth = inject(AuthService);
  private cartService = inject(CartService);
  private orders = inject(OrderService);
  private toast = inject(ToastService);
  private router = inject(Router);

  protected cart = signal<Cart | null>(null);
  protected submitting = signal(false);
  protected priceChanged = signal(false);
  protected model = { name: '', phone: '', address: '', note: '', saveAddress: true };
  private idemKey = newIdempotencyKey();

  constructor() {
    const u = this.auth.user();
    if (u?.address) Object.assign(this.model, u.address);
    else if (u) Object.assign(this.model, { name: u.name, phone: u.phone });
    this.cartService.refresh().then((c) => this.cart.set(c), () => this.cart.set(null));
  }

  async submit(f: NgForm): Promise<void> {
    const c = this.cart();
    if (f.invalid || !c || this.submitting()) {
      f.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const shippingAddress = { name: this.model.name.trim(), phone: this.model.phone.trim(), address: this.model.address.trim() };
    this.orders.place({ shippingAddress, note: this.model.note.trim() || undefined, expectedTotal: c.total }, this.idemKey).subscribe({
      next: async (order) => {
        if (this.model.saveAddress) this.auth.updateProfile({ address: shippingAddress }).catch(() => undefined);
        await this.cartService.refresh().catch(() => undefined);
        this.toast.success(`Đặt hàng thành công! Mã đơn ${order.code}`);
        this.router.navigate(['/orders', order.id], { queryParams: { placed: 1 } });
      },
      error: async (e) => {
        const err = ApiError.from(e);
        this.submitting.set(false);
        // Lỗi nghiệp vụ (4xx) chắc chắn chưa tạo đơn => dùng khóa mới. Lỗi mạng/5xx giữ khóa cũ để bấm lại không tạo đơn trùng.
        if (err.status >= 400 && err.status < 500) this.idemKey = newIdempotencyKey();
        if (err.code === 'PRICE_CHANGED') {
          this.priceChanged.set(true);
          this.cart.set(await this.cartService.refresh());
        } else if (err.code === 'OUT_OF_STOCK' || err.code === 'RESCUE_EXPIRED') {
          this.toast.error(err.message);
          this.cart.set(await this.cartService.refresh());
        } else {
          this.toast.error(err.message);
        }
      },
    });
  }
}
