import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { HeaderComponent } from './layout/header.component';
import { FooterComponent } from './layout/footer.component';
import { ToastService } from './core/services/toast.service';
import { RealtimeService } from './core/services/realtime.service';
import { ChatWidgetComponent } from './features/content/chat-widget.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ChatWidgetComponent],
  template: `
    <a class="skip-link" href="#main">Bỏ qua tới nội dung</a>
    @if (storefront()) { <app-header /> }
    <main id="main" [class.main]="storefront()">
      <router-outlet />
    </main>
    @if (storefront()) {
      <app-footer />
      <app-chat-widget />
    }
    <div class="toasts" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast toast-' + t.kind"><span>{{ t.text }}</span><button type="button" class="icon-btn" (click)="toast.dismiss(t.id)" aria-label="Đóng thông báo"><svg class="icon" aria-hidden="true"><use href="icons.svg#close" /></svg></button></div>
      }
    </div>
  `,
})
export class App {
  protected toast = inject(ToastService);
  private router = inject(Router);
  /** URL hiện tại (cập nhật sau mỗi lần điều hướng xong). */
  private url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  /** Khu vực quản trị / nhà bán có layout riêng => ẩn header, footer, chat của cửa hàng. */
  protected storefront = computed(() => !/^\/(admin|vendor)(?=[/?#]|$)/.test(this.url()));
  // Khởi tạo kênh SSE ngay khi app chạy (tự kết nối khi đăng nhập).
  private realtime = inject(RealtimeService);
}
