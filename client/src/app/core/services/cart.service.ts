import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API } from '../api';
import { Cart } from '../models';
import { AuthService } from './auth.service';

/** Giỏ hàng lưu ở server, gắn với tài khoản buyer. Service giữ bản sao trong signal để header hiển thị số lượng. */
@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  readonly cart = signal<Cart | null>(null);
  readonly count = computed(() => this.cart()?.itemCount ?? 0);

  constructor() {
    // Đăng nhập buyer => tải giỏ; đăng xuất => xóa giỏ phía client.
    effect(() => {
      if (this.auth.isBuyer()) this.refresh().catch(() => undefined);
      else this.cart.set(null);
    });
  }

  async refresh(): Promise<Cart> {
    const c = await firstValueFrom(this.http.get<Cart>(`${API}/cart`));
    this.cart.set(c);
    return c;
  }

  async addProduct(productId: string, qty = 1): Promise<Cart> {
    const c = await firstValueFrom(this.http.post<Cart>(`${API}/cart/items`, { productId, qty }));
    this.cart.set(c);
    return c;
  }

  async addBox(boxId: string, qty = 1): Promise<Cart> {
    const c = await firstValueFrom(this.http.post<Cart>(`${API}/cart/items`, { boxId, qty }));
    this.cart.set(c);
    return c;
  }

  async setQty(itemId: string, qty: number): Promise<Cart> {
    const c = await firstValueFrom(this.http.patch<Cart>(`${API}/cart/items/${itemId}`, { qty }));
    this.cart.set(c);
    return c;
  }

  async clear(): Promise<Cart> {
    const c = await firstValueFrom(this.http.delete<Cart>(`${API}/cart`));
    this.cart.set(c);
    return c;
  }
}
