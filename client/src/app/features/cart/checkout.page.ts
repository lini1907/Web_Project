import { Component, ElementRef, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError, newIdempotencyKey } from '../../core/api';
import { Cart, DELIVERY_WINDOW_LABELS, DeliveryWindow, PaymentMethod, PublicVoucher, VoucherPreview } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { VoucherService, voucherLabel } from '../../core/services/voucher.service';
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

            <h2>Thời gian nhận hàng</h2>
            <div class="form-row">
              <label>Ngày nhận
                <select class="input" name="slotDate" [(ngModel)]="model.slotDate">
                  <option value="">Sớm nhất có thể</option>
                  @for (d of slotDays; track d.value) { <option [value]="d.value">{{ d.label }}</option> }
                </select>
              </label>
              <label>Khung giờ
                <select class="input" name="slotWindow" [(ngModel)]="model.slotWindow" [disabled]="!model.slotDate">
                  @for (w of windows; track w.value) { <option [value]="w.value">{{ w.label }}</option> }
                </select>
              </label>
            </div>

            <h2>Phương thức thanh toán</h2>
            @for (m of payOptions; track m.value) {
              <label class="pay-option" [class.active]="model.paymentMethod === m.value" [class.disabled]="!methods()[m.value]" [title]="methods()[m.value] ? '' : 'Máy chủ chưa cấu hình cổng thanh toán này'">
                <input type="radio" name="pay" [value]="m.value" [(ngModel)]="model.paymentMethod" [attr.disabled]="methods()[m.value] ? null : ''" />
                <svg class="icon" aria-hidden="true"><use href="icons.svg#wallet" /></svg> {{ m.label }}
                @if (!methods()[m.value]) { — <i>chưa bật</i> }
              </label>
            }
            @if (model.paymentMethod !== 'cod') { <p class="small muted">Sau khi đặt, bạn được chuyển sang trang {{ model.paymentMethod === 'vnpay' ? 'VNPay' : 'MoMo' }} để thanh toán. Đơn chỉ được nhà bán xác nhận khi đã thanh toán.</p> }
          </section>

          <aside class="card summary">
            <h2>Đơn hàng ({{ c.itemCount }} món)</h2>
            @for (l of c.items; track l.id) {
              <div class="checkout-item"><div><b>{{ l.name }}</b><span class="muted small">{{ l.qty }} {{ l.unit }} × {{ l.unitPrice | money }}</span></div><strong>{{ l.lineTotal | money }}</strong></div>
            }
            <hr />
            <div class="row-between"><span>Tạm tính</span><b>{{ c.subtotal | money }}</b></div>
            <div class="row-between"><span>Phí giao hàng</span><b>{{ c.shippingFee === 0 ? 'Miễn phí' : (c.shippingFee | money) }}</b></div>
            <div class="voucher-box">
              @if (applied(); as a) {
                <div class="row-between"><span>Mã <b>{{ a.voucher.code }}</b> <button type="button" class="btn btn-link btn-xs" (click)="removeVoucher()">Bỏ mã</button></span><b class="text-green">−{{ a.discount | money }}</b></div>
              } @else {
                <div class="input-group">
                  <input class="input" name="voucher" [(ngModel)]="voucherCode" placeholder="Nhập mã giảm giá" maxlength="30" aria-label="Mã giảm giá" style="text-transform: uppercase" (keydown.enter)="$event.preventDefault(); applyVoucher()" />
                  <button type="button" class="btn btn-outline" [disabled]="checking() || !voucherCode.trim()" (click)="applyVoucher()">{{ checking() ? '...' : 'Áp dụng' }}</button>
                </div>
                @if (voucherError()) { <span class="field-error" role="alert">{{ voucherError() }}</span> }
                @if (available().length) {
                  <details class="small"><summary>Mã đang có ({{ available().length }})</summary>
                    @for (v of available(); track v.code) {
                      <button type="button" class="voucher-chip" (click)="voucherCode = v.code; applyVoucher()" [disabled]="c.subtotal < v.minOrderValue">
                        <b>{{ v.code }}</b> <span>{{ label(v) }}</span>
                      </button>
                    }
                  </details>
                }
              }
            </div>
            <div class="row-between total"><span>Tổng thanh toán</span><b>{{ payable() | money }}</b></div>
            @if (priceChanged()) {
              <div class="note note-danger" role="alert" tabindex="-1" data-submit-error>Giá hoặc phí ship vừa thay đổi. Tổng mới: <b>{{ c.total | money }}</b>. Vui lòng kiểm tra và bấm đặt hàng lại.</div>
            }
            @if (submitError()) { <div class="note note-danger" role="alert" tabindex="-1" data-submit-error>{{ submitError() }}</div> }
            @if (c.hasIssues) { <div class="field-error">Giỏ có sản phẩm không hợp lệ. <a routerLink="/cart">Quay lại giỏ hàng</a></div> }
            <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="submitting() || c.hasIssues">
              {{ submitting() ? 'Đang xác nhận đơn...' : model.paymentMethod === 'cod' ? 'Đặt hàng (COD)' : 'Đặt hàng và thanh toán' }}
            </button>
            <p class="small muted">Bấm đặt hàng nghĩa là bạn đồng ý thanh toán {{ payable() | money }}{{ model.paymentMethod === 'cod' ? ' khi nhận hàng' : ' trực tuyến' }}.</p>
            <p class="small muted">Lịch giao sẽ cần được xác nhận với nhà bán. Bạn có thể hủy khi nhà bán chưa xác nhận đơn.</p>
          </aside>
        </form>
      }
    </div>
  `,
  styles: [
    `
      .voucher-box { margin: 8px 0; display: grid; gap: 6px; }
      .voucher-chip { display: block; width: 100%; text-align: left; margin-top: 6px; padding: 6px 8px; border: 1px dashed var(--green, #16a34a); border-radius: 6px; background: #f0fdf4; cursor: pointer; font: inherit; }
      .voucher-chip:disabled { opacity: 0.5; cursor: not-allowed; }
      .voucher-chip span { color: var(--muted); }
      .text-green { color: var(--green-600, #15803d); }
    `,
  ],
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
  protected model = { name: '', phone: '', address: '', note: '', saveAddress: true, paymentMethod: 'cod' as PaymentMethod, slotDate: '', slotWindow: 'morning' as DeliveryWindow };
  protected methods = signal<Record<PaymentMethod, boolean>>({ cod: true, vnpay: false, momo: false });
  protected payOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'cod', label: 'Thanh toán khi nhận hàng (COD)' },
    { value: 'vnpay', label: 'VNPay (thẻ ATM, QR ngân hàng)' },
    { value: 'momo', label: 'Ví MoMo' },
  ];
  protected windows = (Object.keys(DELIVERY_WINDOW_LABELS) as DeliveryWindow[]).map((value) => ({ value, label: DELIVERY_WINDOW_LABELS[value] }));
  /** Ngày nhận: từ ngày mai đến 7 ngày tới (giờ Việt Nam). */
  protected slotDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + 7 * 3600e3 + (i + 1) * 86400e3);
    const value = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC' });
    return { value, label };
  });
  private idemKey = newIdempotencyKey();
  private vouchers = inject(VoucherService);
  protected voucherCode = '';
  protected applied = signal<VoucherPreview | null>(null);
  protected checking = signal(false);
  protected voucherError = signal<string | null>(null);
  protected available = signal<PublicVoucher[]>([]);
  protected label = voucherLabel;
  /** Số tiền phải trả sau giảm giá (server vẫn tính lại khi đặt). */
  protected payable = () => {
    const c = this.cart();
    return c ? c.total - (this.applied()?.discount || 0) : 0;
  };

  constructor() {
    const u = this.auth.user();
    if (u?.address) Object.assign(this.model, u.address);
    else if (u) Object.assign(this.model, { name: u.name, phone: u.phone });
    void this.loadCart();
    this.vouchers.available().subscribe({ next: (list) => this.available.set(list), error: () => undefined });
    this.orders.paymentMethods().subscribe({ next: (m) => this.methods.set(m), error: () => undefined });
  }

  applyVoucher(): void {
    const code = this.voucherCode.trim();
    if (!code || this.checking()) return;
    this.checking.set(true);
    this.voucherError.set(null);
    this.vouchers.check(code).subscribe({
      next: (r) => {
        this.checking.set(false);
        this.applied.set(r);
        this.toast.success(`Đã áp dụng mã ${r.voucher.code}: giảm ${r.discount.toLocaleString('vi-VN')}đ`);
      },
      error: (e) => {
        this.checking.set(false);
        this.applied.set(null);
        this.voucherError.set(ApiError.from(e).message);
      },
    });
  }

  removeVoucher(): void {
    this.applied.set(null);
    this.voucherCode = '';
    this.voucherError.set(null);
  }

  /** Giỏ thay đổi (giá/phí ship) thì kiểm tra lại mã đang áp. */
  private recheckVoucher(): void {
    const a = this.applied();
    if (!a) return;
    this.voucherCode = a.voucher.code;
    this.applied.set(null);
    this.applyVoucher();
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
    this.orders.place(
      {
        shippingAddress,
        note: this.model.note.trim() || undefined,
        expectedTotal: c.total,
        voucherCode: this.applied()?.voucher.code,
        paymentMethod: this.model.paymentMethod,
        deliverySlot: this.model.slotDate ? { date: this.model.slotDate, window: this.model.slotWindow } : undefined,
      },
      this.idemKey,
    ).subscribe({
      next: async (order) => {
        if (this.model.saveAddress) this.auth.updateProfile({ address: shippingAddress }).catch(() => undefined);
        await this.cartService.refresh().catch(() => undefined);
        this.toast.success(`Đặt hàng thành công! Mã đơn ${order.code}`);
        if (order.paymentMethod !== 'cod') {
          // Chuyển sang cổng thanh toán; lỗi tạo link thì về trang đơn để thanh toán lại.
          this.orders.pay(order.id).subscribe({
            next: (r) => (window.location.href = r.payUrl),
            error: (e) => {
              this.toast.error(ApiError.from(e).message);
              this.router.navigate(['/orders', order.id], { queryParams: { placed: 1 } });
            },
          });
          return;
        }
        this.router.navigate(['/orders', order.id], { queryParams: { placed: 1 } });
      },
      error: async (e) => {
        const err = ApiError.from(e);
        this.submitting.set(false);
        this.submitError.set(err.code === 'PRICE_CHANGED' ? null : err.status === 0 ? 'Chưa xác nhận được kết quả đặt hàng. Bạn có thể thử lại; hệ thống sẽ kiểm tra để tránh tạo đơn trùng.' : err.message);
        requestAnimationFrame(() => this.host.nativeElement.querySelector<HTMLElement>('[data-submit-error]')?.focus());
        // Lỗi nghiệp vụ (4xx) chắc chắn chưa tạo đơn => dùng khóa mới. Lỗi mạng/5xx giữ khóa cũ để bấm lại không tạo đơn trùng.
        if (err.status >= 400 && err.status < 500) this.idemKey = newIdempotencyKey();
        if (err.code.startsWith('VOUCHER_')) {
          this.applied.set(null);
          this.voucherError.set(err.message);
        }
        if (err.code === 'PRICE_CHANGED') {
          this.priceChanged.set(true);
          await this.loadCart();
          this.recheckVoucher();
        } else if (err.code === 'OUT_OF_STOCK' || err.code === 'RESCUE_EXPIRED') {
          await this.loadCart();
        }
      },
    });
  }
}
