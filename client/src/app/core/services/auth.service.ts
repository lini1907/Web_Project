import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API } from '../api';
import { Address, Role, User } from '../models';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'buyer' | 'vendor';
  farmName?: string;
  province?: string;
}

/**
 * Trạng thái đăng nhập dùng chung toàn app (signal). Không lưu mật khẩu/token ở localStorage:
 * phiên đăng nhập nằm trong cookie HttpOnly "sid" do server quản lý.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly ready = signal(false);
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly role = computed<Role | null>(() => this._user()?.role ?? null);
  readonly isBuyer = computed(() => this.role() === 'buyer');

  /** Gọi khi khởi động app: khôi phục phiên từ cookie (reload trang vẫn giữ đăng nhập). */
  async restore(): Promise<void> {
    try {
      // Lấy cookie XSRF-TOKEN trước để các request ghi sau đó có header chống CSRF.
      await firstValueFrom(this.http.get(`${API}/auth/csrf`));
      const me = await firstValueFrom(this.http.get<User>(`${API}/auth/me`));
      this._user.set(me);
    } catch {
      this._user.set(null);
    } finally {
      this.ready.set(true);
    }
  }

  async login(email: string, password: string): Promise<User> {
    const user = await firstValueFrom(this.http.post<User>(`${API}/auth/login`, { email, password }));
    this._user.set(user);
    return user;
  }

  async register(payload: RegisterPayload): Promise<User> {
    const user = await firstValueFrom(this.http.post<User>(`${API}/auth/register`, payload));
    this._user.set(user);
    return user;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${API}/auth/logout`, {}));
    } finally {
      this.clear();
      await this.router.navigateByUrl('/');
    }
  }

  /** Xóa trạng thái phía client (khi server báo 401/ACCOUNT_LOCKED). */
  clear(): void {
    this._user.set(null);
  }

  async updateProfile(data: { name?: string; phone?: string; address?: Address | null }): Promise<User> {
    const user = await firstValueFrom(this.http.patch<User>(`${API}/auth/me`, data));
    this._user.set(user);
    return user;
  }

  changePassword(currentPassword: string, newPassword: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${API}/auth/me/password`, { currentPassword, newPassword }));
  }

  /** Trang mặc định sau đăng nhập theo vai trò. */
  homeFor(user: User | null = this._user()): string {
    if (user?.role === 'admin') return '/admin';
    if (user?.role === 'vendor') return '/vendor';
    return '/';
  }
}
