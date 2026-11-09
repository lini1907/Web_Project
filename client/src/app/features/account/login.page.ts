import { Component, ElementRef, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

const OAUTH_ERRORS: Record<string, string> = {
  google_disabled: 'Máy chủ chưa cấu hình đăng nhập Google.',
  google_cancelled: 'Bạn đã hủy đăng nhập Google.',
  google_state: 'Phiên đăng nhập Google không hợp lệ, vui lòng thử lại.',
  google_unverified: 'Email Google chưa được xác minh.',
  google_failed: 'Không lấy được thông tin từ Google, vui lòng thử lại.',
  locked: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
};

/** Đăng nhập chung cho người mua / nhà bán / quản trị (Reactive Form). Phiên lưu ở cookie HttpOnly. */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container page auth-page">
      <div class="auth-card card">
        <h1>{{ mode() === 'vendor' ? 'Đăng nhập nhà bán' : 'Đăng nhập' }}</h1>
        <p class="muted">Đăng nhập để lưu giỏ hàng và theo dõi đơn nông sản của bạn.</p>
        <form [formGroup]="form" (ngSubmit)="submit()" class="form" novalidate>
          <label>Email
            <input class="input" type="email" formControlName="email" [attr.aria-invalid]="invalid('email')" [attr.aria-describedby]="invalid('email') ? 'login-email-error' : null" autocomplete="email" [class.invalid]="invalid('email')" />
            @if (invalid('email')) { <span id="login-email-error" class="field-error">Email không hợp lệ</span> }
          </label>
          <label>Mật khẩu
            <div class="input-group">
              <input class="input" [type]="show() ? 'text' : 'password'" formControlName="password" [attr.aria-invalid]="invalid('password')" [attr.aria-describedby]="invalid('password') ? 'login-password-error' : null" autocomplete="current-password" [class.invalid]="invalid('password')" />
              <button type="button" class="btn btn-link" (click)="show.set(!show())">{{ show() ? 'Ẩn' : 'Hiện' }}</button>
            </div>
            @if (invalid('password')) { <span id="login-password-error" class="field-error">Nhập mật khẩu</span> }
          </label>
          <a routerLink="/forgot-password" class="small">Quên mật khẩu?</a>
          <div class="row-between">
            <label class="checkbox"><input type="checkbox" formControlName="remember" /> Ghi nhớ đăng nhập (30 ngày)</label>
            @if (rememberedEmail()) {
              <button type="button" class="btn btn-link btn-xs" (click)="forget()">Không phải {{ rememberedEmail() }}?</button>
            }
          </div>
          <p class="small muted">Không tick: phiên đăng nhập kết thúc khi đóng trình duyệt. Trình duyệt chỉ lưu email, không lưu mật khẩu.</p>
          @if (error()) { <div class="note note-danger" role="alert">{{ error() }}</div> }
          <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="loading()">{{ loading() ? 'Đang đăng nhập...' : 'Đăng nhập' }}</button>
        </form>
        @if (googleOn()) {
          <div class="or-line"><span>hoặc</span></div>
          <a class="btn btn-outline btn-block btn-lg google-btn" [href]="googleUrl()">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Đăng nhập bằng Google
          </a>
        }
        <p class="center">Chưa có tài khoản?
          <a routerLink="/register" [queryParams]="{ as: mode() || null, returnUrl: returnUrl() || null }">Đăng ký {{ mode() === 'vendor' ? 'bán hàng' : 'ngay' }}</a>
        </p>
        <details class="demo-accounts">
          <summary>Tài khoản demo (dữ liệu seed)</summary>
          <p class="small">Mật khẩu chung xem trong <code>server/.env</code> (biến <code>SEED_DEMO_PASSWORD</code>).</p>
          <div class="row-gap wrap">
            <button type="button" class="btn btn-outline btn-sm" (click)="fill('bich.tran@example.com')">Người mua</button>
            <button type="button" class="btn btn-outline btn-sm" (click)="fill('dalatxanh@farmtable.vn')">Nhà bán</button>
            <button type="button" class="btn btn-outline btn-sm" (click)="fill('admin@farmtable.vn')">Quản trị</button>
          </div>
        </details>
      </div>
    </div>
  `,
  styles: [
    `
      .or-line { display: flex; align-items: center; gap: 10px; color: var(--muted); margin: 14px 0; font-size: 0.85rem; }
      .or-line::before, .or-line::after { content: ''; flex: 1; border-top: 1px solid var(--border); }
      .google-btn { display: flex; align-items: center; justify-content: center; gap: 10px; }
    `,
  ],
})
export class LoginPage {
  readonly mode = input<string | undefined>(undefined, { alias: 'as' });
  readonly returnUrl = input<string | undefined>();
  /** ?error=... khi đăng nhập Google không thành công. */
  readonly oauthError = input<string | undefined>(undefined, { alias: 'error' });
  protected googleOn = signal(false);
  protected googleUrl = () => '/api/v1/auth/google' + (this.returnUrl() ? '?returnUrl=' + encodeURIComponent(this.returnUrl()!) : '');
  private host: ElementRef<HTMLElement> = inject(ElementRef);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  protected form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    remember: [false],
  });
  protected rememberedEmail = signal<string | null>(null);
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected show = signal(false);

  constructor() {
    void this.prefill();
    this.auth.providers().then((p) => this.googleOn.set(p.google)).catch(() => undefined);
    effect(() => {
      const code = this.oauthError();
      if (code) this.error.set(OAUTH_ERRORS[code] || 'Đăng nhập Google không thành công');
    });
  }

  invalid(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  /** Điền sẵn email đã ghi nhớ (cookie remember_email do server đặt). */
  private async prefill(): Promise<void> {
    const email = await this.auth.rememberedEmail();
    if (!email) return;
    this.rememberedEmail.set(email);
    if (!this.form.controls.email.value) this.form.patchValue({ email, remember: true });
  }

  async forget(): Promise<void> {
    await this.auth.forgetRemembered().catch(() => undefined);
    this.rememberedEmail.set(null);
    this.form.patchValue({ email: '', remember: false });
  }

  fill(email: string): void {
    this.form.patchValue({ email });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLInputElement>('input.ng-invalid')?.focus();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const { email, password, remember } = this.form.getRawValue();
      const user = await this.auth.login(email, password, remember);
      this.toast.success(`Xin chào ${user.name}!`);
      const merged = this.auth.lastCartMerge();
      if (merged) this.toast.info(`Đã chuyển ${merged} sản phẩm từ giỏ tạm vào giỏ hàng của bạn`);
      const back = this.returnUrl();
      // Chỉ chấp nhận đường dẫn nội bộ để tránh open redirect.
      const target = back && back.startsWith('/') && !back.startsWith('//') && !back.startsWith('/login') ? back : this.auth.homeFor(user);
      await this.router.navigateByUrl(target);
    } catch (e) {
      const err = ApiError.from(e);
      this.error.set(err.message);
    } finally {
      this.loading.set(false);
    }
  }
}
