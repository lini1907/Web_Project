import bcrypt from 'bcryptjs';
import { User, Farm } from '../../models/index.js';
import { AppError, Errors } from '../../utils/AppError.js';
import { uniqueSlug } from '../../utils/text.js';

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
  const user = await User.create({
    name,
    email,
    phone: phone || '',
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

export async function verifyCredentials(email, password) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
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
