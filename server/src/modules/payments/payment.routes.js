import { Router } from 'express';
import { requireRole } from '../../middleware/auth.js';
import { parse, v, assertId } from '../../utils/validate.js';
import { Order } from '../../models/index.js';
import { Errors } from '../../utils/AppError.js';
import * as service from './payment.service.js';
import { appUrl, enabledMethods } from './payment.config.js';

/**
 * Thanh toán online:
 *   1. Người mua đặt đơn với paymentMethod = vnpay | momo (đơn ở trạng thái chờ thanh toán, kho đã giữ).
 *   2. POST /orders/:id/pay => server tạo URL thanh toán có chữ ký, trình duyệt chuyển sang cổng.
 *   3. Cổng gọi IPN (server-to-server) và chuyển người dùng về Return URL; server kiểm chữ ký rồi cập nhật đơn.
 * Khi chạy ở localhost cổng không gọi được IPN, nên Return URL cũng ghi nhận kết quả (sau khi kiểm chữ ký).
 */
const router = Router();

router.get('/payments/methods', (req, res) => {
  res.json(enabledMethods());
});

router.post('/orders/:id/pay', requireRole('buyer'), async (req, res) => {
  const id = assertId(req.params.id, 'Không tìm thấy đơn hàng');
  const order = await Order.findOne({ _id: id, buyerId: req.user._id }, { paymentMethod: 1 }).lean();
  if (!order) throw Errors.notFound('Không tìm thấy đơn hàng');
  const { provider } = parse({ provider: v.enum(['vnpay', 'momo']).default(order?.paymentMethod) }, req.body);
  const r = provider === 'vnpay' ? await service.createVnpayUrl(req.user._id, id, req.ip) : await service.createMomoUrl(req.user._id, id);
  res.json(r);
});

function backToApp(res, result) {
  const order = result.order;
  const ok = result.code === 'OK' || result.code === 'ALREADY_CONFIRMED';
  const paid = ok && order?.payment?.status === 'paid';
  const target = order ? `/orders/${order._id}?payment=${paid ? 'success' : 'failed'}` : '/orders?payment=failed';
  res.redirect(302, appUrl() + target);
}

// ----- VNPay -----
router.get('/payments/vnpay/return', async (req, res) => {
  backToApp(res, await service.handleVnpay(req.query));
});

router.get('/payments/vnpay/ipn', async (req, res) => {
  res.json(service.vnpIpnResponse(await service.handleVnpay(req.query)));
});

// ----- MoMo -----
router.get('/payments/momo/return', async (req, res) => {
  backToApp(res, await service.handleMomo(req.query));
});

/** IPN của MoMo là POST JSON từ máy chủ MoMo (không có cookie/CSRF) — được miễn kiểm tra CSRF, thay bằng kiểm chữ ký. */
router.post('/payments/momo/ipn', async (req, res) => {
  const r = await service.handleMomo(req.body || {});
  res.status(r.code === 'INVALID_SIGNATURE' ? 400 : 204).end();
});

export default router;
