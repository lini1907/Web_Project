import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API, toParams } from '../api';
import { Address, GroupBuy, MyGroupBuy, Order, Paged } from '../models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);

  /** Đặt hàng COD. expectedTotal = tổng tiền buyer đang thấy; server tính lại và báo PRICE_CHANGED nếu lệch. */
  place(body: { shippingAddress: Address; note?: string; expectedTotal: number }, idempotencyKey: string): Observable<Order> {
    return this.http.post<Order>(`${API}/orders`, body, { headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) });
  }
  list(page = 1, status?: string): Observable<Paged<Order>> {
    return this.http.get<Paged<Order>>(`${API}/orders`, { params: toParams({ page, status, limit: 10 }) });
  }
  get(id: string): Observable<Order> {
    return this.http.get<Order>(`${API}/orders/${id}`);
  }
  cancel(id: string): Observable<Order> {
    return this.http.post<Order>(`${API}/orders/${id}/cancel`, {});
  }

  // ----- Mua chung -----
  joinGroupBuy(id: string, body: { qty: number; shippingAddress: Address }, idempotencyKey: string): Observable<GroupBuy> {
    return this.http.post<GroupBuy>(`${API}/group-buys/${id}/join`, body, { headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) });
  }
  withdrawGroupBuy(id: string): Observable<GroupBuy> {
    return this.http.delete<GroupBuy>(`${API}/group-buys/${id}/join`);
  }
  myGroupBuys(): Observable<MyGroupBuy[]> {
    return this.http.get<MyGroupBuy[]>(`${API}/me/group-buys`);
  }
}
