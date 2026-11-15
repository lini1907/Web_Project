import { Order, User, AuditLog, deriveOrderStatus } from '../../models/index.js';
import { withTransaction } from '../../config/db.js';
import { Errors } from '../../utils/AppError.js';
import { paged } from '../../utils/validate.js';
import { escapeRegex } from '../../utils/text.js';
import { publish } from '../../services/realtime.js';
import * as shipments from '../shipments/shipment.service.js';
import {
  TRANSITIONS,
  STATUS_VI,
  isOnline,
  itemDto,
  paymentDto,
  productNames,
  restoreStock,
  releaseVoucherIfCancelled,
  markRefundIfNeeded,
} from '../orders/order.service.js';

/** Trạng thái cả đơn (suy ra từ các phần đơn) mà admin có thể lọc. */
export const ORDER_STATUSES = ['pending', 'processing', 'confirmed', 'shipping', 'delivered', 'cancelled'];

/**
 * deriveOrderStatus() viết lại bằng biểu thức aggregation để lọc + phân trang ngay trong MongoDB
 * (trạng thái cả đơn không được lưu riêng). Thứ tự nhánh $switch khớp đúng hàm JS.
 */
const derivedStatusExpr = {
  $let: {
    vars: {
      all: '$parts.status',
      active: { $filter: { input: '$parts.status', as: 's', cond: { $ne: ['$$s', 'cancelled'] } } },
    },
    in: {
      $switch: {
        branches: [
          { case: { $eq: [{ $size: '$$all' }, 0] }, then: 'pending' },
          { case: { $eq: [{ $size: '$$active' }, 0] }, then: 'cancelled' },
          { case: { $allElementsTrue: [{ $map: { input: '$$active', as: 's', in: { $eq: ['$$s', 'delivered'] } } }] }, then: 'delivered' },
          { case: { $anyElementTrue: [{ $map: { input: '$$active', as: 's', in: { $in: ['$$s', ['shipping', 'delivered']] } } }] }, then: 'shipping' },
          { case: { $allElementsTrue: [{ $map: { input: '$$active', as: 's', in: { $eq: ['$$s', 'confirmed'] } } }] }, then: 'confirmed' },
          { case: { $anyElementTrue: [{ $map: { input: '$$active', as: 's', in: { $eq: ['$$s', 'confirmed'] } } }] }, then: 'processing' },
        ],
        default: 'pending',
      },
    },
  },
};

const SORT_FIELDS = { createdAt: 'createdAt', total: 'total', code: 'code' };

/**
 * Các phần đơn còn hiệu lực (chưa hủy) có cùng trạng thái không? Admin chỉ đổi trạng thái CẢ ĐƠN khi chúng đồng nhất;
 * trạng thái lệch nhau (vd một nhà bán đã giao, một nhà bán chưa xác nhận) thì để từng nhà bán xử lý phần của mình.
 */
export function uniformStatus(parts) {
  const active = parts.filter((p) => p.status !== 'cancelled');
  if (active.length === 0) return null;
  const s = active[0].status;
  return active.every((p) => p.status === s) ? s : null;
}

function allowedNext(o) {
  const from = uniformStatus(o.parts);
  if (!from) return [];
  return TRANSITIONS[from].filter((s) => !(s === 'confirmed' && isOnline(o) && o.payment?.status !== 'paid'));
}

function lockReason(o) {
  const active = o.parts.filter((p) => p.status !== 'cancelled');
  if (active.length === 0) return 'Đơn đã bị hủy';
  if (!uniformStatus(o.parts)) return 'Các phần đơn đang ở trạng thái khác nhau — từng nhà bán tự xử lý phần của mình';
  const from = active[0].status;
  if (TRANSITIONS[from].length === 0) return 'Đơn đã hoàn tất';
  if (from === 'pending' && isOnline(o) && o.payment?.status !== 'paid') return 'Đơn thanh toán online chưa được thanh toán nên chưa thể xác nhận';
  return null;
}

