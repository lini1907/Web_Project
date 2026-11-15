import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API, toParams } from '../api';
import { AdminOrderDetail, AdminOrderPage, AdminVendor, AuditLog, Health, Kpi, Paged, PartStatus, User } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = `${API}/admin`;

  kpi(from?: string, to?: string): Observable<Kpi> {
    return this.http.get<Kpi>(`${this.base}/kpi`, { params: toParams({ from, to }) });
  }
  vendors(status?: string, q?: string): Observable<AdminVendor[]> {
    return this.http.get<AdminVendor[]>(`${this.base}/vendors`, { params: toParams({ status, q }) });
  }
  setVendorStatus(id: string, vendorStatus: string, reason?: string): Observable<User> {
    return this.http.patch<User>(`${this.base}/vendors/${id}`, { vendorStatus, reason });
  }
  users(params: { role?: string; status?: string; q?: string; page?: number }): Observable<Paged<User>> {
    return this.http.get<Paged<User>>(`${this.base}/users`, { params: toParams(params) });
  }
  setUserStatus(id: string, status: 'active' | 'locked', reason?: string): Observable<User> {
    return this.http.patch<User>(`${this.base}/users/${id}`, { status, reason });
  }
  orders(params: { status?: string; q?: string; page?: number; limit?: number; sort?: string; dir?: 'asc' | 'desc' }): Observable<AdminOrderPage> {
    return this.http.get<AdminOrderPage>(`${this.base}/orders`, { params: toParams(params) });
  }
  order(id: string): Observable<AdminOrderDetail> {
    return this.http.get<AdminOrderDetail>(`${this.base}/orders/${id}`);
  }
  /** Đổi trạng thái CẢ ĐƠN (mọi phần đơn chưa hủy). Hủy bắt buộc có lý do. */
  setOrderStatus(id: string, status: PartStatus, reason?: string): Observable<AdminOrderDetail> {
    return this.http.put<AdminOrderDetail>(`${this.base}/orders/${id}/status`, { status, reason });
  }
  auditLogs(page = 1): Observable<Paged<AuditLog>> {
    return this.http.get<Paged<AuditLog>>(`${this.base}/audit-logs`, { params: toParams({ page }) });
  }
  health(): Observable<Health> {
    return this.http.get<Health>(`${API}/health`);
  }
}
