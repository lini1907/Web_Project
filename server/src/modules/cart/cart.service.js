import mongoose from 'mongoose';
import { Cart, Product, MysteryBox, User } from '../../models/index.js';
import { Errors } from '../../utils/AppError.js';
import { shippingFeeFor, FREE_SHIPPING_FROM, SHIPPING_FEE } from '../../utils/money.js';
import { availableStock, purchasableReason, isRescueActive } from '../products/product.dto.js';
import { boxesAvailable } from '../mystery/mystery.service.js';

const WARN_MESSAGES = {
  INACTIVE: 'Sản phẩm đã ngừng bán',
  RESCUE_EXPIRED: 'Hàng giải cứu đã hết hạn bán',
  OUT_OF_STOCK: 'Đã hết hàng',
  INSUFFICIENT: 'Không đủ số lượng',
};

/**
 * Dựng các dòng giỏ hàng với GIÁ HIỆN TẠI đọc từ database (không tin giá client).
 * Dùng chung cho GET /cart và POST /orders (truyền session để đọc trong transaction).
 */
export async function resolveLines(items, session = null) {
  const productIds = items.filter((i) => i.kind === 'product').map((i) => i.productId);
  const boxIds = items.filter((i) => i.kind === 'box').map((i) => i.boxId);
  const boxes = await MysteryBox.find({ _id: { $in: boxIds } }).session(session).lean();
  const componentIds = boxes.flatMap((b) => b.components.map((c) => c.productId));
  const products = await Product.find({ _id: { $in: [...productIds, ...componentIds] } })
    .populate('farmId', 'name slug')
    .session(session)
    .lean();
  const pmap = new Map(products.map((p) => [String(p._id), p]));
  const bmap = new Map(boxes.map((b) => [String(b._id), b]));
  const vendorIds = [...new Set([...products.map((p) => String(p.vendorId)), ...boxes.map((b) => String(b.vendorId))])];
  const vendors = await User.find({ _id: { $in: vendorIds } }, { name: 1, vendorStatus: 1, status: 1 }).session(session).lean();
  const vmap = new Map(vendors.map((x) => [String(x._id), x]));
  const vendorOk = (id) => {
    const vd = vmap.get(String(id));
    return vd && vd.vendorStatus === 'approved' && vd.status === 'active';
  };

  const lines = items.map((item) => {
    if (item.kind === 'product') {
      const p = pmap.get(String(item.productId));
      let reason = p ? purchasableReason(p) : 'INACTIVE';
      if (p && !vendorOk(p.vendorId)) reason = 'INACTIVE';
      const available = p ? availableStock(p) : 0;
      if (!reason && item.qty > available) reason = 'INSUFFICIENT';
      return {
        id: String(item._id),
        kind: 'product',
        productId: String(item.productId),
        name: p?.name || 'Sản phẩm không còn tồn tại',
        slug: p?.slug,
        image: p?.mainImage || '',
        unit: p?.unit || '',
        unitPrice: p?.price || 0,
        qty: item.qty,
        lineTotal: (p?.price || 0) * item.qty,
        available,
        isRescue: !!(p && isRescueActive(p)),
        rescueExpiresAt: p?.type === 'rescue' ? p.rescue?.expiresAt : null,
        farm: p?.farmId?.name ? { name: p.farmId.name, slug: p.farmId.slug } : null,
        vendor: p ? { id: String(p.vendorId), name: vmap.get(String(p.vendorId))?.name || '' } : null,
        warning: reason ? { code: reason, message: WARN_MESSAGES[reason] } : null,
      };
    }
    const b = bmap.get(String(item.boxId));
    let reason = !b || !b.isActive || !vendorOk(b.vendorId) ? 'INACTIVE' : null;
    const available = b ? boxesAvailable(b, pmap) : 0;
    if (!reason && available <= 0) reason = 'OUT_OF_STOCK';
    if (!reason && item.qty > available) reason = 'INSUFFICIENT';
    return {
      id: String(item._id),
      kind: 'box',
      boxId: String(item.boxId),
      name: b?.name || 'Hộp không còn tồn tại',
      slug: b?.slug,
      image: b?.image || '',
      unit: 'hộp',
      unitPrice: b?.price || 0,
      qty: item.qty,
      lineTotal: (b?.price || 0) * item.qty,
      available,
      isRescue: false,
      vendor: b ? { id: String(b.vendorId), name: vmap.get(String(b.vendorId))?.name || '' } : null,
      warning: reason ? { code: reason, message: WARN_MESSAGES[reason] } : null,
      _box: b,
    };
  });
  return { lines, pmap, bmap };
}

