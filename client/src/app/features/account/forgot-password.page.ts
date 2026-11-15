import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

const strongPassword = (c: AbstractControl): ValidationErrors | null => {
  const v = String(c.value || '');
  return v.length >= 8 && v.length <= 72 && /[A-Za-z]/.test(v) && /\d/.test(v) ? null : { weak: true };
};

/**
 * Quên mật khẩu 2 bước:
 *  1. Nhập email -> server gửi mã OTP 6 số (hiệu lực 10 phút) qua email.
 *  2. Nhập OTP + mật khẩu mới -> đổi mật khẩu, mọi phiên đăng nhập cũ bị hủy.
 */
@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container page auth-page">
      <div class="auth-card card">
        <h1>Quên mật khẩu</h1>
        @if (step() === 1) {
          <p class="muted">Nhập email đã đăng ký. Chúng tôi sẽ gửi mã xác nhận gồm 6 chữ số.</p>
          <form [formGroup]="emailForm" (ngSubmit)="sendCode()" class="form" novalidate>
            <label>Email
              <input class="input" type="email" formControlName="email" autocomplete="email" [attr.aria-invalid]="bad(emailForm.controls.email)" />
              @if (bad(emailForm.controls.email)) { <span class="field-error">Email không hợp lệ</span> }
            </label>
            @if (error()) { <div class="note note-danger" role="alert">{{ error() }}</div> }
            <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="loading()">{{ loading() ? 'Đang gửi...' : 'Gửi mã xác nhận' }}</button>
          </form>
        } @else {
          <div class="note note-success" role="status">{{ info() }}</div>
          <form [formGroup]="resetForm" (ngSubmit)="reset()" class="form" novalidate>
            <label>Mã xác nhận (6 số)
              <input class="input" formControlName="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" [attr.aria-invalid]="bad(resetForm.controls.otp) || !!fieldErrors()['otp']" />
              @if (fieldErrors()['otp'] || bad(resetForm.controls.otp)) { <span class="field-error">{{ fieldErrors()['otp'] || 'Mã gồm 6 chữ số' }}</span> }
            </label>
            <label>Mật khẩu mới
              <input class="input" type="password" formControlName="newPassword" autocomplete="new-password" [attr.aria-invalid]="bad(resetForm.controls.newPassword)" />
              @if (bad(resetForm.controls.newPassword)) { <span class="field-error">Mật khẩu dài 8–72 ký tự, có cả chữ và số</span> }
            </label>
            <label>Nhập lại mật khẩu mới
              <input class="input" type="password" formControlName="confirm" autocomplete="new-password" />
              @if (resetForm.controls.confirm.touched && resetForm.value.confirm !== resetForm.value.newPassword) { <span class="field-error">Mật khẩu nhập lại không khớp</span> }
            </label>
            @if (error()) { <div class="note note-danger" role="alert">{{ error() }}</div> }
            <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="loading()">{{ loading() ? 'Đang xử lý...' : 'Đặt lại mật khẩu' }}</button>
            <div class="row-between">
              <button type="button" class="btn btn-link btn-xs" (click)="step.set(1); error.set(null)">Đổi email</button>
              <button type="button" class="btn btn-link btn-xs" [disabled]="loading()" (click)="sendCode()">Gửi lại mã</button>
            </div>
          </form>
        }
        <p class="center"><a routerLink="/login">← Quay lại đăng nhập</a></p>
      </div>
    </div>
  `,
})
export class ForgotPasswordPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  protected step = signal<1 | 2>(1);
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected info = signal('');
  protected fieldErrors = signal<Record<string, string>>({});

  protected emailForm = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  protected resetForm = this.fb.nonNullable.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    newPassword: ['', [Validators.required, strongPassword]],
    confirm: ['', [Validators.required]],
  });

  bad(c: AbstractControl): boolean {
    return c.invalid && (c.touched || c.dirty);
  }

  async sendCode(): Promise<void> {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const r = await this.auth.forgotPassword(this.emailForm.getRawValue().email);
      this.info.set(r.message);
      this.step.set(2);
    } catch (e) {
      this.error.set(ApiError.from(e).message);
    } finally {
      this.loading.set(false);
    }
  }

  async reset(): Promise<void> {
    const f = this.resetForm.getRawValue();
    if (this.resetForm.invalid || f.confirm !== f.newPassword) {
      this.resetForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.fieldErrors.set({});
    try {
      await this.auth.resetPassword(this.emailForm.getRawValue().email, f.otp, f.newPassword);
      this.toast.success('Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.');
      await this.router.navigateByUrl('/login');
    } catch (e) {
      const err = ApiError.from(e);
      this.fieldErrors.set(err.fieldErrors());
      this.error.set(err.message);
    } finally {
      this.loading.set(false);
    }
  }
}
