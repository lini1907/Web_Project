import { User } from '../models/index.js';
import { AppError, Errors } from '../utils/AppError.js';

/**
 * Nạp người dùng từ session cho MỌI request. Kiểm tra trạng thái mỗi lần nên
 * tài khoản vừa bị admin khóa sẽ mất quyền ngay cả khi còn giữ cookie cũ.
 */
export async function loadUser(req, res, next) {
  req.user = null;
  const userId = req.session?.userId;
  if (!userId) return next();
  const user = await User.findById(userId);
  if (!user) {
    delete req.session.userId;
    return next();
  }
  if (user.status === 'locked') {
    await new Promise((resolve) => req.session.destroy(resolve));
    res.clearCookie('sid');
    return next(new AppError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.'));
  }
  req.user = user;
  return next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return next(Errors.unauthenticated());
  return next();
}

/** requireRole('vendor') hoặc requireRole('vendor', 'admin'). */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(Errors.unauthenticated());
    if (!roles.includes(req.user.role)) return next(Errors.forbidden());
    return next();
  };
}

/** Vendor phải được admin duyệt mới được bán hàng. */
export function requireApprovedVendor(req, res, next) {
  if (!req.user) return next(Errors.unauthenticated());
  if (req.user.role !== 'vendor') return next(Errors.forbidden());
  if (req.user.vendorStatus !== 'approved') {
    return next(new AppError(403, 'VENDOR_NOT_APPROVED', 'Tài khoản nhà bán chưa được duyệt'));
  }
  return next();
}

/**
 * Kiểm tra quyền sở hữu tài nguyên: load(req) trả document có trường vendorId/ownerField.
 * Không sở hữu => 404 (không tiết lộ tài nguyên của người khác có tồn tại).
 */
export function requireOwner(load, ownerField = 'vendorId') {
  return async (req, res, next) => {
    const doc = await load(req);
    if (!doc || String(doc[ownerField]) !== String(req.user._id)) return next(Errors.notFound());
    req.resource = doc;
    return next();
  };
}
