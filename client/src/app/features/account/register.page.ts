import { Component, ElementRef, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { matchFields, strongPassword, vnPhone } from '../../shared/validators';

/** Đăng ký người mua hoặc nhà bán (Reactive Form + custom validator + cross-field validation). */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container page auth-page">
      <div class="auth-card card wide">
        <h1>Tạo tài khoản</h1>
        <div class="segmented" role="group" aria-label="Loại tài khoản">
          <button type="button" [attr.aria-pressed]="role() === 'buyer'" [class.active]="role() === 'buyer'" (click)="setRole('buyer')"><svg class="icon" aria-hidden="true"><use href="icons.svg#cart" /></svg> Tôi muốn mua</button>
          <button type="button" [attr.aria-pressed]="role() === 'vendor'" [class.active]="role() === 'vendor'" (click)="setRole('vendor')"><svg class="icon" aria-hidden="true"><use href="icons.svg#store" /></svg> Tôi muốn bán</button>
        </div>
        @if (role() === 'vendor') {
          <p class="note">Tài khoản nhà bán cần quản trị viên <b>duyệt</b> trước khi đăng sản phẩm. Bạn vẫn có thể đăng nhập và chuẩn bị hồ sơ nông trại.</p>
        }
        <form [formGroup]="form" (ngSubmit)="submit()" class="form" novalidate>
          <div class="form-row">
            <label>Họ tên *
              <input class="input" formControlName="name" [attr.aria-invalid]="!!err('name')" [attr.aria-describedby]="!!err('name') ? 'register-name-error' : null" autocomplete="name" />
              @if (err('name')) { <span id="register-name-error" class="field-error">{{ err('name') }}</span> }
            </label>
            <label>Số điện thoại
              <input class="input" formControlName="phone" [attr.aria-invalid]="!!err('phone')" [attr.aria-describedby]="!!err('phone') ? 'register-phone-error' : null" autocomplete="tel" inputmode="tel" />
              @if (err('phone')) { <span id="register-phone-error" class="field-error">{{ err('phone') }}</span> }
            </label>
          </div>
          <label>Email *
            <input class="input" type="email" formControlName="email" [attr.aria-invalid]="!!err('email')" [attr.aria-describedby]="!!err('email') ? 'register-email-error' : null" autocomplete="email" />
            @if (err('email')) { <span id="register-email-error" class="field-error">{{ err('email') }}</span> }
          </label>
          <div class="form-row">
            <label>Mật khẩu *
              <input class="input" type="password" formControlName="password" [attr.aria-invalid]="!!err('password')" [attr.aria-describedby]="!!err('password') ? 'register-password-error' : null" autocomplete="new-password" />
              @if (err('password')) { <span id="register-password-error" class="field-error">{{ err('password') }}</span> }
            </label>
            <label>Nhập lại mật khẩu *
              <input class="input" type="password" formControlName="confirm" autocomplete="new-password" [attr.aria-invalid]="form.controls.confirm.touched && (form.controls.confirm.invalid || form.hasError('mismatch'))" [attr.aria-describedby]="form.controls.confirm.touched && (form.controls.confirm.invalid || form.hasError('mismatch')) ? 'register-confirm-error' : null" />
              @if (form.controls.confirm.touched && (form.controls.confirm.invalid || form.hasError('mismatch'))) { <span id="register-confirm-error" class="field-error">{{ form.controls.confirm.invalid ? 'Nhập lại mật khẩu' : 'Mật khẩu nhập lại không khớp' }}</span> }
            </label>
          </div>
          @if (role() === 'vendor') {
            <div class="form-row">
              <label>Tên nông trại *
                <input class="input" formControlName="farmName" [attr.aria-invalid]="!!err('farmName')" [attr.aria-describedby]="!!err('farmName') ? 'register-farmName-error' : null" />
                @if (err('farmName')) { <span id="register-farmName-error" class="field-error">{{ err('farmName') }}</span> }
              </label>
              <label>Tỉnh/thành
                <input class="input" formControlName="province" placeholder="VD: Lâm Đồng" />
              </label>
            </div>
          }
          @if (error()) { <div class="note note-danger" role="alert">{{ error() }}</div> }
          <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="loading()">{{ loading() ? 'Đang tạo tài khoản...' : 'Đăng ký' }}</button>
        </form>
        <p class="center">Đã có tài khoản? <a routerLink="/login" [queryParams]="{ as: mode() || null }">Đăng nhập</a></p>
      </div>
    </div>
  `,
})
export class RegisterPage {
  readonly mode = input<string | undefined>(undefined, { alias: 'as' });
  /** Trang quay lại sau khi đăng ký (vd. /checkout khi khách đang có giỏ tạm). */
  readonly returnUrl = input<string | undefined>();
  private host: ElementRef<HTMLElement> = inject(ElementRef);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  protected role = signal<'buyer' | 'vendor'>('buyer');
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  private serverErrors = signal<Record<string, string>>({});

  protected form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
      phone: ['', [vnPhone]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, strongPassword]],
      confirm: ['', [Validators.required]],
      farmName: [''],
      province: [''],
    },
    { validators: matchFields('password', 'confirm') },
  );

  constructor() {
    effect(() => this.setRole(this.mode() === 'vendor' ? 'vendor' : 'buyer'));
  }

  setRole(role: 'buyer' | 'vendor'): void {
    this.role.set(role);
    const farm = this.form.controls.farmName;
    farm.setValidators(role === 'vendor' ? [Validators.required, Validators.minLength(3)] : []);
    farm.updateValueAndValidity();
  }

  /** Thông báo lỗi cho từng ô: ưu tiên lỗi từ server (VALIDATION_ERROR/EMAIL_TAKEN), sau đó lỗi phía client. */
  err(name: keyof typeof this.form.controls): string | null {
    const server = this.serverErrors()[name];
    if (server) return server;
    const c = this.form.controls[name];
    if (!c.errors || !(c.touched || c.dirty)) return null;
    if (c.errors['required']) return 'Bắt buộc nhập';
    if (c.errors['email']) return 'Email không hợp lệ';
    if (c.errors['minlength']) return `Tối thiểu ${c.errors['minlength'].requiredLength} ký tự`;
    if (c.errors['vnPhone']) return 'Số điện thoại không hợp lệ';
    if (c.errors['strongPassword']) return 'Mật khẩu 8–72 ký tự, có cả chữ và số';
    return 'Không hợp lệ';
  }

  async submit(): Promise<void> {
    this.serverErrors.set({});
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const invalid = this.host.nativeElement.querySelector<HTMLInputElement>('input.ng-invalid');
      const confirm = this.form.hasError('mismatch') ? this.host.nativeElement.querySelector<HTMLInputElement>('[formcontrolname="confirm"]') : null;
      (invalid || confirm)?.focus();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    try {
      const user = await this.auth.register({
        name: v.name,
        email: v.email,
        password: v.password,
        phone: v.phone || undefined,
        role: this.role(),
        farmName: this.role() === 'vendor' ? v.farmName : undefined,
        province: this.role() === 'vendor' ? v.province || undefined : undefined,
      });
      this.toast.success(user.role === 'vendor' ? 'Đăng ký thành công! Hồ sơ đang chờ duyệt.' : 'Chào mừng bạn đến FarmTable!');
      const merged = this.auth.lastCartMerge();
      if (merged) this.toast.info(`Đã chuyển ${merged} sản phẩm từ giỏ tạm vào giỏ hàng của bạn`);
      const back = this.returnUrl();
      // Chỉ chấp nhận đường dẫn nội bộ (chống open redirect); nhà bán luôn về kênh bán hàng.
      const target = user.role === 'buyer' && back && back.startsWith('/') && !back.startsWith('//') ? back : this.auth.homeFor(user);
      await this.router.navigateByUrl(target);
    } catch (e) {
      const err = ApiError.from(e);
      this.serverErrors.set(err.fieldErrors());
      this.error.set(err.message);
    } finally {
      this.loading.set(false);
    }
  }
}
