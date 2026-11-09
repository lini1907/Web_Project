import { Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiError } from '../../core/api';
import { AdminVendor } from '../../core/models';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';
import { StateComponent, StatusBadgeComponent } from '../../shared/ui';

@Component({
  selector: 'app-admin-vendors',
  imports: [FormsModule, DatePipe, StateComponent, StatusBadgeComponent],
  template: `
    <div class="page-head"><h1>Duyệt nhà bán</h1></div>
    <div class="toolbar">
      <div class="tabs">
        @for (t of tabs; track t.key) {
          <button type="button" class="tab" [class.active]="(status() || '') === t.key" (click)="go(t.key)">{{ t.label }}</button>
        }
      </div>
      <input class="input" type="search" placeholder="Tìm tên, email..." [(ngModel)]="q" (keyup.enter)="load()" aria-label="Tìm nhà bán" />
    </div>
    @if (state() !== 'ok') {
      <app-state [state]="state()" emptyText="Không có nhà bán phù hợp" emptyIcon="store" (retry)="load()" />
    } @else {
      <div class="table-wrap card">
        <table class="table">
          <thead><tr><th>Nhà bán</th><th>Nông trại</th><th>Sản phẩm</th><th>Đăng ký</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>
            @for (v of items(); track v.id) {
              <tr>
                <td><b>{{ v.name }}</b><br /><small class="muted">{{ v.email }} · {{ v.phone }}</small></td>
                <td>@for (f of v.farms; track f.id) { <div class="small">{{ f.name }} ({{ f.province }})</div> }</td>
                <td>{{ v.activeProductCount }}/{{ v.productCount }}</td>
                <td>{{ v.createdAt | date: 'dd/MM/yyyy' }}</td>
                <td><app-status [value]="v.vendorStatus || 'pending'" /> @if (v.status === 'locked') { <app-status value="locked" /> }
                  @if (v.vendorNote) { <div class="small muted">{{ v.vendorNote }}</div> }
                </td>
                <td class="actions">
                  @if (v.vendorStatus !== 'approved') { <button type="button" class="btn btn-primary btn-xs" (click)="setStatus(v, 'approved')">Duyệt</button> }
                  @if (v.vendorStatus !== 'rejected') { <button type="button" class="btn btn-outline btn-xs text-danger" (click)="setStatus(v, 'rejected')">Từ chối</button> }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="small muted">Mọi thay đổi trạng thái đều được ghi vào nhật ký thao tác. Khóa/mở tài khoản ở mục "Tài khoản".</p>
    }
  `,
})
export class AdminVendorsPage {
  readonly status = input<string | undefined>();
  private admin = inject(AdminService);
  private toast = inject(ToastService);
  private router = inject(Router);
  protected tabs = [
    { key: 'pending', label: 'Chờ duyệt' },
    { key: 'approved', label: 'Đã duyệt' },
    { key: 'rejected', label: 'Từ chối' },
    { key: '', label: 'Tất cả' },
  ];
  protected q = '';
  protected items = signal<AdminVendor[]>([]);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');

  constructor() {
    effect(() => {
      this.status();
      this.load();
    });
  }

  go(key: string): void {
    this.router.navigate([], { queryParams: { status: key || null } });
  }

  load(): void {
    this.state.set('loading');
    this.admin.vendors(this.status() || undefined, this.q || undefined).subscribe({
      next: (r) => {
        this.items.set(r);
        this.state.set(r.length ? 'ok' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }

  setStatus(v: AdminVendor, vendorStatus: 'approved' | 'rejected'): void {
    let reason: string | undefined;
    if (vendorStatus === 'rejected') {
      reason = prompt(`Lý do từ chối "${v.name}":`)?.trim();
      if (!reason) return;
    } else if (!confirm(`Duyệt nhà bán "${v.name}"? Sản phẩm của họ sẽ hiển thị công khai.`)) return;
    this.admin.setVendorStatus(v.id, vendorStatus, reason).subscribe({
      next: () => {
        this.toast.success(vendorStatus === 'approved' ? `Đã duyệt ${v.name}` : `Đã từ chối ${v.name}`);
        this.load();
      },
      error: (e) => this.toast.error(ApiError.from(e).message),
    });
  }
}
