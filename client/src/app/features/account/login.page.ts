import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

/** Đăng nhập chung cho người mua / nhà bán / quản trị (Reactive Form). Phiên lưu ở cookie HttpOnly. */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container page auth-page">
      <div class="auth-card card">
        <h1>{{ mode() === 'vendor' ? '🏪 Đăng nhập nhà bán' : 'Đăng nhập' }}</h1>
        <p class="muted">Dùng chung một trang cho người mua, nhà bán và quản trị viên.</p>
        <form [formGroup]="form" (ngSubmit)="submit()" class="form" novalidate>
          <label>Email
            <input class="input" type="email" formControlName="email" autocomplete="email" [class.invalid]="invalid('email')" />
            @if (invalid('email')) { <span class="field-error">Email không hợp lệ</span> }
          </label>
          <label>Mật khẩu
            <div class="input-group">
              <input class="input" [type]="show() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" [class.invalid]="invalid('password')" />
              <button type="button" class="btn btn-link" (click)="show.set(!show())">{{ show() ? 'Ẩn' : 'Hiện' }}</button>
            </div>
            @if (invalid('password')) { <span class="field-error">Nhập mật khẩu</span> }
          </label>
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
})
export class LoginPage {
  readonly mode = input<string | undefined>(undefined, { alias: 'as' });
  readonly returnUrl = input<string | undefined>();
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
