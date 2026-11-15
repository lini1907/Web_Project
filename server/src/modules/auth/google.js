import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { User } from '../../models/index.js';
import { publicUrl, appUrl } from '../payments/payment.config.js';

/**
 * Đăng nhập Google (OAuth 2.0 Authorization Code + OpenID Connect).
 *   1. GET /auth/google            -> tạo "state" chống CSRF lưu trong session, chuyển sang trang đồng ý của Google
 *   2. GET /auth/google/callback   -> kiểm state, đổi "code" lấy access token (server-to-server, có client secret),
 *                                     đọc thông tin email đã xác minh, tạo/liên kết tài khoản rồi mở phiên đăng nhập.
 * Cấu hình: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (Google Cloud Console -> Credentials -> OAuth client ID,
 * Authorized redirect URI = <PUBLIC_URL>/api/v1/auth/google/callback).
 */
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export function googleConfig() {
  return {
    clientId: (process.env.GOOGLE_CLIENT_ID || '').trim(),
    clientSecret: (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
    redirectUri: `${publicUrl()}/api/v1/auth/google/callback`,
  };
}

export const googleEnabled = () => {
  const c = googleConfig();
  return !!(c.clientId && c.clientSecret);
};

/** Chỉ nhận đường dẫn nội bộ (chống open redirect). */
export function safeReturnUrl(url) {
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login') ? url.slice(0, 300) : '';
}

export function buildAuthUrl(req) {
  const state = crypto.randomBytes(24).toString('base64url');
  req.session.googleState = state;
  req.session.googleReturn = safeReturnUrl(req.query.returnUrl);
  const c = googleConfig();
  const q = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return `${AUTH_URL}?${q}`;
}

/** Đổi code lấy thông tin người dùng Google. Ném lỗi nếu Google từ chối. */
export async function fetchGoogleProfile(code) {
  const c = googleConfig();
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: c.clientId, client_secret: c.clientSecret, redirect_uri: c.redirectUri, grant_type: 'authorization_code' }),
    signal: AbortSignal.timeout(10_000),
  });
  const token = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !token.access_token) throw new Error('GOOGLE_TOKEN_FAILED');
  const infoRes = await fetch(USERINFO_URL, { headers: { authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(10_000) });
  const info = await infoRes.json().catch(() => ({}));
  if (!infoRes.ok || !info.sub) throw new Error('GOOGLE_PROFILE_FAILED');
  return info; // { sub, email, email_verified, name, picture }
}

/**
 * Tìm hoặc tạo tài khoản:
 *  - Đã liên kết googleId => dùng luôn.
 *  - Email trùng tài khoản có sẵn (Google đã xác minh email) => liên kết googleId vào tài khoản đó.
 *  - Chưa có => tạo tài khoản người mua mới với mật khẩu ngẫu nhiên (đăng nhập bằng Google, hoặc dùng "Quên mật khẩu" để đặt mật khẩu).
 */
export async function findOrCreateGoogleUser(info) {
  if (!info.email || info.email_verified === false || info.email_verified === 'false') {
    const e = new Error('GOOGLE_EMAIL_UNVERIFIED');
    throw e;
  }
  const email = String(info.email).toLowerCase();
  let user = await User.findOne({ googleId: info.sub });
  if (!user) {
    user = await User.findOne({ email });
    if (user) {
      user.googleId = info.sub;
      await user.save();
    }
  }
  if (!user) {
    user = await User.create({
      email,
      name: (info.name || email.split('@')[0]).slice(0, 80),
      passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
      role: 'buyer',
      googleId: info.sub,
      authProvider: 'google',
    });
  }
  return user;
}

export function loginErrorRedirect(code) {
  return `${appUrl()}/login?error=${encodeURIComponent(code)}`;
}
