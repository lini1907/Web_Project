import crypto from 'node:crypto';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export const CSRF_COOKIE = 'XSRF-TOKEN';
export const CSRF_HEADER = 'x-xsrf-token';
const CSRF_EXEMPT = new Set(['/payments/momo/ipn']);

export function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1 && part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

export function issueCsrfToken(req, res) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('base64url');
  res.cookie(CSRF_COOKIE, req.session.csrfToken, {
    httpOnly: false, // Angular cần đọc để gắn header X-XSRF-TOKEN
    sameSite: 'lax',
    secure: env.cookieSecure,
    path: '/',
  });
  return req.session.csrfToken;
}

/**
 * Chống CSRF kiểu "synchronizer token": token lưu trong session, gửi xuống cookie XSRF-TOKEN,
 * mọi request ghi phải gửi lại header X-XSRF-TOKEN khớp với token trong session.
 */
export function csrfProtection(req, res, next) {
  if (!req.session.csrfToken || readCookie(req, CSRF_COOKIE) !== req.session.csrfToken) {
    issueCsrfToken(req, res);
  }
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  // Callback server-to-server của cổng thanh toán: không có cookie trình duyệt, xác thực bằng chữ ký HMAC.
  if (CSRF_EXEMPT.has(req.path)) return next();
  const sent = req.get(CSRF_HEADER);
  const expected = req.session.csrfToken;
  const ok =
    typeof sent === 'string' &&
    sent.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected));
  if (!ok) return next(new AppError(403, 'CSRF_INVALID', 'Phiên làm việc không hợp lệ, vui lòng tải lại trang'));
  return next();
}

/** Từ chối input có key bắt đầu bằng "$" hoặc chứa "." (chặn NoSQL injection). */
export function rejectMongoOperators(req, res, next) {
  const bad = (obj, depth = 0) => {
    if (!obj || typeof obj !== 'object' || depth > 8) return false;
    return Object.keys(obj).some((k) => k.startsWith('$') || k.includes('.') || bad(obj[k], depth + 1));
  };
  if (bad(req.body) || bad(req.query)) {
    return next(new AppError(400, 'VALIDATION_ERROR', 'Dữ liệu chứa ký tự không được phép'));
  }
  return next();
}

/**
 * Giới hạn đăng nhập sai: tối đa 5 lần / 15 phút / (email + IP). Lưu trong bộ nhớ tiến trình
 * — đủ cho demo một máy chủ; triển khai nhiều instance thì chuyển sang Redis/MongoDB.
 */
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

function keyOf(req) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return `${email}|${req.ip}`;
}

export const loginLimiter = {
  check(req) {
    const rec = attempts.get(keyOf(req));
    if (rec && Date.now() - rec.first < WINDOW_MS && rec.count >= MAX_FAILS) {
      const retryAfter = Math.ceil((rec.first + WINDOW_MS - Date.now()) / 1000);
      throw new AppError(429, 'TOO_MANY_ATTEMPTS', `Đăng nhập sai quá nhiều lần. Thử lại sau ${Math.ceil(retryAfter / 60)} phút.`, {
        retryAfter,
      });
    }
  },
  fail(req) {
    const key = keyOf(req);
    const rec = attempts.get(key);
    if (!rec || Date.now() - rec.first >= WINDOW_MS) attempts.set(key, { count: 1, first: Date.now() });
    else rec.count += 1;
  },
  reset(req) {
    attempts.delete(keyOf(req));
  },
  clearAll() {
    attempts.clear();
  },
};

/**
 * Rate limiting chung (cửa sổ cố định, lưu trong bộ nhớ tiến trình).
 *   rateLimit({ name: 'register', windowMs: 3600e3, max: 10 })
 * Mặc định đếm theo IP; truyền key(req) để đếm theo user/email. Vượt ngưỡng => 429 + header Retry-After.
 * Khi chạy test (NODE_ENV=test) bộ giới hạn tắt, trừ khi đặt RATE_LIMIT_IN_TEST=1.
 */
const limiters = new Set();

export function rateLimit({ name, windowMs, max, key = (req) => req.ip, message }) {
  const hits = new Map();
  limiters.add(hits);
  return function rateLimitMiddleware(req, res, next) {
    if (env.isTest && process.env.RATE_LIMIT_IN_TEST !== '1') return next();
    const now = Date.now();
    const k = `${name}|${key(req)}`;
    let rec = hits.get(k);
    if (!rec || now - rec.start >= windowMs) {
      rec = { start: now, count: 0 };
      hits.set(k, rec);
    }
    rec.count += 1;
    const remaining = Math.max(0, max - rec.count);
    const resetSec = Math.ceil((rec.start + windowMs - now) / 1000);
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(remaining));
    res.set('RateLimit-Reset', String(resetSec));
    if (rec.count > max) {
      res.set('Retry-After', String(resetSec));
      return next(
        new AppError(429, 'RATE_LIMITED', message || `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${Math.max(1, Math.ceil(resetSec / 60))} phút.`, {
          retryAfter: resetSec,
        }),
      );
    }
    // Dọn bớt bản ghi hết hạn để Map không phình mãi.
    if (hits.size > 5000) for (const [kk, r] of hits) if (now - r.start >= windowMs) hits.delete(kk);
    return next();
  };
}

export function resetRateLimits() {
  for (const m of limiters) m.clear();
}

const userOrIp = (req) => (req.user ? `u:${req.user._id}` : `ip:${req.ip}`);
const emailAndIp = (req) => `${typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''}|${req.ip}`;

/** Các bộ giới hạn dùng trong ứng dụng. */
export const limits = {
  api: rateLimit({ name: 'api', windowMs: 60_000, max: 300 }),
  register: rateLimit({ name: 'register', windowMs: 60 * 60_000, max: 10, message: 'Đăng ký quá nhiều tài khoản từ thiết bị này. Thử lại sau.' }),
  forgotPassword: rateLimit({ name: 'forgot', windowMs: 15 * 60_000, max: 3, key: emailAndIp, message: 'Đã gửi mã quá nhiều lần. Vui lòng đợi 15 phút.' }),
  resetPassword: rateLimit({ name: 'reset', windowMs: 15 * 60_000, max: 10, key: emailAndIp }),
  placeOrder: rateLimit({ name: 'order', windowMs: 60_000, max: 10, key: userOrIp }),
  writeReview: rateLimit({ name: 'review', windowMs: 60_000, max: 10, key: userOrIp }),
  voucherCheck: rateLimit({ name: 'voucher', windowMs: 60_000, max: 20, key: userOrIp, message: 'Nhập mã quá nhiều lần. Vui lòng thử lại sau 1 phút.' }),
};
