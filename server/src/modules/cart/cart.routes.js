import { Router } from 'express';
import * as service from './cart.service.js';
import { parse, v, assertId } from '../../utils/validate.js';
import { Errors } from '../../utils/AppError.js';
import { recordEvent } from '../recommendations/events.service.js';

const router = Router();
/**
 * Người mua đã đăng nhập: giỏ lưu bền vững trong MongoDB (collection carts).
 * Khách chưa đăng nhập: giỏ tạm trong session (req.session.guestCart), gộp vào MongoDB khi đăng nhập.
 * Nhà bán/quản trị không có giỏ hàng.
 */
router.use('/cart', (req, res, next) => {
  if (req.user && req.user.role !== 'buyer') return next(Errors.forbidden());
  return next();
});
const isGuest = (req) => !req.user;

router.get('/cart', async (req, res) => {
  res.json(isGuest(req) ? await service.getGuestCart(req.session) : await service.getCart(req.user._id));
});

router.post('/cart/items', async (req, res) => {
  const body = parse(
    { productId: v.id().optional(), boxId: v.id().optional(), qty: v.int({ min: 1, max: 99 }).default(1) },
    req.body,
  );
  if (!!body.productId === !!body.boxId) {
    throw Errors.validation([{ field: 'productId', message: 'Cần đúng một trong productId hoặc boxId' }]);
  }
  const cart = isGuest(req) ? await service.addGuestItem(req.session, body) : await service.addItem(req.user._id, body);
  if (body.productId) await recordEvent(req, 'add_to_cart', body.productId);
  res.status(201).json(cart);
});

router.patch('/cart/items/:itemId', async (req, res) => {
  const { qty } = parse({ qty: v.int({ min: 0, max: 99 }) }, req.body);
  const itemId = assertId(req.params.itemId);
  res.json(isGuest(req) ? await service.updateGuestItem(req.session, itemId, qty) : await service.updateItem(req.user._id, itemId, qty));
});

router.delete('/cart', async (req, res) => {
  res.json(isGuest(req) ? await service.clearGuest(req.session) : await service.clear(req.user._id));
});

export default router;
