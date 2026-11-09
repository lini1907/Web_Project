import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiError } from '../../core/api';
import { Paged, User } from '../../core/models';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent, StateComponent, StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, DatePipe, PaginationComponent, StateComponent, StatusBadgeComponent],
  template: `
    <div class="page-head">
      <h1>Tài khoản người dùng</h1>
      <a class="btn btn-outline btn-sm" [href]="'/api/v1/admin/export/users.csv' + (role ? '?role=' + role : '')" download>Xuất CSV</a>
    </div>
    <form class="toolbar" (ngSubmit)="page.set(1); load()">
      <input class="input" name="q" type="search" placeholder="Tên hoặc email" [(ngModel)]="q" aria-label="Tìm người dùng" />
      <select class="input" name="role" [(ngModel)]="role" (ngModelChange)="page.set(1); load()" aria-label="Vai trò">
        <option value="">Mọi vai trò</option><option value="buyer">Người mua</option><option value="vendor">Nhà bán</option><option value="admin">Quản trị</option>
      </select>
      <select class="input" name="status" [(ngModel)]="status" (ngModelChange)="page.set(1); load()" aria-label="Trạng thái">
        <option value="">Mọi trạng thái</option><option value="active">Hoạt động</option><option value="locked">Đã khóa</option>
      </select>
      <button class="btn btn-outline btn-sm" type="submit">Tìm</button>
    </form>
    @if (state() !== 'ok') {
      <app-state [state]="state()" emptyText="Không có tài khoản phù hợp" (retry)="load()" />
    } @else {
      <div class="table-wrap card">
        <table class="table">
          <thead><tr><th>Người dùng</th><th>Vai trò</th><th>Tạo lúc</th><th>Đăng nhập gần nhất</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            @for (u of result()!.data; track u.id) {
              <tr>
                <td><b>{{ u.name }}</b><br /><small class="muted">{{ u.email }}</small></td>
                <td>{{ roleLabel[u.role] }}</td>
                <td>{{ u.createdAt | date: 'dd/MM/yyyy' }}</td>
                <td>{{ u.lastLoginAt ? (u.lastLoginAt | date: 'HH:mm dd/MM') : '—' }}</td>
                <td><app-status [value]="u.status" /></td>
                <td>
                  @if (u.role !== 'admin' && u.id !== me()) {
                    @if (u.status === 'active') {
                      <button type="button" class="btn btn-outline btn-xs text-danger" (click)="setStatus(u, 'locked')">Khóa</button>
                    } @else {
                      <button type="button" class="btn btn-outline btn-xs" (click)="setStatus(u, 'active')">Mở khóa</button>
                    }
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination [page]="result()!.page" [totalPages]="result()!.totalPages" (pageChange)="page.set($event); load()" />
      <p class="small muted">Khóa tài khoản có hiệu lực ngay: phiên đăng nhập hiện tại của người đó bị hủy ở máy chủ.</p>
    }
  `,
})
export class AdminUsersPage {
  private admin = inject(AdminService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  protected roleLabel = { buyer: 'Người mua', vendor: 'Nhà bán', admin: 'Quản trị' } as const;
  protected q = '';
  protected role = '';
  protected status = '';
  protected page = signal(1);
  protected result = signal<Paged<User> | null>(null);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');
  protected me = () => this.auth.user()?.id;

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.admin.users({ q: this.q || undefined, role: this.role || undefined, status: this.status || undefined, page: this.page() }).subscribe({
      next: (r) => {
        this.result.set(r);
        this.state.set(r.data.length ? 'ok' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }

  setStatus(u: User, status: 'active' | 'locked'): void {
    const reason = status === 'locked' ? prompt(`Lý do khóa tài khoản ${u.email}:`)?.trim() : undefined;
    if (status === 'locked' && reason === undefined) return;
    this.admin.setUserStatus(u.id, status, reason || undefined).subscribe({
      next: () => {
        this.toast.success(status === 'locked' ? `Đã khóa ${u.email}` : `Đã mở khóa ${u.email}`);
        this.load();
      },
      error: (e) => this.toast.error(ApiError.from(e).message),
    });
  }
}
