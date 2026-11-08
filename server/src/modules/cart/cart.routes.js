import { Router } from 'express';
import * as service from './cart.service.js';
import { requireRole } from '../../middleware/auth.js';
import { parse, v, assertId } from '../../utils/validate.js';
import { Errors } from '../../utils/AppError.js';
import { recordEvent } from '../recommendations/events.service.js';

const router = Router();
router.use('/cart', requireRole('buyer'));

router.get('/cart', async (req, res) => {
  res.json(await service.getCart(req.user._id));
});

router.post('/cart/items', async (req, res) => {
  const body = parse(
    { productId: v.id().optional(), boxId: v.id().optional(), qty: v.int({ min: 1, max: 99 }).default(1) },
    req.body,
  );
  if (!!body.productId === !!body.boxId) {
    throw Errors.validation([{ field: 'productId', message: 'Cần đúng một trong productId hoặc boxId' }]);
  }
  const cart = await service.addItem(req.user._id, body);
  if (body.productId) await recordEvent(req, 'add_to_cart', body.productId);
  res.status(201).json(cart);
});

router.patch('/cart/items/:itemId', async (req, res) => {
  const { qty } = parse({ qty: v.int({ min: 0, max: 99 }) }, req.body);
  res.json(await service.updateItem(req.user._id, assertId(req.params.itemId), qty));
});

router.delete('/cart', async (req, res) => {
  res.json(await service.clear(req.user._id));
});

export default router;
