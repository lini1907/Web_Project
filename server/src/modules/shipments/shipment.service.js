import crypto from 'node:crypto';
import { Shipment, CARRIER_LABELS } from '../../models/index.js';

/** Mã vận đơn nội bộ: FTS + 10 ký tự (khi nhà vườn tự giao hoặc chưa có mã của hãng). */
export function newTrackingCode() {
  return 'FTS' + crypto.randomBytes(5).toString('hex').toUpperCase();
}

const keyOf = (orderId, partId) => `${orderId}:${partId}`;

/**
 * Tạo vận đơn cho phần đơn nếu chưa có (gọi khi phần đơn chuyển sang "shipping").
 * Có rồi thì cập nhật hãng / mã vận đơn / ngày dự kiến nếu được truyền vào.
 */
export async function ensureShipment(order, part, { carrier, trackingCode: rawCode, estimatedDelivery, note } = {}, session) {
  const trackingCode = rawCode ? rawCode.toUpperCase() : undefined;
  let s = await Shipment.findOne({ orderId: order._id, partId: part._id }).session(session);
  if (!s) {
    [s] = await Shipment.create(
      [
        {
          orderId: order._id,
          orderCode: order.code,
          partId: part._id,
          vendorId: part.vendorId,
          buyerId: order.buyerId,
          carrier: carrier || 'self',
          trackingCode: trackingCode || newTrackingCode(),
          estimatedDelivery: estimatedDelivery || null,
          status: 'picked',
          events: [{ status: 'picked', note: note || 'Nhà bán đã đóng gói và bàn giao hàng' }],
        },
      ],
      { session },
    );
    return s;
  }
  if (carrier) s.carrier = carrier;
  if (trackingCode) s.trackingCode = trackingCode;
  if (estimatedDelivery !== undefined) s.estimatedDelivery = estimatedDelivery;
  await s.save({ session });
  return s;
}

/** Ghi thêm một mốc vào vận đơn (nếu có). */
export async function pushEvent(orderId, partId, status, note, session) {
  await Shipment.updateOne(
    { orderId, partId },
    { $set: { status }, $push: { events: { status, note: note || '', at: new Date() } } },
    { session },
  );
}

/** Lấy vận đơn của nhiều phần đơn: Map "orderId:partId" -> DTO. */
export async function shipmentMap(orderIds, session = null) {
  const rows = await Shipment.find({ orderId: { $in: orderIds } }).session(session).lean();
  return new Map(rows.map((s) => [keyOf(s.orderId, s.partId), toShipmentDto(s)]));
}

export function shipmentFor(map, orderId, partId) {
  return map.get(keyOf(orderId, partId)) || null;
}

export function toShipmentDto(s) {
  return {
    id: String(s._id),
    trackingCode: s.trackingCode,
    carrier: s.carrier,
    carrierLabel: CARRIER_LABELS[s.carrier] || s.carrier,
    status: s.status,
    estimatedDelivery: s.estimatedDelivery || null,
    events: (s.events || []).map((e) => ({ status: e.status, note: e.note, location: e.location, at: e.at })),
  };
}
