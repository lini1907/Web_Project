import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Event, Product } from '../../models/index.js';

const VIEW_DEDUPE_MS = 30 * 60 * 1000;

/** Khóa phiên đã băm: đủ để gộp sự kiện cùng phiên mà không lưu session id thật. */
export function sessionKey(req) {
  const sid = req.sessionID || '';
  return sid ? crypto.createHash('sha256').update(sid).digest('hex').slice(0, 24) : '';
}

/**
 * Ghi sự kiện hành vi. Sự kiện "view" được chống trùng 30 phút cho cùng phiên + sản phẩm,
 * để reload trang không làm phồng dữ liệu.
 */
export async function recordEvent(req, type, productId) {
  if (!mongoose.isValidObjectId(productId)) return { recorded: false };
  const userId = req.user?._id || null;
  const key = sessionKey(req);
  if (type === 'view') {
    const dup = await Event.exists({
      type: 'view',
      productId,
      at: { $gte: new Date(Date.now() - VIEW_DEDUPE_MS) },
      ...(userId ? { userId } : { sessionKey: key }),
    });
    if (dup) return { recorded: false, deduped: true };
  }
  if (!(await Product.exists({ _id: productId }))) return { recorded: false };
  await Event.create({ userId, sessionKey: key, type, productId });
  return { recorded: true };
}

/** Các sản phẩm người dùng đã xem/thêm giỏ/mua gần đây (mới nhất trước, không trùng). */
export async function recentInteractions(userId, limit = 20) {
  const rows = await Event.find({ userId }).sort({ at: -1 }).limit(200).lean();
  const seen = [];
  for (const r of rows) {
    const id = String(r.productId);
    if (!seen.includes(id)) seen.push(id);
    if (seen.length >= limit) break;
  }
  return seen;
}
