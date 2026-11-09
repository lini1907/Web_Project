import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { Role } from './models';
import { AuthService } from './services/auth.service';

/**
 * Route guard chỉ phục vụ ĐIỀU HƯỚNG (ẩn trang không phù hợp). Quyền thật luôn được kiểm ở API:
 * bỏ guard đi thì server vẫn trả 401/403.
 */
function whenReady() {
  const auth = inject(AuthService);
  return toObservable(auth.ready).pipe(
    filter(Boolean),
    take(1),
    map(() => auth),
  );
}

/** Yêu cầu đăng nhập; chưa đăng nhập => /login?returnUrl=... */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return whenReady().pipe(
    map((auth) => (auth.isLoggedIn() ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }))),
  );
};

/** Yêu cầu đúng vai trò. Dùng canMatch để module lazy (vendor/admin) không bị tải nếu sai quyền. */
export function roleGuard(...roles: Role[]): CanMatchFn {
  return (_route, segments) => {
    const router = inject(Router);
    return whenReady().pipe(
      map((auth) => {
        const role = auth.role();
        if (!role) return router.createUrlTree(['/login'], { queryParams: { returnUrl: '/' + segments.map((s) => s.path).join('/') } });
        if (roles.includes(role)) return true;
        return router.createUrlTree(['/forbidden']);
      }),
    );
  };
}

/** Trang đăng nhập/đăng ký: đã đăng nhập thì chuyển về trang chủ theo vai trò. */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return whenReady().pipe(map((auth) => (auth.isLoggedIn() ? router.parseUrl(auth.homeFor()) : true)));
};