function buyerDto(o, u) {
  return {
    id: String(o.buyerId),
    name: u?.name || o.shippingAddress?.name || '',
    email: u?.email || '',
    phone: u?.phone || o.shippingAddress?.phone || '',
  };
}

function toAdminRow(o, u) {
  const items = o.parts.flatMap((p) => p.items);
  return {
    id: String(o._id),
    code: o.code,
    source: o.source,
    createdAt: o.createdAt,
    buyer: buyerDto(o, u),
    vendors: o.parts.map((p) => p.vendorName),
    itemCount: items.reduce((s, i) => s + i.qty, 0),
    total: o.total,
    paymentMethod: o.paymentMethod || 'cod',
    paymentStatus: o.payment?.status || 'unpaid',
    status: deriveOrderStatus(o.parts),
  };
}

export async function toAdminDetail(o) {
  const [u, names, ships] = await Promise.all([
    User.findById(o.buyerId, { name: 1, email: 1, phone: 1 }).lean(),
    productNames(o.parts),
    shipments.shipmentMap([o._id]),
  ]);
  return {
    ...toAdminRow(o, u),
    parts: o.parts.map((p) => ({
      id: String(p._id),
      vendorId: String(p.vendorId),
      vendorName: p.vendorName,
      status: p.status,
      items: p.items.map((i) => itemDto(i, { forVendor: true, names })),
      subtotal: p.subtotal,
      cod: { status: p.cod?.status || 'unpaid', collectedAt: p.cod?.collectedAt || null },
      history: p.history,
      shipment: shipments.shipmentFor(ships, o._id, p._id),
    })),
    subtotal: o.subtotal,
    shippingFee: o.shippingFee,
    discount: o.discount || 0,
    voucher: o.voucher?.code ? { code: o.voucher.code, type: o.voucher.type } : null,
    payment: paymentDto(o),
    deliverySlot: o.deliverySlot || null,
    shippingAddress: o.shippingAddress,
    note: o.note,
    uniformStatus: uniformStatus(o.parts),
    nextStatuses: allowedNext(o),
    lockedReason: lockReason(o),
  };
}

/** Danh sách mọi đơn cho admin: lọc theo trạng thái cả đơn, tìm theo mã đơn / tên / email / SĐT người mua, phân trang. */
export async function listOrders({ status, q, sort, dir }, page) {
  const match = {};
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' };
    const buyers = await User.find({ $or: [{ name: rx }, { email: rx }, { phone: rx }] }, { _id: 1 }).limit(500).lean();
    match.$or = [{ code: rx }, { buyerId: { $in: buyers.map((b) => b._id) } }, { 'shippingAddress.name': rx }, { 'shippingAddress.phone': rx }];
  }
  const sortField = SORT_FIELDS[sort] || 'createdAt';
  const sortStage = { [sortField]: dir === 'asc' ? 1 : -1, _id: -1 };
  const statusMatch = status ? [{ $match: { _status: status } }] : [];
  const [res] = await Order.aggregate([
    { $match: match },
    { $addFields: { _status: derivedStatusExpr } },
    {
      $facet: {
        rows: [...statusMatch, { $sort: sortStage }, { $skip: page.skip }, { $limit: page.limit }],
        total: [...statusMatch, { $count: 'n' }],
        counts: [{ $group: { _id: '$_status', n: { $sum: 1 } } }],
      },
    },
  ]);
  const users = await User.find({ _id: { $in: res.rows.map((r) => r.buyerId) } }, { name: 1, email: 1, phone: 1 }).lean();
  const umap = new Map(users.map((u) => [String(u._id), u]));
  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  for (const c of res.counts) counts[c._id] = c.n;
  counts.all = res.counts.reduce((s, c) => s + c.n, 0);
  return {
    ...paged(
      res.rows.map((o) => toAdminRow(o, umap.get(String(o.buyerId)))),
      res.total[0]?.n || 0,
      page,
    ),
    counts,
  };
}

export async function getOrder(id) {
  const o = await Order.findById(id).lean();
  if (!o) throw Errors.notFound('Không tìm thấy đơn hàng');
  return toAdminDetail(o);
}

