import { Voucher } from '../../models/index.js';
import { AppError } from '../../utils/AppError.js';

const invalid = (message, code = 'VOUCHER_INVALID') => new AppError(400, code, message, [{ field: 'voucherCode', message }]);

export function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

/** Tính số tiền giảm của voucher cho đơn có subtotal (tiền hàng) và shippingFee. */
export function computeDiscount(v, subtotal, shippingFee) {
  let d = 0;
  if (v.type === 'percent') {
    d = Math.floor((subtotal * v.value) / 100 / 1000) * 1000; // làm tròn xuống nghìn đồng
    if (v.maxDiscount > 0) d = Math.min(d, v.maxDiscount);
  } else if (v.type === 'fixed') {
    d = v.value;
  } else if (v.type === 'freeship') {
    d = shippingFee;
  }
  return Math.max(0, Math.min(d, subtotal + shippingFee));
}

/** Kiểm tra điều kiện dùng voucher (không thay đổi DB). Ném lỗi 400 kèm lý do cụ thể. */
export function checkUsable(v, { subtotal, userId, now = new Date() }) {
  if (!v || !v.isActive) throw invalid('Mã giảm giá không tồn tại hoặc đã ngừng áp dụng');
  if (v.startsAt && v.startsAt > now) throw invalid('Mã giảm giá chưa đến thời gian áp dụng');
  if (v.expiresAt && v.expiresAt < now) throw invalid('Mã giảm giá đã hết hạn', 'VOUCHER_EXPIRED');
  if (v.maxUses > 0 && v.usedCount >= v.maxUses) throw invalid('Mã giảm giá đã hết lượt sử dụng', 'VOUCHER_EXHAUSTED');
  if (userId && Array.isArray(v.usedBy) && v.usedBy.some((id) => String(id) === String(userId))) {
    throw invalid('Bạn đã dùng mã giảm giá này rồi', 'VOUCHER_USED');
  }
  if (subtotal < v.minOrderValue) {
    throw invalid(`Đơn hàng cần tối thiểu ${v.minOrderValue.toLocaleString('vi-VN')}đ tiền hàng để dùng mã này`, 'VOUCHER_MIN_ORDER');
  }
}

/** Xem trước: mã có dùng được cho giỏ hiện tại không, giảm bao nhiêu. */
export async function preview(code, userId, { subtotal, shippingFee }) {
  const v = await Voucher.findOne({ code: normalizeCode(code) }).select('+usedBy').lean();
  checkUsable(v, { subtotal, userId });
  const discount = computeDiscount(v, subtotal, shippingFee);
  return { voucher: toPublicVoucher(v), discount, total: subtotal + shippingFee - discount };
}

/**
 * Dùng voucher khi đặt đơn (trong transaction). Cập nhật CÓ ĐIỀU KIỆN để hai đơn đặt cùng lúc
 * không vượt maxUses và một người không dùng 2 lần.
 */
export async function redeem(code, userId, { subtotal, shippingFee }, session) {
  const now = new Date();
  const v = await Voucher.findOne({ code: normalizeCode(code) }).select('+usedBy').session(session).lean();
  checkUsable(v, { subtotal, userId, now });
  const cond = { _id: v._id, isActive: true, usedBy: { $ne: userId } };
  if (v.maxUses > 0) cond.usedCount = { $lt: v.maxUses };
  const r = await Voucher.updateOne(cond, { $inc: { usedCount: 1 }, $push: { usedBy: userId } }, { session });
  if (r.modifiedCount !== 1) throw invalid('Mã giảm giá vừa hết lượt sử dụng', 'VOUCHER_EXHAUSTED');
  return { code: v.code, type: v.type, discount: computeDiscount(v, subtotal, shippingFee) };
}

/** Trả lại lượt dùng khi cả đơn bị hủy. */
export async function release(code, userId, session) {
  if (!code) return;
  await Voucher.updateOne({ code, usedBy: userId }, { $inc: { usedCount: -1 }, $pull: { usedBy: userId } }, { session });
}

export function toPublicVoucher(v) {
  return {
    code: v.code,
    description: v.description || '',
    type: v.type,
    value: v.value,
    maxDiscount: v.maxDiscount,
    minOrderValue: v.minOrderValue,
    expiresAt: v.expiresAt || null,
  };
}

export function toAdminVoucher(v) {
  return {
    id: String(v._id),
    ...toPublicVoucher(v),
    maxUses: v.maxUses,
    usedCount: v.usedCount,
    startsAt: v.startsAt || null,
    isActive: v.isActive,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}
