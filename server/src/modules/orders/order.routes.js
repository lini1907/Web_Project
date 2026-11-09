import { Router } from 'express';
import * as service from './order.service.js';
import { requireRole } from '../../middleware/auth.js';
import { limits } from '../../middleware/security.js';
import { parse, v, pageParams, qstr, assertId } from '../../utils/validate.js';
import { Errors } from '../../utils/AppError.js';
import { PART_STATUSES, PAYMENT_METHODS, DELIVERY_WINDOWS, CARRIERS, SHIPMENT_FLOW, Shipment } from '../../models/index.js';
import { enabledMethods } from '../payments/payment.config.js';
import * as shipments from '../shipments/shipment.service.js';
import { publish } from '../../services/realtime.js';

const router = Router();

export const addressShape = v.object({
  name: v.string({ min: 2, max: 80 }),
  phone: v.phone(),
  address: v.string({ min: 10, max: 300 }),
});

export function readIdempotencyKey(req, required = true) {
  const key = req.get('Idempotency-Key');
  if (!key) {
    if (required) throw Errors.validation([{ field: 'Idempotency-Key', message: 'Thiếu header Idempotency-Key' }]);
    return undefined;
  }
  if (!/^[A-Za-z0-9-]{8,64}$/.test(key)) {
    throw Errors.validation([{ field: 'Idempotency-Key', message: 'Idempotency-Key không hợp lệ' }]);
  }
  return key;
}

/** Ngày nhận hàng: từ ngày mai đến 7 ngày tới (theo giờ Việt Nam). */
function checkSlotDate(date) {
  const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const max = new Date(Date.now() + 7 * 3600e3 + 7 * 86400e3).toISOString().slice(0, 10);
  if (Number.isNaN(new Date(date).getTime()) || date <= today || date > max) {
    throw Errors.validation([{ field: 'deliverySlot.date', message: 'Chọn ngày nhận từ ngày mai đến 7 ngày tới' }]);
  }
}

// ----- Buyer -----
router.post('/orders', requireRole('buyer'), limits.placeOrder, async (req, res) => {
  const body = parse(
    {
      shippingAddress: addressShape,
      note: v.string({ min: 0, max: 500 }).optional(),
      expectedTotal: v.int({ min: 0 }).optional(),
      voucherCode: v.string({ min: 1, max: 30 }).optional(),
      paymentMethod: v.enum(PAYMENT_METHODS).default('cod'),
      deliverySlot: v
        .object({ date: v.string({ min: 10, max: 10, pattern: /^\d{4}-\d{2}-\d{2}$/, message: 'Ngày dạng YYYY-MM-DD' }), window: v.enum(Object.keys(DELIVERY_WINDOWS)) })
        .optional(),
    },
    req.body,
  );
  if (!enabledMethods()[body.paymentMethod]) {
    throw Errors.validation([{ field: 'paymentMethod', message: 'Phương thức thanh toán này chưa được hỗ trợ' }]);
  }
  if (body.deliverySlot) checkSlotDate(body.deliverySlot.date);
  const key = readIdempotencyKey(req);
  const { order, replayed } = await service.createFromCart(req.user, body, key);
  res.status(replayed ? 200 : 201).json(service.toBuyerOrder(order.toObject ? order.toObject() : order));
});

router.get('/orders', requireRole('buyer'), async (req, res) => {
  res.json(await service.listForBuyer(req.user._id, pageParams(req.query, { defLimit: 10 }), qstr(req.query.status)));
});

router.get('/orders/:id', requireRole('buyer'), async (req, res) => {
  res.json(await service.getForBuyer(req.user._id, assertId(req.params.id, 'Không tìm thấy đơn hàng')));
});

router.post('/orders/:id/cancel', requireRole('buyer'), async (req, res) => {
  res.json(await service.cancelByBuyer(req.user._id, assertId(req.params.id, 'Không tìm thấy đơn hàng')));
});

// ----- Vendor: chỉ thấy và xử lý PHẦN ĐƠN của mình -----
router.get('/vendor/orders', requireRole('vendor'), async (req, res) => {
  const status = qstr(req.query.status);
  res.json(
    await service.listForVendor(req.user._id, pageParams(req.query, { defLimit: 20 }), PART_STATUSES.includes(status) ? status : undefined),
  );
});

const shipmentShape = {
  carrier: v.enum(CARRIERS).optional(),
  trackingCode: v.string({ min: 4, max: 40, pattern: /^[A-Za-z0-9-]+$/, message: 'Mã vận đơn chỉ gồm chữ, số và "-"' }).optional(),
  estimatedDelivery: v.date().nullable(),
  note: v.string({ min: 0, max: 200 }).optional(),
};