export function summarize(lines) {
  const valid = lines.filter((l) => !l.warning);
  const subtotal = valid.reduce((s, l) => s + l.lineTotal, 0);
  const shippingFee = shippingFeeFor(subtotal);
  return {
    items: lines.map(({ _box, ...rest }) => rest),
    itemCount: lines.reduce((s, l) => s + l.qty, 0),
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    shippingRule: { fee: SHIPPING_FEE, freeFrom: FREE_SHIPPING_FROM },
    hasIssues: lines.some((l) => l.warning),
  };
}

async function getOrCreate(userId) {
  return (await Cart.findOne({ userId })) || new Cart({ userId, items: [] });
}

export async function getCart(userId) {
  const cart = await Cart.findOne({ userId }).lean();
  const { lines } = await resolveLines(cart?.items || []);
  return summarize(lines);
}

const sameLine = (kind, productId, boxId) => (i) =>
  kind === 'product' ? String(i.productId) === String(productId) : String(i.boxId) === String(boxId);

/** Kiểm tra có thể giữ `newQty` cho một dòng (giá, tồn kho, hạn giải cứu đọc từ DB). Dùng chung cho giỏ DB và giỏ session. */
async function assertCanHold({ kind, productId, boxId }, newQty, inCart) {
  const { lines } = await resolveLines([{ _id: 'probe', kind, productId, boxId, qty: newQty }]);
  const line = lines[0];
  if (line.warning && line.warning.code !== 'INSUFFICIENT') {
    const status = line.warning.code === 'RESCUE_EXPIRED' ? 'RESCUE_EXPIRED' : line.warning.code === 'INACTIVE' ? 'NOT_FOUND' : 'OUT_OF_STOCK';
    if (status === 'NOT_FOUND') throw Errors.notFound('Sản phẩm không tồn tại hoặc đã ngừng bán');
    throw Errors.conflict(status, line.warning.message, [{ id: productId || boxId, available: line.available }]);
  }
  if (line.warning) {
    throw Errors.conflict('OUT_OF_STOCK', `Chỉ còn ${line.available} ${line.unit} trong kho`, [
      { id: productId || boxId, available: line.available, inCart },
    ]);
  }
  if (newQty > 99) throw Errors.validation([{ field: 'qty', message: 'Tối đa 99 cho mỗi sản phẩm' }]);
}

export async function addItem(userId, { productId, boxId, qty }) {
  const cart = await getOrCreate(userId);
  const kind = productId ? 'product' : 'box';
  const existing = cart.items.find(sameLine(kind, productId, boxId));
  const newQty = (existing?.qty || 0) + qty;
  await assertCanHold({ kind, productId, boxId }, newQty, existing?.qty || 0);
  if (existing) existing.qty = newQty;
  else cart.items.push({ kind, productId, boxId, qty });
  await cart.save();
  return getCart(userId);
}

export async function updateItem(userId, itemId, qty) {
  const cart = await Cart.findOne({ userId });
  const item = cart?.items.id(itemId);
  if (!item) throw Errors.notFound('Không có sản phẩm này trong giỏ');
  if (qty === 0) {
    item.deleteOne();
  } else {
    const { lines } = await resolveLines([{ ...item.toObject(), qty }]);
    const line = lines[0];
    if (line.warning?.code === 'INSUFFICIENT') {
      throw Errors.conflict('OUT_OF_STOCK', `Chỉ còn ${line.available} ${line.unit} trong kho`, [
        { id: String(item.productId || item.boxId), available: line.available },
      ]);
    }
    item.qty = qty;
  }
  await cart.save();
  return getCart(userId);
}

export async function clear(userId) {
  await Cart.updateOne({ userId }, { $set: { items: [] } });
  return getCart(userId);
}

/* ------------------------------------------------------------------------------------------
 * Giỏ hàng tạm cho KHÁCH CHƯA ĐĂNG NHẬP (Chương VIII – Session):
 *   - lưu trong req.session.guestCart (session lưu ở MongoDB qua connect-mongo, cookie "sid" HttpOnly);
 *   - chỉ lưu id + số lượng, giá luôn đọc lại từ DB khi hiển thị/đặt hàng;
 *   - khi đăng nhập bằng tài khoản người mua, giỏ tạm được gộp vào giỏ bền vững trong MongoDB (mergeGuestCart).
 * ---------------------------------------------------------------------------------------- */
