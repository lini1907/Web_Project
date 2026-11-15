import { Router } from 'express';
import * as service from './mystery.service.js';
import { requireRole, requireApprovedVendor } from '../../middleware/auth.js';
import { parse, v, qstr, assertId } from '../../utils/validate.js';
import { Errors } from '../../utils/AppError.js';

const router = Router();

const boxShape = (partial) => {
  const shape = {
    name: v.string({ min: 3, max: 120 }),
    price: v.int({ min: 1000, max: 10_000_000 }),
    components: v.array(v.object({ productId: v.id(), qty: v.int({ min: 1, max: 100 }) }), { min: 1, max: 15 }),
    publicNote: v.string({ min: 0, max: 300 }).optional(),
    image: v.url().optional(),
    isActive: v.bool().optional(),
  };
  return partial ? Object.fromEntries(Object.entries(shape).map(([k, r]) => [k, r.optional()])) : shape;
};

router.get('/mystery-boxes', async (req, res) => {
  res.json(await service.listPublic());
});

router.get('/mystery-boxes/:id', async (req, res) => {
  const key = qstr(req.params.id, 120);
  if (!key) throw Errors.notFound();
  res.json(await service.getPublic(key));
});

router.get('/vendor/mystery-boxes', requireRole('vendor'), async (req, res) => {
  res.json(await service.listForVendor(req.user._id));
});

router.post('/vendor/mystery-boxes', requireApprovedVendor, async (req, res) => {
  res.status(201).json(await service.create(req.user._id, parse(boxShape(false), req.body)));
});

router.patch('/vendor/mystery-boxes/:id', requireApprovedVendor, async (req, res) => {
  res.json(await service.update(req.user._id, assertId(req.params.id), parse(boxShape(true), req.body)));
});

export default router;
