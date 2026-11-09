import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError } from '../api';
import { AuthService } from './auth.service';
import { CartService } from './cart.service';
import { CatalogService } from './catalog.service';
import { ToastService } from './toast.service';

/** Hành động mua hàng dùng chung (thẻ sản phẩm, trang chi tiết, Rescue, Mystery Box, gợi ý). */
@Injectable({ providedIn: 'root' })
export class ShopActions {
  private auth = inject(AuthService);
  private cart = inject(CartService);
  private catalog = inject(CatalogService);
  private toast = inject(ToastService);
  private router = inject(Router);

  /** id đang được thêm (để khóa nút, tránh bấm liên tục). */
  readonly busyId = signal<string | null>(null);

  /** Khách chưa đăng nhập vẫn thêm được vào giỏ tạm (session); chỉ chặn tài khoản nhà bán/quản trị. */
  private ensureBuyer(): boolean {
    if (this.auth.isLoggedIn() && !this.auth.isBuyer()) {
      this.toast.error('Tài khoản nhà bán/quản trị không thể đặt hàng. Hãy dùng tài khoản người mua.');
      return false;
    }
    return true;
  }

  async addProduct(productId: string, name: string, qty = 1): Promise<boolean> {
    if (!this.ensureBuyer() || this.busyId()) return false;
    this.busyId.set(productId);
    try {
      await this.cart.addProduct(productId, qty);
      this.catalog.track('add_to_cart', productId);
      this.toast.success(`Đã thêm "${name}" vào giỏ`);
      return true;
    } catch (e) {
      this.toast.error(ApiError.from(e).message);
      return false;
    } finally {
      this.busyId.set(null);
    }
  }

  async addBox(boxId: string, name: string, qty = 1): Promise<boolean> {
    if (!this.ensureBuyer() || this.busyId()) return false;
    this.busyId.set(boxId);
    try {
      await this.cart.addBox(boxId, qty);
      this.toast.success(`Đã thêm "${name}" vào giỏ`);
      return true;
    } catch (e) {
      this.toast.error(ApiError.from(e).message);
      return false;
    } finally {
      this.busyId.set(null);
    }
  }
}
