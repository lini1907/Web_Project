import { Component, inject, signal } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { AuditLog, Paged } from '../../core/models';
import { AdminService } from '../../core/services/admin.service';
import { PaginationComponent, StateComponent } from '../../shared/ui';

@Component({
  selector: 'app-admin-audit',
  imports: [DatePipe, JsonPipe, PaginationComponent, StateComponent],
  template: `
    <div class="page-head"><h1>Nhật ký thao tác quản trị</h1></div>
    @if (state() !== 'ok') {
      <app-state [state]="state()" emptyText="Chưa có thao tác nào" emptyIcon="note" (retry)="load()" />
    } @else {
      <div class="table-wrap card">
        <table class="table">
          <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Đối tượng</th><th>Trước → Sau</th><th>Lý do</th></tr></thead>
          <tbody>
            @for (l of result()!.data; track l.id) {
              <tr>
                <td>{{ l.at | date: 'HH:mm:ss dd/MM/yyyy' }}</td>
                <td>{{ l.actorEmail }}</td>
                <td><code>{{ l.action }}</code></td>
                <td>{{ l.targetLabel }}</td>
                <td class="small"><code>{{ l.before | json }}</code> → <code>{{ l.after | json }}</code></td>
                <td>{{ l.reason }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination [page]="result()!.page" [totalPages]="result()!.totalPages" (pageChange)="page.set($event); load()" />
    }
  `,
})
export class AdminAuditPage {
  private admin = inject(AdminService);
  protected page = signal(1);
  protected result = signal<Paged<AuditLog> | null>(null);
  protected state = signal<'loading' | 'error' | 'empty' | 'ok'>('loading');
  constructor() {
    this.load();
  }
  load(): void {
    this.state.set('loading');
    this.admin.auditLogs(this.page()).subscribe({
      next: (r) => {
        this.result.set(r);
        this.state.set(r.data.length ? 'ok' : 'empty');
      },
      error: () => this.state.set('error'),
    });
  }
}
