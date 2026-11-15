import { ApplicationConfig, LOCALE_ID, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withRouterConfig } from '@angular/router';

import { routes } from './app.routes';
import { apiErrorInterceptor } from './core/interceptors/api-error.interceptor';
import { AuthService } from './core/services/auth.service';

registerLocaleData(localeVi);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'vi' },
    provideRouter(
      routes,
      withComponentInputBinding(), // tham số route (:slug, :id) và query được bind thẳng vào input() của component
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    provideHttpClient(
      withInterceptors([apiErrorInterceptor]),
      // Angular tự đọc cookie XSRF-TOKEN và gắn header X-XSRF-TOKEN cho request ghi cùng origin.
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
    ),
    // Khôi phục phiên đăng nhập từ cookie trước khi hiển thị trang.
    provideAppInitializer(() => inject(AuthService).restore()),
  ],
};
