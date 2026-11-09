import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { Observable, Subject, filter } from 'rxjs';
import { API } from '../api';
import { RealtimeEvent } from '../models';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

const TYPES: RealtimeEvent['type'][] = ['order.created', 'order.updated', 'payment.updated'];

/**
 * Nhận thông báo thời gian thực bằng Server-Sent Events (EventSource).
 * Tự mở kết nối khi đăng nhập, tự đóng khi đăng xuất; trình duyệt tự kết nối lại nếu rớt mạng.
 * Cookie phiên được gửi kèm vì cùng origin (dev: proxy /api).
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private source: EventSource | null = null;
  private events$ = new Subject<RealtimeEvent>();
  readonly connected = signal(false);

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (user) this.connect();
      else this.disconnect();
    });
    inject(DestroyRef).onDestroy(() => this.disconnect());
  }

  /** Luồng sự kiện; lọc theo mã đơn nếu truyền orderId. */
  on(orderId?: string): Observable<RealtimeEvent> {
    return orderId ? this.events$.pipe(filter((e) => e.orderId === orderId)) : this.events$.asObservable();
  }

  private connect(): void {
    if (this.source || typeof EventSource === 'undefined') return;
    const es = new EventSource(`${API}/realtime/stream`);
    this.source = es;
    es.addEventListener('ready', () => this.connected.set(true));
    es.onerror = () => this.connected.set(false);
    for (const type of TYPES) {
      es.addEventListener(type, (msg) => {
        try {
          const data = { ...JSON.parse((msg as MessageEvent).data), type } as RealtimeEvent;
          this.events$.next(data);
          const kind = data.status === 'cancelled' || data.status === 'failed' || data.shipmentStatus === 'failed' ? 'error' : 'info';
          this.toast.show(data.message, kind === 'error' ? 'error' : data.status === 'paid' || data.status === 'delivered' ? 'success' : 'info', 5000);
        } catch {
          /* bỏ qua dữ liệu lỗi */
        }
      });
    }
  }

  private disconnect(): void {
    this.source?.close();
    this.source = null;
    this.connected.set(false);
  }
}
