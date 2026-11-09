import mongoose from 'mongoose';
import { Order, Product, MysteryBox, Cart, Counter, User, Event, deriveOrderStatus } from '../../models/index.js';
import { withTransaction } from '../../config/db.js';
import { AppError, Errors } from '../../utils/AppError.js';
import { shippingFeeFor } from '../../utils/money.js';
import { paged } from '../../utils/validate.js';
import { resolveLines, summarize } from '../cart/cart.service.js';
import * as vouchers from '../vouchers/voucher.service.js';
import * as shipments from '../shipments/shipment.service.js';
import { publish } from '../../services/realtime.js';

// Luồng trạng thái phần đơn (vendor). Không cho nhảy lùi.
export const TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered'],
  delivered: [],
  cancelled: [],
};

async function nextOrderCode(session) {
  const now = new Date(Date.now() + 7 * 3600 * 1000); // giờ Việt Nam
  const day = now.toISOString().slice(2, 10).replace(/-/g, '');
  const counter = await Counter.findOneAndUpdate(
    { _id: `order-${day}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after', session },
  );
  return `FT${day}${String(counter.seq).padStart(4, '0')}`;
}

/** Trừ kho có điều kiện (tồn khả dụng >= qty). Thất bại => ném OUT_OF_STOCK để transaction rollback. */
async function takeStock(productId, qty, session, name) {
  const r = await Product.updateOne(
    {
      _id: productId,
      isActive: true,
      $expr: { $gte: [{ $subtract: ['$stock', '$reservedStock'] }, qty] },
    },
    { $inc: { stock: -qty, soldCount: qty }, $set: { hasOrders: true } },
    { session },
  );
  if (r.modifiedCount !== 1) {
    throw Errors.conflict('OUT_OF_STOCK', `"${name}" không đủ hàng`, [{ productId: String(productId), name }]);
  }
}

/** Hoàn kho theo đúng các lần đã trừ (gọi trong transaction, sau khi đã giành được quyền hủy phần đơn). */
async function restoreStock(part, session) {
  for (const item of part.items) {
    for (const move of item.stockMoves) {
      await Product.updateOne({ _id: move.productId }, { $inc: { stock: move.qty, soldCount: -move.qty } }, { session });
    }
    if (item.kind === 'box' && item.boxId) {
      await MysteryBox.updateOne({ _id: item.boxId }, { $inc: { soldCount: -item.qty } }, { session });
    }
  }
}

function groupIntoParts(items, vendorNames) {
  const byVendor = new Map();
  for (const it of items) {
    const key = String(it.vendorId);
    if (!byVendor.has(key)) byVendor.set(key, []);
    byVendor.get(key).push(it);
  }
  return [...byVendor.entries()].map(([vendorId, list]) => ({
    vendorId,
    vendorName: vendorNames.get(vendorId) || '',
    items: list.map(({ vendorId: _v, ...rest }) => rest),
    subtotal: list.reduce((s, x) => s + x.lineTotal, 0),
    status: 'pending',
    history: [{ status: 'pending', by: 'buyer' }],
  }));
}

async function findByKey(buyerId, idempotencyKey) {
  if (!idempotencyKey) return null;
  return Order.findOne({ buyerId, idempotencyKey });
}

/**
 * Tạo đơn COD từ giỏ hàng. Toàn bộ chạy trong một transaction:
 * đọc giỏ + giá hiện tại -> kiểm tồn/hạn Rescue -> so expectedTotal -> trừ kho có điều kiện
 * -> tạo đơn (bản chụp giá) -> xóa giỏ. Bất kỳ lỗi nào cũng rollback toàn bộ.
 */
export async function createFromCart(buyer, { shippingAddress, note, expectedTotal, voucherCode, paymentMethod = 'cod', deliverySlot }, idempotencyKey) {
  const existing = await findByKey(buyer._id, idempotencyKey);
  if (existing) return { order: existing, replayed: true };

  try {
    const order = await withTransaction(async (session) => {
      const cart = await Cart.findOne({ userId: buyer._id }).session(session);
      if (!cart || cart.items.length === 0) throw new AppError(400, 'CART_EMPTY', 'Giỏ hàng đang trống');

      const { lines } = await resolveLines(cart.items, session);
      const problems = lines.filter((l) => l.warning);
      if (problems.length) {
        const code = problems.some((p) => p.warning.code === 'RESCUE_EXPIRED') ? 'RESCUE_EXPIRED' : 'OUT_OF_STOCK';
        throw Errors.conflict(
          code,
          code === 'RESCUE_EXPIRED' ? 'Có hàng giải cứu đã hết hạn bán' : 'Một số sản phẩm không đủ hàng',
          problems.map((p) => ({ itemId: p.id, name: p.name, available: p.available, reason: p.warning.code })),
        );
      }
      const summary = summarize(lines);
      if (expectedTotal !== undefined && expectedTotal !== summary.total) {
        throw Errors.conflict('PRICE_CHANGED', 'Giá hoặc phí ship đã thay đổi, vui lòng kiểm tra lại giỏ hàng', {
          expectedTotal,
          total: summary.total,
          cart: summary,
        });
      }

      const orderItems = [];
      for (const line of lines) {
        if (line.kind === 'product') {
          await takeStock(line.productId, line.qty, session, line.name);
          orderItems.push({
            vendorId: line.vendor.id,
            kind: 'product',
            productId: line.productId,
            name: line.name,
            unit: line.unit,
            image: line.image,
            unitPrice: line.unitPrice,
            qty: line.qty,
            lineTotal: line.lineTotal,
            isRescue: line.isRescue,
            stockMoves: [{ productId: line.productId, qty: line.qty }],
          });
        } else {
          // Mystery Box: trừ từng nguyên liệu trong cùng transaction; thiếu một thứ là rollback.
          const moves = [];
          for (const c of line._box.components) {
            await takeStock(c.productId, c.qty * line.qty, session, line.name);
            moves.push({ productId: c.productId, qty: c.qty * line.qty });
          }
          await MysteryBox.updateOne({ _id: line.boxId }, { $inc: { soldCount: line.qty } }, { session });
          orderItems.push({
            vendorId: line.vendor.id,
            kind: 'box',
            boxId: line.boxId,
            name: line.name,
            unit: 'hộp',
            image: line.image,
            unitPrice: line.unitPrice,
            qty: line.qty,
            lineTotal: line.lineTotal,
            stockMoves: moves,
          });
        }
      }

      const vendorNames = new Map(lines.map((l) => [l.vendor.id, l.vendor.name]));
      const subtotal = orderItems.reduce((s, x) => s + x.lineTotal, 0);
      const shippingFee = shippingFeeFor(subtotal);
      // Voucher: kiểm tra + trừ lượt trong cùng transaction (đặt đơn lỗi thì lượt dùng cũng được hoàn).
      const applied = voucherCode ? await vouchers.redeem(voucherCode, buyer._id, { subtotal, shippingFee }, session) : null;
      const discount = applied?.discount || 0;
      const [created] = await Order.create(
        [
          {
            code: await nextOrderCode(session),
            buyerId: buyer._id,
            idempotencyKey: idempotencyKey || undefined,
            source: 'checkout',
            parts: groupIntoParts(orderItems, vendorNames),
            subtotal,
            shippingFee,
            discount,
            voucher: applied ? { code: applied.code, type: applied.type } : null,
            total: subtotal + shippingFee - discount,
            paymentMethod,
            payment: { status: paymentMethod === 'cod' ? 'unpaid' : 'pending' },
            deliverySlot: deliverySlot || null,
            shippingAddress,
            note: note || '',
          },
        ],
        { session },
      );
      cart.items = [];
      await cart.save({ session });
      await Event.insertMany(
        orderItems
          .filter((i) => i.kind === 'product')
          .map((i) => ({ userId: buyer._id, type: 'purchase', productId: i.productId })),
        { session },
      );
      return created;
    });
    // Báo ngay cho các nhà bán có hàng trong đơn (SSE).
    publish(
      order.parts.map((p) => p.vendorId),
      'order.created',
      { orderId: String(order._id), code: order.code, message: `Có đơn mới ${order.code}` },
    );
    return { order, replayed: false };
  } catch (err) {
    // Hai request cùng Idempotency-Key chạy song song: request thua sẽ vấp unique index -> trả đơn đã tạo.
    if (err?.code === 11000 && idempotencyKey) {
      const again = await findByKey(buyer._id, idempotencyKey);
      if (again) return { order: again, replayed: true };
    }
    throw err;
  }
}

/** Sinh đơn COD cho một thành viên mua chung (gọi bởi worker trong transaction). Chuyển giữ chỗ thành trừ kho. */
export async function createGroupBuyOrder({ campaign, membership, product, vendorName }, session) {
  const qty = membership.qty;
  const r = await Product.updateOne(
    { _id: product._id, stock: { $gte: qty }, reservedStock: { $gte: qty } },
    { $inc: { stock: -qty, reservedStock: -qty, soldCount: qty }, $set: { hasOrders: true } },
    { session },
  );
  if (r.modifiedCount !== 1) throw new Error(`Không chuyển được giữ chỗ thành trừ kho cho membership ${membership._id}`);
  const lineTotal = campaign.groupPrice * qty;
  const shippingFee = shippingFeeFor(lineTotal);
  const [order] = await Order.create(
    [
      {
        code: await nextOrderCode(session),
        buyerId: membership.userId,
        idempotencyKey: `groupbuy:${membership._id}`,
        source: 'group-buy',
        groupBuyId: campaign._id,
        parts: [
          {
            vendorId: campaign.vendorId,
            vendorName,
            items: [
              {
                kind: 'group-buy',
                productId: product._id,
                name: product.name,
                unit: product.unit,
                image: product.mainImage,
                unitPrice: campaign.groupPrice,
                qty,
                lineTotal,
                stockMoves: [{ productId: product._id, qty, fromReserved: true }],
              },
            ],
            subtotal: lineTotal,
            status: 'pending',
            history: [{ status: 'pending', by: 'system' }],
          },
        ],
        subtotal: lineTotal,
        shippingFee,
        total: lineTotal + shippingFee,
        shippingAddress: membership.shippingAddress,
        note: `Đơn mua chung: ${campaign.title || product.name}`,
      },
    ],
    { session },
  );
  await Event.create([{ userId: membership.userId, type: 'purchase', productId: product._id }], { session });
  return order;
}

/** Cả đơn đã hủy hết => trả lại lượt dùng voucher (chỉ một lần nhờ $pull/usedBy). */
async function releaseVoucherIfCancelled(order, session) {
  if (order?.voucher?.code && order.parts.every((p) => p.status === 'cancelled')) {
    await vouchers.release(order.voucher.code, order.buyerId, session);
  }
}

export const isOnline = (o) => !!o.paymentMethod && o.paymentMethod !== 'cod';

function paymentDto(o) {
  const p = o.payment || {};
  return { status: p.status || 'unpaid', transactionId: p.transactionId || null, paidAt: p.paidAt || null, message: p.message || '' };
}

/** Phần đơn bị hủy hết và đơn đã thanh toán online => chờ hoàn tiền (xử lý thủ công với cổng). */
async function markRefundIfNeeded(order, session) {
  if (isOnline(order) && order.payment?.status === 'paid' && order.parts.every((p) => p.status === 'cancelled')) {
    await Order.updateOne({ _id: order._id }, { $set: { 'payment.status': 'refund_pending' } }, { session });
  }
}

// ---------------- DTO ----------------
function itemDto(i, { forVendor = false, names } = {}) {
  const dto = {
    id: String(i._id),
    kind: i.kind,
    productId: i.productId ? String(i.productId) : null,
    boxId: i.boxId ? String(i.boxId) : null,
    name: i.name,
    unit: i.unit,
    image: i.image,
    unitPrice: i.unitPrice,
    qty: i.qty,
    lineTotal: i.lineTotal,
    isRescue: i.isRescue,
  };
  // Vendor cần biết thành phần hộp bí ẩn để đóng gói; người mua thì không.
  if (forVendor && i.kind === 'box') {
    dto.contents = i.stockMoves.map((m) => ({ productId: String(m.productId), name: names?.get(String(m.productId)) || '', qty: m.qty }));
  }
  return dto;
}

export function toBuyerOrder(o, ships = null) {
  const status = deriveOrderStatus(o.parts);
  return {
    id: String(o._id),
    code: o.code,
    source: o.source,
    groupBuyId: o.groupBuyId ? String(o.groupBuyId) : null,
    parts: o.parts.map((p) => ({
      id: String(p._id),
      vendor: { id: String(p.vendorId), name: p.vendorName },
      status: p.status,
      items: p.items.map((i) => itemDto(i)),
      subtotal: p.subtotal,
      cod: { status: p.cod?.status || 'unpaid', collectedAt: p.cod?.collectedAt || null },
      history: p.history,
      shipment: ships ? shipments.shipmentFor(ships, o._id, p._id) : null,
    })),
    subtotal: o.subtotal,
    shippingFee: o.shippingFee,
    discount: o.discount || 0,
    voucher: o.voucher?.code ? { code: o.voucher.code, type: o.voucher.type } : null,
    total: o.total,
    paymentMethod: o.paymentMethod || 'cod',
    payment: paymentDto(o),
    deliverySlot: o.deliverySlot || null,
    status,
    canCancel: o.parts.some((p) => p.status === 'pending'),
    canPay: isOnline(o) && ['pending', 'failed'].includes(o.payment?.status) && o.parts.some((p) => p.status === 'pending'),
    shippingAddress: o.shippingAddress,
    note: o.note,
    createdAt: o.createdAt,
  };
}

export function toVendorPart(o, p, names, ships = null) {
  return {
    orderId: String(o._id),
    partId: String(p._id),
    code: o.code,
    source: o.source,
    createdAt: o.createdAt,
    buyer: { name: o.shippingAddress?.name, phone: o.shippingAddress?.phone, address: o.shippingAddress?.address },
    note: o.note,
    items: p.items.map((i) => itemDto(i, { forVendor: true, names })),
    subtotal: p.subtotal,
    status: p.status,
    nextStatuses: TRANSITIONS[p.status],
    cod: { status: p.cod?.status || 'unpaid', collectedAt: p.cod?.collectedAt || null },
    history: p.history,
    paymentMethod: o.paymentMethod || 'cod',
    paymentStatus: o.payment?.status || 'unpaid',
    // Đơn thanh toán online chỉ được xác nhận khi đã trả tiền xong.
    awaitingPayment: isOnline(o) && o.payment?.status !== 'paid',
    deliverySlot: o.deliverySlot || null,
    shipment: ships ? shipments.shipmentFor(ships, o._id, p._id) : null,
  };
}

async function productNames(parts) {
  const ids = parts.flatMap((p) => p.items.flatMap((i) => i.stockMoves.map((m) => m.productId)));
  const rows = await Product.find({ _id: { $in: ids } }, { name: 1 }).lean();
  return new Map(rows.map((r) => [String(r._id), r.name]));
}

// ---------------- Buyer ----------------
export async function listForBuyer(buyerId, page, status) {
  const filter = { buyerId };
  const [rows, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).lean(),
    Order.countDocuments(filter),
  ]);
  let list = rows.map(toBuyerOrder);
  if (status) list = list.filter((o) => o.status === status);
  const count = status ? list.length : total;
  return paged(list.slice(page.skip, page.skip + page.limit), count, page);
}

export async function getForBuyer(buyerId, id) {
  const o = await Order.findOne({ _id: id, buyerId }).lean();
  // Không phải đơn của mình -> 404 (không tiết lộ đơn tồn tại).
  if (!o) throw Errors.notFound('Không tìm thấy đơn hàng');
  return toBuyerOrder(o, await shipments.shipmentMap([o._id]));
}

/** Buyer hủy các phần đơn còn pending. Mỗi phần đơn chỉ được giành quyền hủy một lần => hoàn kho đúng một lần. */
export async function cancelByBuyer(buyerId, id) {
  return withTransaction(async (session) => {
    const o = await Order.findOne({ _id: id, buyerId }).session(session);
    if (!o) throw Errors.notFound('Không tìm thấy đơn hàng');
    const pending = o.parts.filter((p) => p.status === 'pending');
    if (pending.length === 0) throw Errors.invalidState('Chỉ hủy được khi phần đơn còn ở trạng thái chờ xác nhận');
    for (const part of pending) {
      const r = await Order.updateOne(
        { _id: o._id, parts: { $elemMatch: { _id: part._id, status: 'pending', stockRestored: false } } },
        {
          $set: { 'parts.$.status': 'cancelled', 'parts.$.stockRestored': true },
          $push: { 'parts.$.history': { status: 'cancelled', by: 'buyer', at: new Date() } },
        },
        { session },
      );
      if (r.modifiedCount === 1) await restoreStock(part, session);
    }
    const fresh = await Order.findById(o._id).session(session).lean();
    await releaseVoucherIfCancelled(fresh, session);
    await markRefundIfNeeded(fresh, session);
    publish(
      pending.map((p) => p.vendorId),
      'order.updated',
      { orderId: String(o._id), code: o.code, status: 'cancelled', message: `Người mua đã hủy đơn ${o.code}` },
    );
    return toBuyerOrder(await Order.findById(o._id).session(session).lean());
  });
}

// ---------------- Vendor ----------------
export async function listForVendor(vendorId, page, status) {
  const vid = new mongoose.Types.ObjectId(String(vendorId));
  const partMatch = { 'parts.vendorId': vid };
  if (status) partMatch['parts.status'] = status;
  const [res] = await Order.aggregate([
    { $match: { 'parts.vendorId': vid } },
    { $sort: { createdAt: -1 } },
    { $unwind: '$parts' },
    { $match: partMatch },
    { $facet: { rows: [{ $skip: page.skip }, { $limit: page.limit }], total: [{ $count: 'n' }] } },
  ]);
  const rows = res.rows;
  const names = await productNames(rows.map((r) => r.parts));
  const ships = await shipments.shipmentMap(rows.map((r) => r._id));
  return paged(
    rows.map((r) => toVendorPart(r, r.parts, names, ships)),
    res.total[0]?.n || 0,
    page,
  );
}

async function loadVendorPart(vendorId, orderId, partId, session) {
  const o = await Order.findOne({ _id: orderId, 'parts._id': partId }).session(session);
  const part = o?.parts.id(partId);
  if (!part || String(part.vendorId) !== String(vendorId)) throw Errors.notFound('Không tìm thấy phần đơn');
  return { o, part };
}

const STATUS_VI = { confirmed: 'đã được xác nhận', shipping: 'đang được giao', delivered: 'đã giao thành công', cancelled: 'đã bị nhà bán hủy' };

export async function vendorUpdateStatus(vendorId, orderId, partId, status, shipmentInfo = {}) {
  const result = await withTransaction(async (session) => {
    const { o, part } = await loadVendorPart(vendorId, orderId, partId, session);
    if (!TRANSITIONS[part.status].includes(status)) {
      throw Errors.invalidState(`Không thể chuyển từ "${part.status}" sang "${status}"`);
    }
    if (status === 'confirmed' && isOnline(o) && o.payment?.status !== 'paid') {
      throw Errors.invalidState('Đơn thanh toán online chưa được người mua thanh toán, chưa thể xác nhận');
    }
    const set = { 'parts.$.status': status };
    if (status === 'cancelled') set['parts.$.stockRestored'] = true;
    const r = await Order.updateOne(
      { _id: o._id, parts: { $elemMatch: { _id: part._id, status: part.status, ...(status === 'cancelled' ? { stockRestored: false } : {}) } } },
      { $set: set, $push: { 'parts.$.history': { status, by: 'vendor', at: new Date() } } },
      { session },
    );
    if (r.modifiedCount !== 1) throw Errors.invalidState('Phần đơn vừa được cập nhật bởi thao tác khác, vui lòng tải lại');
    if (status === 'cancelled') await restoreStock(part, session);
    // Vận đơn: bắt đầu giao => tạo vận đơn; giao xong => đóng vận đơn.
    if (status === 'shipping') await shipments.ensureShipment(o, part, shipmentInfo, session);
    if (status === 'delivered') await shipments.pushEvent(o._id, part._id, 'delivered', 'Giao hàng thành công', session);
    const fresh = await Order.findById(o._id).session(session).lean();
    if (status === 'cancelled') {
      await releaseVoucherIfCancelled(fresh, session);
      await markRefundIfNeeded(fresh, session);
    }
    const names = await productNames([part]);
    const ships = await shipments.shipmentMap([o._id], session);
    return { buyerId: o.buyerId, code: o.code, dto: toVendorPart(fresh, fresh.parts.find((p) => String(p._id) === String(part._id)), names, ships) };
  });
  publish(result.buyerId, 'order.updated', {
    orderId: String(orderId),
    partId: String(partId),
    code: result.code,
    status,
    message: `Đơn ${result.code} ${STATUS_VI[status] || status}`,
  });
  return result.dto;
}

/** Vendor xác nhận đã thu tiền COD — chỉ khi phần đơn đã giao. Buyer không có endpoint này. */
export async function vendorCollectCod(vendorId, orderId, partId) {
  const { o, part } = await loadVendorPart(vendorId, orderId, partId, null);
  if (part.status !== 'delivered') throw Errors.invalidState('Chỉ xác nhận thu tiền khi đơn đã giao thành công');
  if (part.cod?.status === 'collected') throw Errors.invalidState('Phần đơn này đã được xác nhận thu tiền');
  await Order.updateOne(
    { _id: o._id, 'parts._id': part._id },
    { $set: { 'parts.$.cod.status': 'collected', 'parts.$.cod.collectedAt': new Date() } },
  );
  const fresh = await Order.findById(o._id).lean();
  const names = await productNames([part]);
  const ships = await shipments.shipmentMap([o._id]);
  return toVendorPart(fresh, fresh.parts.find((p) => String(p._id) === String(part._id)), names, ships);
}

/** Dùng chung cho các route vận đơn: trả DTO phần đơn mới nhất. */
export async function vendorPartView(vendorId, orderId, partId) {
  const { o, part } = await loadVendorPart(vendorId, orderId, partId, null);
  const fresh = await Order.findById(o._id).lean();
  const names = await productNames([part]);
  const ships = await shipments.shipmentMap([o._id]);
  return toVendorPart(fresh, fresh.parts.find((p) => String(p._id) === String(part._id)), names, ships);
}

export { loadVendorPart };

export async function buyerNameMap(ids) {
  const rows = await User.find({ _id: { $in: ids } }, { name: 1 }).lean();
  return new Map(rows.map((r) => [String(r._id), r.name]));
}
