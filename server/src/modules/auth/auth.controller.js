import * as authService from './auth.service.js';
import { parse, v } from '../../utils/validate.js';
import { issueCsrfToken, loginLimiter } from '../../middleware/security.js';
import { Errors } from '../../utils/AppError.js';

const registerShape = {
  name: v.string({ min: 2, max: 80 }),
  email: v.email(),
  password: v.password(),
  phone: v.phone().optional(),
  role: v.enum(['buyer', 'vendor']).default('buyer'), // admin không thể tạo qua API
  farmName: v.string({ min: 3, max: 120 }).optional(),
  province: v.string({ max: 60 }).optional(),
};

function regenerate(req) {
  return new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
}
function saveSession(req) {
  return new Promise((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));
}

async function startSession(req, res, user) {
  // Đổi session id sau đăng nhập để chống session fixation.
  await regenerate(req);
  req.session.userId = user._id.toString();
  req.session.role = user.role;
  issueCsrfToken(req, res);
  await saveSession(req);
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
  const { email, password } = parse({ email: v.email(), password: v.string({ min: 1, max: 200 }) }, req.body);
  loginLimiter.check(req);
  let user;
  try {
    user = await authService.verifyCredentials(email, password);
  } catch (err) {
    if (err.code === 'INVALID_CREDENTIALS') loginLimiter.fail(req);
    throw err;
  }
  loginLimiter.reset(req);
  await startSession(req, res, user);
  res.json(user.toPublic());
}

export async function logout(req, res) {
  await new Promise((resolve) => req.session.destroy(resolve));
  res.clearCookie('sid');
  res.clearCookie('XSRF-TOKEN');
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