const MAX_GUEST_LINES = 30;

const guestItems = (session) => (Array.isArray(session.guestCart?.items) ? session.guestCart.items : []);

function saveGuest(session, items) {
  // Gán lại object để express-session nhận biết thay đổi và lưu xuống store cuối request.
  session.guestCart = { items, updatedAt: new Date().toISOString() };
}

export async function getGuestCart(session) {
  const { lines } = await resolveLines(guestItems(session));
  return { ...summarize(lines), guest: true };
}

export async function addGuestItem(session, { productId, boxId, qty }) {
  const items = guestItems(session).map((i) => ({ ...i }));
  const kind = productId ? 'product' : 'box';
  const existing = items.find(sameLine(kind, productId, boxId));
  const newQty = (existing?.qty || 0) + qty;
  await assertCanHold({ kind, productId, boxId }, newQty, existing?.qty || 0);
  if (existing) existing.qty = newQty;
  else {
    if (items.length >= MAX_GUEST_LINES) {
      throw Errors.validation([{ field: 'cart', message: `Giỏ tạm tối đa ${MAX_GUEST_LINES} sản phẩm` }]);
    }
    items.push({ _id: new mongoose.Types.ObjectId().toString(), kind, productId, boxId, qty });
  }
  saveGuest(session, items);
  return getGuestCart(session);
}

export async function updateGuestItem(session, itemId, qty) {
  const items = guestItems(session).map((i) => ({ ...i }));
  const idx = items.findIndex((i) => String(i._id) === String(itemId));
  if (idx === -1) throw Errors.notFound('Không có sản phẩm này trong giỏ');
  if (qty === 0) items.splice(idx, 1);
  else {
    const it = items[idx];
    const { lines } = await resolveLines([{ ...it, qty }]);
    if (lines[0].warning?.code === 'INSUFFICIENT') {
      throw Errors.conflict('OUT_OF_STOCK', `Chỉ còn ${lines[0].available} ${lines[0].unit} trong kho`, [
        { id: String(it.productId || it.boxId), available: lines[0].available },
      ]);
    }
    it.qty = qty;
  }
  saveGuest(session, items);
  return getGuestCart(session);
}

export async function clearGuest(session) {
  saveGuest(session, []);
  return getGuestCart(session);
}

/**
 * Gộp giỏ tạm (session) vào giỏ của người mua trong MongoDB sau khi đăng nhập.
 * Dòng trùng thì cộng số lượng; vượt tồn kho/99 thì giảm về mức tối đa còn đặt được;
 * dòng không còn bán được thì bỏ qua. Trả về số dòng đã gộp/điều chỉnh/bỏ qua để client thông báo.
 */
export async function mergeGuestCart(userId, items) {
  const result = { merged: 0, adjusted: 0, skipped: 0 };
  if (!Array.isArray(items) || !items.length) return result;
  const cart = await getOrCreate(userId);
  for (const it of items) {
    const kind = it.kind === 'box' ? 'box' : 'product';
    const qty = Number.parseInt(it.qty, 10);
    const ref = kind === 'product' ? it.productId : it.boxId;
    if (!Number.isInteger(qty) || qty < 1 || !mongoose.isValidObjectId(ref)) {
      result.skipped += 1;
      continue;
    }
    const existing = cart.items.find(sameLine(kind, it.productId, it.boxId));
    const before = existing?.qty || 0;
    const want = Math.min(99, before + qty);
    const { lines } = await resolveLines([{ _id: 'probe', kind, productId: it.productId, boxId: it.boxId, qty: want }]);
    const line = lines[0];
    if (line.warning && line.warning.code !== 'INSUFFICIENT') {
      result.skipped += 1;
      continue;
    }
    const finalQty = line.warning ? Math.min(want, line.available) : want;
    if (finalQty <= before) {
      result.skipped += 1;
      continue;
    }
    if (finalQty < before + qty) result.adjusted += 1;
    if (existing) existing.qty = finalQty;
    else cart.items.push({ kind, productId: it.productId, boxId: it.boxId, qty: finalQty });
    result.merged += 1;
  }
  await cart.save();
  return result;
}
