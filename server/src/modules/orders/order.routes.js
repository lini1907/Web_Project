import { Router } from 'express';
import * as service from './order.service.js';
import { requireRole } from '../../middleware/auth.js';
import { parse, v, pageParams, qstr, assertId } from '../../utils/validate.js';
import { Errors } from '../../utils/AppError.js';
import { PART_STATUSES } from '../../models/index.js';

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

// ----- Buyer -----
router.post('/orders', requireRole('buyer'), async (req, res) => {
  const body = parse(
    { shippingAddress: addressShape, note: v.string({ min: 0, max: 500 }).optional(), expectedTotal: v.int({ min: 0 }).optional() },
    req.body,
  );
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

router.patch('/vendor/orders/:orderId/parts/:partId', requireRole('vendor'), async (req, res) => {
  const { status } = parse({ status: v.enum(PART_STATUSES) }, req.body);
  res.json(await service.vendorUpdateStatus(req.user._id, assertId(req.params.orderId), assertId(req.params.partId), status));
});

router.patch('/vendor/orders/:orderId/parts/:partId/cod', requireRole('vendor'), async (req, res) => {
  parse({ status: v.enum(['collected']) }, req.body);
  res.json(await service.vendorCollectCod(req.user._id, assertId(req.params.orderId), assertId(req.params.partId)));
});

export default router;