const ADMIN_STATUS_VI = { ...STATUS_VI, cancelled: 'đã bị quản trị viên hủy' };

/**
 * Admin đổi trạng thái CẢ ĐƠN: áp dụng cho mọi phần đơn chưa hủy, trong một transaction.
 * Mỗi phần đơn được cập nhật có điều kiện (đúng trạng thái cũ, chưa hoàn kho) — nếu bất kỳ phần nào vừa bị
 * nhà bán/người mua đổi trước, cả transaction rollback và trả 409, tránh hoàn kho hai lần.
 */
export async function updateStatus(actor, id, status, reason) {
  const result = await withTransaction(async (session) => {
    const o = await Order.findById(id).session(session);
    if (!o) throw Errors.notFound('Không tìm thấy đơn hàng');
    const active = o.parts.filter((p) => p.status !== 'cancelled');
    if (active.length === 0) throw Errors.invalidState('Đơn đã bị hủy, không thể đổi trạng thái');
    const from = uniformStatus(o.parts);
    if (!from) throw Errors.invalidState('Các phần đơn đang ở trạng thái khác nhau, không thể đổi trạng thái cả đơn');
    if (!TRANSITIONS[from].includes(status)) throw Errors.invalidState(`Không thể chuyển đơn từ "${from}" sang "${status}"`);
    if (status === 'confirmed' && isOnline(o) && o.payment?.status !== 'paid') {
      throw Errors.invalidState('Đơn thanh toán online chưa được người mua thanh toán, chưa thể xác nhận');
    }
    const before = { status: deriveOrderStatus(o.parts), parts: o.parts.map((p) => ({ vendorName: p.vendorName, status: p.status })) };
    const at = new Date();
    for (const part of active) {
      const set = { 'parts.$.status': status };
      if (status === 'cancelled') set['parts.$.stockRestored'] = true;
      const r = await Order.updateOne(
        { _id: o._id, parts: { $elemMatch: { _id: part._id, status: from, ...(status === 'cancelled' ? { stockRestored: false } : {}) } } },
        { $set: set, $push: { 'parts.$.history': { status, by: 'admin', at, ...(reason ? { note: reason } : {}) } } },
        { session },
      );
      if (r.modifiedCount !== 1) throw Errors.invalidState('Đơn vừa được cập nhật bởi thao tác khác, vui lòng tải lại');
      if (status === 'cancelled') await restoreStock(part, session);
      if (status === 'shipping') await shipments.ensureShipment(o, part, { note: 'Quản trị viên chuyển sang đang giao' }, session);
      if (status === 'delivered') await shipments.pushEvent(o._id, part._id, 'delivered', 'Giao hàng thành công', session);
    }
    const fresh = await Order.findById(o._id).session(session).lean();
    if (status === 'cancelled') {
      await releaseVoucherIfCancelled(fresh, session);
      await markRefundIfNeeded(fresh, session);
    }
    await audit(
      actor,
      {
        action: `order.${status}`,
        targetType: 'order',
        targetId: String(o._id),
        targetLabel: `Đơn ${o.code}`,
        before,
        after: { status: deriveOrderStatus(fresh.parts), parts: fresh.parts.map((p) => ({ vendorName: p.vendorName, status: p.status })) },
        reason,
      },
      session,
    );
    return { buyerId: o.buyerId, vendorIds: active.map((p) => p.vendorId), code: o.code };
  });
  const message = `Đơn ${result.code} ${ADMIN_STATUS_VI[status] || status}`;
  publish(result.buyerId, 'order.updated', { orderId: String(id), code: result.code, status, message });
  publish(result.vendorIds, 'order.updated', { orderId: String(id), code: result.code, status, message });
  return getOrder(id);
}

/** Ghi nhật ký thao tác quản trị (dùng chung cho user/vendor/order). */
export async function audit(actor, { action, targetType, targetId, targetLabel, before, after, reason }, session = null) {
  const doc = { actorId: actor._id, actorEmail: actor.email, action, targetType, targetId, targetLabel, before, after, reason };
  if (session) await AuditLog.create([doc], { session });
  else await AuditLog.create(doc);
}
