import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header.component';
import { FooterComponent } from './layout/footer.component';
import { ToastService } from './core/services/toast.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <a class="skip-link" href="#main">Bỏ qua tới nội dung</a>
    <app-header />
    <main id="main" class="main">
      <router-outlet />
    </main>
    <app-footer />
    <div class="toasts" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast toast-' + t.kind"><span>{{ t.text }}</span><button type="button" class="icon-btn" (click)="toast.dismiss(t.id)" aria-label="Đóng thông báo"><svg class="icon" aria-hidden="true"><use href="icons.svg#close" /></svg></button></div>
      }
    </div>
  `,
})
export class App {
  protected toast = inject(ToastService);
}
