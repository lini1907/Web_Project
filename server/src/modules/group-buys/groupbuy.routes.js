import { Router } from 'express';
import * as service from './groupbuy.service.js';
import { requireRole, requireApprovedVendor } from '../../middleware/auth.js';
import { parse, v, qstr, assertId } from '../../utils/validate.js';
import { addressShape, readIdempotencyKey } from '../orders/order.routes.js';

const router = Router();

router.get('/group-buys', async (req, res) => {
  const status = qstr(req.query.status);
  const allowed = ['open', 'succeeded', 'failed', 'cancelled', 'closed', 'all'];
  res.json(await service.listPublic({ status: allowed.includes(status) ? status : 'open' }, req.user?._id));
});

router.get('/group-buys/:id', async (req, res) => {
  res.json(await service.getPublic(assertId(req.params.id, 'Chiến dịch không tồn tại'), req.user?._id));
});

router.post('/group-buys/:id/join', requireRole('buyer'), async (req, res) => {
  const body = parse({ qty: v.int({ min: 1, max: 50 }), shippingAddress: addressShape }, req.body);
  const key = readIdempotencyKey(req);
  const { campaign, replayed } = await service.join(req.user, assertId(req.params.id, 'Chiến dịch không tồn tại'), body, key);
  res.status(replayed ? 200 : 201).json(campaign);
});

router.delete('/group-buys/:id/join', requireRole('buyer'), async (req, res) => {
  res.json(await service.withdraw(req.user, assertId(req.params.id, 'Chiến dịch không tồn tại')));
});

router.get('/me/group-buys', requireRole('buyer'), async (req, res) => {
  res.json(await service.myMemberships(req.user._id));
});

// ----- Vendor -----
router.get('/vendor/group-buys', requireRole('vendor'), async (req, res) => {
  res.json(await service.listForVendor(req.user._id));
});

router.post('/vendor/group-buys', requireApprovedVendor, async (req, res) => {
  const body = parse(
    {
      productId: v.id(),
      title: v.string({ min: 0, max: 120 }).optional(),
      groupPrice: v.int({ min: 1000 }),
      targetQty: v.int({ min: 2, max: 10000 }),
      maxQty: v.int({ min: 2, max: 10000 }),
      deadline: v.date(),
    },
    req.body,
  );
  res.status(201).json(await service.create(req.user._id, body));
});

router.post('/vendor/group-buys/:id/cancel', requireApprovedVendor, async (req, res) => {
  res.json(await service.cancelByVendor(req.user._id, assertId(req.params.id, 'Chiến dịch không tồn tại')));
});

export default router;
