import { Component, ElementRef, inject, signal } from '@angular/core';
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
        <app-state state="empty" emptyIcon="store" emptyText="Chỉ tài khoản người mua mới đặt hàng được." />
      } @else if (loadError()) {
        <app-state state="error" [errorText]="loadError()" (retry)="loadCart()" />
      } @else if (!cart()) {
        <app-state state="loading" />
      } @else if (!cart()!.items.length) {
        <app-state state="empty" emptyText="Giỏ hàng trống, chưa thể đặt hàng"><a routerLink="/shop" class="btn btn-primary">Mua sắm</a></app-state>
      } @else {
        @let c = cart()!;
        <form #f="ngForm" class="checkout-layout" (ngSubmit)="submit(f)" novalidate>
          <section class="card form">
            <h2>Thông tin nhận hàng</h2>
            <div class="form-row">
              <label>Họ tên người nhận *
                <input class="input" name="name" [(ngModel)]="model.name" required minlength="2" maxlength="80" #name="ngModel" autocomplete="name" [attr.aria-invalid]="name.invalid && (name.touched || f.submitted)" [attr.aria-describedby]="name.invalid && (name.touched || f.submitted) ? 'shipping-name-error' : null" />
                @if (name.invalid && (name.touched || f.submitted)) { <span id="shipping-name-error" class="field-error">Nhập họ tên (ít nhất 2 ký tự)</span> }
              </label>
              <label>Số điện thoại *
                <input class="input" name="phone" [(ngModel)]="model.phone" required pattern="^(\\+84|0)[0-9]{9,10}$" #phone="ngModel" autocomplete="tel" inputmode="tel" [attr.aria-invalid]="phone.invalid && (phone.touched || f.submitted)" [attr.aria-describedby]="phone.invalid && (phone.touched || f.submitted) ? 'shipping-phone-error' : null" />
                @if (phone.invalid && (phone.touched || f.submitted)) { <span id="shipping-phone-error" class="field-error">Số điện thoại không hợp lệ (vd 0901234567)</span> }
              </label>
            </div>
            <label>Địa chỉ giao hàng *
              <input class="input" name="address" [(ngModel)]="model.address" required minlength="10" maxlength="300" #address="ngModel" autocomplete="street-address" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" [attr.aria-invalid]="address.invalid && (address.touched || f.submitted)" [attr.aria-describedby]="address.invalid && (address.touched || f.submitted) ? 'shipping-address-error' : null" />
              @if (address.invalid && (address.touched || f.submitted)) { <span id="shipping-address-error" class="field-error">Địa chỉ cần ít nhất 10 ký tự</span> }
            </label>
            <label>Ghi chú cho nhà bán
              <textarea class="input" name="note" [(ngModel)]="model.note" maxlength="500" rows="2" placeholder="Giao giờ hành chính, gọi trước khi giao..."></textarea>
            </label>
            <label class="checkbox"><input type="checkbox" name="save" [(ngModel)]="model.saveAddress" /> Lưu địa chỉ này cho lần sau</label>

            <h2>Phương thức thanh toán</h2>
            <label class="pay-option active"><input type="radio" name="pay" checked /> <svg class="icon" aria-hidden="true"><use href="icons.svg#wallet" /></svg> Thanh toán khi nhận hàng (COD)</label>
            <label class="pay-option disabled" title="Chưa tích hợp cổng thanh toán"><input type="radio" name="pay" disabled /> <svg class="icon" aria-hidden="true"><use href="icons.svg#wallet" /></svg> Chuyển khoản ngân hàng — <i>chưa hỗ trợ</i></label>
            <label class="pay-option disabled" title="Chưa tích hợp cổng thanh toán"><input type="radio" name="pay" disabled /> <svg class="icon" aria-hidden="true"><use href="icons.svg#wallet" /></svg> Ví MoMo — <i>chưa hỗ trợ</i></label>
          </section>

          <aside class="card summary">
            <h2>Đơn hàng ({{ c.itemCount }} món)</h2>
            @for (l of c.items; track l.id) {
              <div class="checkout-item"><div><b>{{ l.name }}</b><span class="muted small">{{ l.qty }} {{ l.unit }} × {{ l.unitPrice | money }}</span></div><strong>{{ l.lineTotal | money }}</strong></div>
            }
            <hr />
            <div class="row-between"><span>Tạm tính</span><b>{{ c.subtotal | money }}</b></div>
            <div class="row-between"><span>Phí giao hàng</span><b>{{ c.shippingFee === 0 ? 'Miễn phí' : (c.shippingFee | money) }}</b></div>
            <div class="row-between total"><span>Tổng thanh toán</span><b>{{ c.total | money }}</b></div>
            @if (priceChanged()) {
              <div class="note note-danger" role="alert" tabindex="-1" data-submit-error>Giá hoặc phí ship vừa thay đổi. Tổng mới: <b>{{ c.total | money }}</b>. Vui lòng kiểm tra và bấm đặt hàng lại.</div>
            }
            @if (submitError()) { <div class="note note-danger" role="alert" tabindex="-1" data-submit-error>{{ submitError() }}</div> }
            @if (c.hasIssues) { <div class="field-error">Giỏ có sản phẩm không hợp lệ. <a routerLink="/cart">Quay lại giỏ hàng</a></div> }
            <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="submitting() || c.hasIssues">
              {{ submitting() ? 'Đang xác nhận đơn...' : 'Đặt hàng (COD)' }}
            </button>
            <p class="small muted">Bấm đặt hàng nghĩa là bạn đồng ý thanh toán {{ c.total | money }} khi nhận hàng.</p>
            <p class="small muted">Lịch giao sẽ cần được xác nhận với nhà bán. Bạn có thể hủy khi nhà bán chưa xác nhận đơn.</p>
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

  private host: ElementRef<HTMLElement> = inject(ElementRef);
  protected loadError = signal<string | null>(null);
  protected cart = signal<Cart | null>(null);
  protected submitting = signal(false);
  protected priceChanged = signal(false);
  protected submitError = signal<string | null>(null);
  protected model = { name: '', phone: '', address: '', note: '', saveAddress: true };
  private idemKey = newIdempotencyKey();

  constructor() {
    const u = this.auth.user();
    if (u?.address) Object.assign(this.model, u.address);
    else if (u) Object.assign(this.model, { name: u.name, phone: u.phone });
    void this.loadCart();
  }

  async loadCart(): Promise<void> {
    this.loadError.set(null);
    try {
      this.cart.set(await this.cartService.refresh());
    } catch (e) {
      this.loadError.set(ApiError.from(e).message);
    }
  }

  async submit(f: NgForm): Promise<void> {
    const c = this.cart();
    if (f.invalid || !c || this.submitting()) {
      f.form.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('input.ng-invalid, textarea.ng-invalid')?.focus();
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    this.priceChanged.set(false);
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
        this.submitError.set(err.code === 'PRICE_CHANGED' ? null : err.status === 0 ? 'Chưa xác nhận được kết quả đặt hàng. Bạn có thể thử lại; hệ thống sẽ kiểm tra để tránh tạo đơn trùng.' : err.message);
        requestAnimationFrame(() => this.host.nativeElement.querySelector<HTMLElement>('[data-submit-error]')?.focus());
        // Lỗi nghiệp vụ (4xx) chắc chắn chưa tạo đơn => dùng khóa mới. Lỗi mạng/5xx giữ khóa cũ để bấm lại không tạo đơn trùng.
        if (err.status >= 400 && err.status < 500) this.idemKey = newIdempotencyKey();
        if (err.code === 'PRICE_CHANGED') {
          this.priceChanged.set(true);
          await this.loadCart();
        } else if (err.code === 'OUT_OF_STOCK' || err.code === 'RESCUE_EXPIRED') {
          await this.loadCart();
        }
      },
    });
  }
}
