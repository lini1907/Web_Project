import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  kind: 'success' | 'error' | 'info';
}

/** Thông báo nổi dùng chung (thay cho ft-toast của bản HTML cũ). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;

  show(text: string, kind: Toast['kind'] = 'info', ms = 3200): void {
    const id = ++this.seq;
    this.toasts.update((list) => [...list.slice(-3), { id, text, kind }]);
    setTimeout(() => this.dismiss(id), ms);
  }
  success(text: string): void {
    this.show(text, 'success');
  }
  info(text: string): void {
    this.show(text, 'info');
  }
  error(text: string): void {
    this.show(text, 'error', 4500);
  }
  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
