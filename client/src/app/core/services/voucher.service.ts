import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API, toParams } from '../api';
import { AdminVoucher, Paged, PublicVoucher, VoucherInput, VoucherPreview } from '../models';

/** Mã giảm giá: CRUD cho admin + kiểm tra mã cho người mua. */
@Injectable({ providedIn: 'root' })
export class VoucherService {
  private http = inject(HttpClient);

  // ----- Admin (CRUD) -----
  list(params: { q?: string; status?: string; page?: number }): Observable<Paged<AdminVoucher>> {
    return this.http.get<Paged<AdminVoucher>>(`${API}/admin/vouchers`, { params: toParams(params) });
  }
  create(body: VoucherInput): Observable<AdminVoucher> {
    return this.http.post<AdminVoucher>(`${API}/admin/vouchers`, body);
  }
  update(id: string, body: Partial<VoucherInput>): Observable<AdminVoucher> {
    return this.http.patch<AdminVoucher>(`${API}/admin/vouchers/${id}`, body);
  }
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/admin/vouchers/${id}`);
  }

  // ----- Người mua -----
  available(): Observable<PublicVoucher[]> {
    return this.http.get<PublicVoucher[]>(`${API}/vouchers`);
  }
  check(code: string): Observable<VoucherPreview> {
    return this.http.post<VoucherPreview>(`${API}/vouchers/check`, { code });
  }
}

/** Mô tả ngắn gọn mức giảm của voucher. */
export function voucherLabel(v: PublicVoucher): string {
  const money = (n: number) => n.toLocaleString('vi-VN') + 'đ';
  const head = v.type === 'percent' ? `Giảm ${v.value}%` + (v.maxDiscount ? ` (tối đa ${money(v.maxDiscount)})` : '') : v.type === 'fixed' ? `Giảm ${money(v.value)}` : 'Miễn phí giao hàng';
  return v.minOrderValue ? `${head} · đơn từ ${money(v.minOrderValue)}` : head;
}