async function assertTrackingFree(code, orderId, partId) {
  if (!code) return;
  const other = await Shipment.findOne({ trackingCode: code.toUpperCase() }, { orderId: 1, partId: 1 }).lean();
  if (other && !(String(other.orderId) === String(orderId) && String(other.partId) === String(partId))) {
    throw Errors.conflict('TRACKING_TAKEN', 'Mã vận đơn đã được dùng cho đơn khác', [{ field: 'trackingCode', message: 'Mã vận đơn đã tồn tại' }]);
  }
}

router.patch('/vendor/orders/:orderId/parts/:partId', requireRole('vendor'), async (req, res) => {
  const { status, ...ship } = parse({ status: v.enum(PART_STATUSES), ...shipmentShape }, req.body);
  const orderId = assertId(req.params.orderId);
  const partId = assertId(req.params.partId);
  if (status === 'shipping') await assertTrackingFree(ship.trackingCode, orderId, partId);
  res.json(await service.vendorUpdateStatus(req.user._id, orderId, partId, status, ship));
});

/** Sửa thông tin vận đơn (hãng, mã vận đơn, ngày dự kiến) khi đang giao. */
router.patch('/vendor/orders/:orderId/parts/:partId/shipment', requireRole('vendor'), async (req, res) => {
  const body = parse(shipmentShape, req.body);
  const orderId = assertId(req.params.orderId);
  const partId = assertId(req.params.partId);
  const { o, part } = await service.loadVendorPart(req.user._id, orderId, partId, null);
  if (part.status !== 'shipping') throw Errors.invalidState('Chỉ cập nhật vận đơn khi phần đơn đang giao');
  await assertTrackingFree(body.trackingCode, orderId, partId);
  await shipments.ensureShipment(o, part, body, null);
  res.json(await service.vendorPartView(req.user._id, orderId, partId));
});

/** Thêm mốc hành trình giao hàng (đã lấy hàng, đang trung chuyển, đang đi giao, giao thất bại...). */
router.post('/vendor/orders/:orderId/parts/:partId/shipment/events', requireRole('vendor'), async (req, res) => {
  const body = parse(
    {
      status: v.enum(['in_transit', 'out_for_delivery', 'failed']),
      note: v.string({ min: 0, max: 200 }).optional(),
      location: v.string({ min: 0, max: 120 }).optional(),
    },
    req.body,
  );
  const orderId = assertId(req.params.orderId);
  const partId = assertId(req.params.partId);
  const { o, part } = await service.loadVendorPart(req.user._id, orderId, partId, null);
  if (part.status !== 'shipping') throw Errors.invalidState('Chỉ cập nhật hành trình khi phần đơn đang giao');
  const s = await Shipment.findOne({ orderId, partId });
  if (!s) throw Errors.notFound('Phần đơn chưa có vận đơn');
  if (!SHIPMENT_FLOW[s.status].includes(body.status)) throw Errors.invalidState(`Không thể chuyển vận đơn từ "${s.status}" sang "${body.status}"`);
  const r = await Shipment.updateOne(
    { _id: s._id, status: s.status },
    { $set: { status: body.status }, $push: { events: { status: body.status, note: body.note || '', location: body.location || '', at: new Date() } } },
  );
  if (r.modifiedCount !== 1) throw Errors.invalidState('Vận đơn vừa được cập nhật bởi thao tác khác, vui lòng tải lại');
  const label = { in_transit: 'đang trung chuyển', out_for_delivery: 'đang được giao tới bạn', failed: 'giao không thành công' }[body.status];
  publish(o.buyerId, 'order.updated', { orderId, partId, code: o.code, status: 'shipping', shipmentStatus: body.status, message: `Đơn ${o.code} ${label}` });
  res.json(await service.vendorPartView(req.user._id, orderId, partId));
});

router.patch('/vendor/orders/:orderId/parts/:partId/cod', requireRole('vendor'), async (req, res) => {
  parse({ status: v.enum(['collected']) }, req.body);
  res.json(await service.vendorCollectCod(req.user._id, assertId(req.params.orderId), assertId(req.params.partId)));
});

export default router;

/** Tra cứu hành trình bằng mã vận đơn (công khai, không lộ thông tin người nhận). */
export const trackingRouter = Router();
trackingRouter.get('/tracking/:code', async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,40}$/.test(code)) throw Errors.notFound('Không tìm thấy vận đơn');
  const s = await Shipment.findOne({ trackingCode: code }).lean();
  if (!s) throw Errors.notFound('Không tìm thấy vận đơn');
  res.json({ orderCode: s.orderCode, ...shipments.toShipmentDto(s) });
});
