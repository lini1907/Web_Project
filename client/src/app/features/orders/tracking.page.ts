import { Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiError } from '../../core/api';
import { SHIPMENT_STATUS_LABELS, Shipment } from '../../core/models';
import { OrderService } from '../../core/services/order.service';

/** Tra cứu hành trình giao hàng bằng mã vận đơn (công khai, không cần đăng nhập). */
@Component({
  selector: 'app-tracking',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="container page narrow">
      <h1>Tra cứu vận đơn</h1>
      <form class="toolbar" (ngSubmit)="search()">
        <input class="input" name="code" [(ngModel)]="code" placeholder="Nhập mã vận đơn, vd FTS1A2B3C4D5E" aria-label="Mã vận đơn" maxlength="40" style="text-transform: uppercase; max-width: 320px" />
        <button class="btn btn-primary btn-sm" type="submit" [disabled]="loading()">{{ loading() ? 'Đang tra...' : 'Tra cứu' }}</button>
      </form>
      @if (error()) { <div class="note note-danger" role="alert">{{ error() }}</div> }
      @if (result(); as r) {
        <section class="card">
          <div class="row-between"><b>Đơn {{ r.orderCode }}</b><span class="tag tag-green">{{ label[r.status] }}</span></div>
          <p class="small muted">{{ r.carrierLabel }} · Mã vận đơn {{ r.trackingCode }} @if (r.estimatedDelivery) { · Dự kiến giao {{ r.estimatedDelivery | date: 'dd/MM/yyyy' }} }</p>
          <ol class="timeline">
            @for (e of r.events.slice().reverse(); track $index; let first = $first) {
              <li [class.now]="first">
                <span class="dot"></span>
                <div><b>{{ label[e.status] }}</b>@if (e.location) { · {{ e.location }} }<br /><small class="muted">{{ e.at | date: 'HH:mm dd/MM/yyyy' }}@if (e.note) { — {{ e.note }} }</small></div>
              </li>
            }
          </ol>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .timeline { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 12px; }
      .timeline li { display: grid; grid-template-columns: 16px 1fr; gap: 10px; align-items: start; }
      .timeline .dot { width: 12px; height: 12px; border-radius: 50%; background: #d1d5db; margin-top: 4px; }
      .timeline li.now .dot { background: var(--green, #16a34a); box-shadow: 0 0 0 4px #dcfce7; }
    `,
  ],
})
export class TrackingPage {
  /** /tracking?code=... */
  readonly codeParam = input<string | undefined>(undefined, { alias: 'code' });
  private orders = inject(OrderService);
  private router = inject(Router);
  protected label = SHIPMENT_STATUS_LABELS;
  protected code = '';
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected result = signal<(Shipment & { orderCode: string }) | null>(null);

  constructor() {
    effect(() => {
      const c = this.codeParam();
      if (c) {
        this.code = c;
        this.fetch(c);
      }
    });
  }

  search(): void {
    const c = this.code.trim().toUpperCase();
    if (!c) return;
    this.router.navigate([], { queryParams: { code: c } });
  }

  private fetch(code: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.orders.track(code.trim().toUpperCase()).subscribe({
      next: (r) => {
        this.result.set(r);
        this.loading.set(false);
      },
      error: (e) => {
        const err = ApiError.from(e);
        this.result.set(null);
        this.error.set(err.status === 404 ? 'Không tìm thấy vận đơn với mã này.' : err.message);
        this.loading.set(false);
      },
    });
  }
}
