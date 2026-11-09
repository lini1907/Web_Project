import * as authService from './auth.service.js';
import { parse, v } from '../../utils/validate.js';
import { issueCsrfToken, loginLimiter, readCookie } from '../../middleware/security.js';
import { env } from '../../config/env.js';
import { Errors } from '../../utils/AppError.js';
import { mergeGuestCart } from '../cart/cart.service.js';

const registerShape = {
  name: v.string({ min: 2, max: 80 }),
  email: v.email(),
  password: v.password(),
  phone: v.phone().optional(),
  role: v.enum(['buyer', 'vendor']).default('buyer'), // admin không thể tạo qua API
  farmName: v.string({ min: 3, max: 120 }).optional(),
  province: v.string({ max: 60 }).optional(),
};

/*
 * "Ghi nhớ đăng nhập" (Chương VIII – Cookie, Bài 60–61) theo cách an toàn:
 *  - Có tick: cookie phiên "sid" thành persistent cookie 30 ngày (Max-Age), đóng trình duyệt vẫn còn đăng nhập.
 *  - Không tick: "sid" là session cookie (không Max-Age) => mất khi đóng trình duyệt; phía server vẫn hết hạn sau SESSION_MAX_AGE_HOURS.
 *  - Cookie "remember_email" (HttpOnly, 30 ngày) chỉ lưu EMAIL để điền sẵn ở lần đăng nhập sau.
 *    KHÔNG BAO GIỜ lưu mật khẩu vào cookie (khác ví dụ minh họa trong bài tập).
 */
export const REMEMBER_COOKIE = 'remember_email';
const REMEMBER_MS = 30 * 24 * 3600 * 1000;
const rememberCookieOpts = () => ({ httpOnly: true, sameSite: 'lax', secure: env.cookieSecure, path: '/api' });

function applyRemember(req, res, email, remember) {
  if (remember) {
    req.session.cookie.maxAge = REMEMBER_MS;
    res.cookie(REMEMBER_COOKIE, email, { ...rememberCookieOpts(), maxAge: REMEMBER_MS });
  } else {
    req.session.cookie.maxAge = null; // session cookie: không có Expires/Max-Age
    res.clearCookie(REMEMBER_COOKIE, rememberCookieOpts());
  }
  req.session.remember = !!remember;
}

function regenerate(req) {
  return new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
}
function saveSession(req) {
  return new Promise((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));
}

async function startSession(req, res, user, { remember = false } = {}) {
  // Giữ lại giỏ tạm của khách trước khi regenerate (regenerate xóa toàn bộ dữ liệu session cũ).
  const guestItems = req.session.guestCart?.items || [];
  // Đổi session id sau đăng nhập để chống session fixation.
  await regenerate(req);
  req.session.userId = user._id.toString();
  req.session.role = user.role;
  applyRemember(req, res, user.email, remember);
  issueCsrfToken(req, res);
  await saveSession(req);
  // Chỉ người mua có giỏ hàng: gộp giỏ tạm (session) vào giỏ bền vững (MongoDB).
  if (user.role === 'buyer' && guestItems.length) {
    const r = await mergeGuestCart(user._id, guestItems);
    res.set('X-Cart-Merged', String(r.merged));
  }
}

export async function csrf(req, res) {
  issueCsrfToken(req, res);
  res.status(204).end();
}

export async function register(req, res) {
  const body = parse(registerShape, req.body);
  if (body.role === 'vendor' && !body.farmName) {
    throw Errors.validation([{ field: 'farmName', message: 'Nhà bán cần nhập tên nông trại' }]);
  }
  const user = await authService.register(body);
  await startSession(req, res, user);
  res.status(201).json(user.toPublic());
}

export async function login(req, res) {
  const { email, password, remember } = parse(
    { email: v.email(), password: v.string({ min: 1, max: 200 }), remember: v.bool().default(false) },
    req.body,
  );
  loginLimiter.check(req);
  let user;
  try {
    user = await authService.verifyCredentials(email, password);
  } catch (err) {
    if (err.code === 'INVALID_CREDENTIALS') loginLimiter.fail(req);
    throw err;
  }
  loginLimiter.reset(req);
  await startSession(req, res, user, { remember });
  res.json(user.toPublic());
}

export async function logout(req, res) {
  await new Promise((resolve) => req.session.destroy(resolve));
  res.clearCookie('sid');
  res.clearCookie('XSRF-TOKEN');
  res.status(204).end();
}

/** Đọc cookie remember_email (server đọc cookie từ header Cookie) để trang đăng nhập điền sẵn email. */
export async function remembered(req, res) {
  const email = readCookie(req, REMEMBER_COOKIE);
  res.json({ email: email && /^[^\s@]+@[^\s@]+$/.test(email) ? email : null });
}

/** "Không phải bạn?" — xóa cookie ghi nhớ email. */
export async function forgetRemembered(req, res) {
  res.clearCookie(REMEMBER_COOKIE, rememberCookieOpts());
  res.status(204).end();
}

export async function me(req, res) {
  res.json(req.user.toPublic());
}

export async function updateMe(req, res) {
  const body = parse(
    {
      name: v.string({ min: 2, max: 80 }).optional(),
      phone: v.phone().optional(),
      address: v
        .object({
          name: v.string({ min: 2, max: 80 }),
          phone: v.phone(),
          address: v.string({ min: 5, max: 300 }),
        })
        .nullable(),
    },
    req.body,
  );
  Object.assign(req.user, body);
  await req.user.save();
  res.json(req.user.toPublic());
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = parse(
    { currentPassword: v.string({ min: 1, max: 200 }), newPassword: v.password() },
    req.body,
  );
  if (currentPassword === newPassword) {
    throw Errors.validation([{ field: 'newPassword', message: 'Mật khẩu mới phải khác mật khẩu cũ' }]);
  }
  await authService.changePassword(req.user._id, currentPassword, newPassword);
  res.status(204).end();
}
