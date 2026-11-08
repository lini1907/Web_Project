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

export async function addItem(userId, { productId, boxId, qty }) {
  const cart = await getOrCreate(userId);
  const kind = productId ? 'product' : 'box';
  const existing = cart.items.find((i) =>
    kind === 'product' ? String(i.productId) === productId : String(i.boxId) === boxId,
  );
  const newQty = (existing?.qty || 0) + qty;
  const probe = [{ _id: existing?._id || 'new', kind, productId, boxId, qty: newQty }];
  const { lines } = await resolveLines(probe);
  const line = lines[0];
  if (line.warning && line.warning.code !== 'INSUFFICIENT') {
    const status = line.warning.code === 'RESCUE_EXPIRED' ? 'RESCUE_EXPIRED' : line.warning.code === 'INACTIVE' ? 'NOT_FOUND' : 'OUT_OF_STOCK';
    if (status === 'NOT_FOUND') throw Errors.notFound('Sản phẩm không tồn tại hoặc đã ngừng bán');
    throw Errors.conflict(status, line.warning.message, [{ id: productId || boxId, available: line.available }]);
  }
  if (line.warning) {
    throw Errors.conflict('OUT_OF_STOCK', `Chỉ còn ${line.available} ${line.unit} trong kho`, [
      { id: productId || boxId, available: line.available, inCart: existing?.qty || 0 },
    ]);
  }
  if (newQty > 99) throw Errors.validation([{ field: 'qty', message: 'Tối đa 99 cho mỗi sản phẩm' }]);
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
