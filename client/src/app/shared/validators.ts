import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Custom validator: số điện thoại Việt Nam (0xxxxxxxxx hoặc +84xxxxxxxxx). */
export function vnPhone(control: AbstractControl): ValidationErrors | null {
  const v = String(control.value ?? '').replace(/[\s.-]/g, '');
  if (!v) return null;
  return /^(\+84|0)\d{9,10}$/.test(v) ? null : { vnPhone: true };
}

/** Custom validator: mật khẩu có cả chữ và số, 8–72 ký tự (khớp quy tắc server). */
export function strongPassword(control: AbstractControl): ValidationErrors | null {
  const v = String(control.value ?? '');
  if (!v) return null;
  const errors: ValidationErrors = {};
  if (v.length < 8 || v.length > 72) errors['length'] = true;
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) errors['mix'] = true;
  return Object.keys(errors).length ? { strongPassword: errors } : null;
}

/** Cross-field validator: hai field phải giống nhau (vd: xác nhận mật khẩu). */
export function matchFields(a: string, b: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const va = group.get(a)?.value;
    const vb = group.get(b)?.value;
    return va && vb && va !== vb ? { mismatch: true } : null;
  };
}

/** Cross-field validator: field `lower` phải <= field `upper` (vd: ngưỡng <= số lượng tối đa, giá từ <= giá đến). */
export function lessOrEqual(lower: string, upper: string, key = 'order'): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const lo = Number(group.get(lower)?.value);
    const hi = Number(group.get(upper)?.value);
    return Number.isFinite(lo) && Number.isFinite(hi) && lo > hi ? { [key]: true } : null;
  };
}

/** Custom validator: thời điểm phải sau hiện tại ít nhất `minutes` phút. */
export function futureAtLeast(minutes: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const t = new Date(control.value).getTime();
    return Number.isFinite(t) && t >= Date.now() + minutes * 60000 ? null : { future: { minutes } };
  };
}
