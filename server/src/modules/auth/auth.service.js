import crypto from 'node:crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Farm } from '../../models/index.js';
import { AppError, Errors } from '../../utils/AppError.js';
import { uniqueSlug } from '../../utils/text.js';
import { normalizePhone } from '../../utils/validate.js';
import { sendResetOtp } from '../../services/mail.service.js';

const BCRYPT_COST = 10;
// Hash giả để so sánh khi email không tồn tại (thời gian phản hồi tương đương, giảm dò email).
const DUMMY_HASH = bcrypt.hashSync('khong-ton-tai-0', BCRYPT_COST);

export function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function register({ name, email, password, phone, role, farmName, province }) {
  if (await User.exists({ email })) {
    throw new AppError(409, 'EMAIL_TAKEN', 'Email đã được sử dụng', [{ field: 'email', message: 'Email đã được sử dụng' }]);
  }
  const normPhone = phone ? normalizePhone(phone) : '';
  if (normPhone) await assertPhoneFree(normPhone);
  const user = await User.create({
    name,
    email,
    phone: normPhone,
    passwordHash: await hashPassword(password),
    role,
    vendorStatus: role === 'vendor' ? 'pending' : null,
  });
  // Vendor đăng ký kèm hồ sơ nông trại đầu tiên (ẩn khỏi trang công khai tới khi được duyệt).
  if (role === 'vendor' && farmName) {
    await Farm.create({ vendorId: user._id, name: farmName, slug: await uniqueSlug(Farm, farmName), province: province || '' });
  }
  return user;
}

/** Dữ liệu cũ có thể lưu dạng +84..., nên tra cả hai dạng. */
function phoneVariants(phone) {
  const p = normalizePhone(phone);
  return p.startsWith('0') ? [p, `+84${p.slice(1)}`] : [p];
}

/** Số điện thoại đã thuộc tài khoản khác => 409 (số điện thoại là định danh đăng nhập nên phải duy nhất). */
export async function assertPhoneFree(phone, exceptUserId = null) {
  const filter = { phone: { $in: phoneVariants(phone) } };
  if (exceptUserId) filter._id = { $ne: exceptUserId };
  if (await User.exists(filter)) {
    throw new AppError(409, 'PHONE_TAKEN', 'Số điện thoại đã được sử dụng', [{ field: 'phone', message: 'Số điện thoại đã được sử dụng' }]);
  }
}

/**
 * Đăng nhập bằng email hoặc số điện thoại. `identifier` là { email } hoặc { phone } (đã chuẩn hóa ở controller).
 * Một thông báo lỗi chung cho mọi trường hợp để không lộ tài khoản nào tồn tại.
 */
export async function verifyCredentials(identifier, password) {
  const id = typeof identifier === 'string' ? { email: identifier } : identifier;
  const filter = id.email ? { email: id.email } : { phone: { $in: phoneVariants(id.phone) } };
  const user = await User.findOne(filter).select('+passwordHash');
  const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Tài khoản hoặc mật khẩu không đúng');
  if (user.status === 'locked') throw new AppError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw Errors.unauthenticated();
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    throw Errors.validation([{ field: 'currentPassword', message: 'Mật khẩu hiện tại không đúng' }], 'Mật khẩu hiện tại không đúng');
  }
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
}

// ---------------- Quên mật khẩu (OTP 6 số qua email) ----------------
export const OTP_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const hashOtp = (email, otp) => crypto.createHash('sha256').update(`${email}:${otp}`).digest('hex');

/**
 * Tạo OTP và gửi mail. Email không tồn tại / bị khóa vẫn trả về bình thường
 * (không cho kẻ xấu dò email nào đã đăng ký).
 */
export async function requestPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user || user.status === 'locked') return;
  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await User.updateOne(
    { _id: user._id },
    { $set: { resetOtpHash: hashOtp(email, otp), resetOtpExpires: new Date(Date.now() + OTP_MINUTES * 60_000), resetOtpAttempts: 0 } },
  );
  await sendResetOtp({ to: user.email, name: user.name, otp, minutes: OTP_MINUTES });
}

/** Kiểm OTP, đặt mật khẩu mới, xóa OTP và đăng xuất mọi phiên cũ của tài khoản. */
export async function resetPassword(email, otp, newPassword) {
  const bad = (message = 'Mã xác nhận không đúng hoặc đã hết hạn') =>
    new AppError(400, 'OTP_INVALID', message, [{ field: 'otp', message }]);
  const user = await User.findOne({ email }).select('+resetOtpHash +resetOtpExpires +resetOtpAttempts');
  if (!user || !user.resetOtpHash || !user.resetOtpExpires || user.resetOtpExpires < new Date()) throw bad();
  if (user.resetOtpAttempts >= OTP_MAX_ATTEMPTS) throw bad('Nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.');
  const expected = Buffer.from(user.resetOtpHash);
  const sent = Buffer.from(hashOtp(email, otp));
  if (expected.length !== sent.length || !crypto.timingSafeEqual(expected, sent)) {
    await User.updateOne({ _id: user._id }, { $inc: { resetOtpAttempts: 1 } });
    throw bad();
  }
  await User.updateOne(
    { _id: user._id },
    { $set: { passwordHash: await hashPassword(newPassword), resetOtpHash: null, resetOtpExpires: null, resetOtpAttempts: 0 } },
  );
  await mongoose.connection
    .collection('sessions')
    .deleteMany({ session: { $regex: `"userId":"${user._id}"` } })
    .catch(() => {});
}
