import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { TimeoutError, catchError, switchMap, throwError, timeout } from 'rxjs';
import { API, ApiError } from '../api';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/**
 * Interceptor xử lý lỗi tập trung:
 *  - chuẩn hóa lỗi về ApiError { status, code, message, details }
 *  - CSRF_INVALID: lấy lại token rồi thử lại 1 lần
 *  - 401 khi đang thao tác: xóa trạng thái đăng nhập, chuyển tới trang đăng nhập kèm returnUrl
 *  - ACCOUNT_LOCKED: đăng xuất phía client và báo cho người dùng
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const http = inject(HttpClient);

  return next(req).pipe(
    timeout(req.url.includes('/uploads') ? 30000 : 20000),
    catchError((err: unknown) => {
      const apiErr = err instanceof TimeoutError ? new ApiError(0, 'REQUEST_TIMEOUT', 'Máy chủ phản hồi chậm. Vui lòng thử lại.') : ApiError.from(err);
      const isApi = req.url.startsWith(API);

      if (isApi && apiErr.code === 'CSRF_INVALID' && !req.headers.has('X-Retry-Csrf')) {
        return http.get(`${API}/auth/csrf`).pipe(
          switchMap(() => next(req.clone({ setHeaders: { 'X-Retry-Csrf': '1' } }))),
          catchError((e2: unknown) => throwError(() => ApiError.from(e2))),
        );
      }

      if (isApi && apiErr.code === 'ACCOUNT_LOCKED') {
        auth.clear();
        toast.error(apiErr.message);
        router.navigate(['/login']);
      } else if (isApi && apiErr.status === 401 && apiErr.code === 'UNAUTHENTICATED' && !req.url.endsWith('/auth/me')) {
        const wasLoggedIn = auth.isLoggedIn();
        auth.clear();
        if (wasLoggedIn) toast.info('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => apiErr);
    }),
  );
};

export function isHttpError(e: unknown): e is HttpErrorResponse {
  return e instanceof HttpErrorResponse;
}
