import crypto from 'node:crypto';
import { Order } from '../../models/index.js';
import { AppError, Errors } from '../../utils/AppError.js';
import { publish } from '../../services/realtime.js';
import { vnpayConfig, momoConfig, enabledMethods } from './payment.config.js';

// ======================= Tiện ích chung =======================

/** Giờ Việt Nam dạng yyyyMMddHHmmss (VNPay yêu cầu GMT+7). */
export function vnTime(date = new Date()) {
  const d = new Date(date.getTime() + 7 * 3600e3);
  return d.toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

const hmac = (algo, secret, data) => crypto.createHmac(algo, secret).update(Buffer.from(data, 'utf-8')).digest('hex');

function safeEqual(a, b) {
  const x = Buffer.from(String(a || '').toLowerCase());
  const y = Buffer.from(String(b || '').toLowerCase());
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Mã giao dịch gửi sang cổng: mã đơn + hậu tố thời gian (mỗi lần thanh toán lại là một mã mới). */
function newTxnRef(order) {
  return `${order.code}-${Date.now().toString(36).toUpperCase()}`;
}

async function loadPayableOrder(buyerId, orderId, provider) {
  const order = await Order.findOne({ _id: orderId, buyerId });
  if (!order) throw Errors.notFound('Không tìm thấy đơn hàng');
  if (order.paymentMethod !== provider) throw Errors.invalidState('Đơn này không dùng phương thức thanh toán đã chọn');
  if (order.payment?.status === 'paid') throw Errors.invalidState('Đơn đã được thanh toán');
  if (!order.parts.some((p) => p.status === 'pending')) throw Errors.invalidState('Đơn đã bị hủy hoặc đã được xử lý, không thể thanh toán');
  if (!enabledMethods()[provider]) throw new AppError(503, 'PAYMENT_DISABLED', 'Cổng thanh toán chưa được cấu hình trên máy chủ');
  return order;
}

/**
 * Ghi nhận kết quả thanh toán (dùng chung cho Return URL và IPN của cả hai cổng).
 * Cập nhật có điều kiện theo txnRef + trạng thái chưa paid => gọi nhiều lần vẫn chỉ ghi 1 lần (idempotent).
 */
export async function applyResult({ txnRef, amount, success, transactionId, message }) {
  const order = await Order.findOne({ 'payment.txnRef': txnRef });
  if (!order) return { code: 'ORDER_NOT_FOUND' };
  if (amount !== undefined && Number(amount) !== order.total) return { code: 'AMOUNT_MISMATCH', order };
  if (order.payment.status === 'paid') return { code: 'ALREADY_CONFIRMED', order };
  // Người mua đã hủy đơn trong lúc đang thanh toán => tiền vào nhưng đơn hủy: đánh dấu chờ hoàn tiền.
  const allCancelled = order.parts.every((p) => p.status === 'cancelled');
  const set = success
    ? { 'payment.status': allCancelled ? 'refund_pending' : 'paid', 'payment.paidAt': new Date(), 'payment.transactionId': transactionId || null, 'payment.message': message || 'Thanh toán thành công' }
    : { 'payment.status': 'failed', 'payment.transactionId': transactionId || null, 'payment.message': message || 'Thanh toán không thành công' };
  const r = await Order.updateOne({ _id: order._id, 'payment.txnRef': txnRef, 'payment.status': { $ne: 'paid' } }, { $set: set });
  if (r.modifiedCount === 1) {
    const text = success ? `Đơn ${order.code} đã thanh toán thành công` : `Thanh toán đơn ${order.code} không thành công`;
    publish(order.buyerId, 'payment.updated', { orderId: String(order._id), code: order.code, status: success ? 'paid' : 'failed', message: text });
    if (success) {
      publish(order.parts.map((p) => p.vendorId), 'order.updated', { orderId: String(order._id), code: order.code, status: 'paid', message: `Đơn ${order.code} đã được thanh toán, có thể xác nhận` });
    }
  }
  return { code: 'OK', order };
}

// ======================= VNPay (API v2.1.0) =======================

/** Sắp xếp tham số theo tên và mã hóa như mẫu chính thức của VNPay (khoảng trắng => "+"). */
function vnpSignData(params) {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k])).replace(/%20/g, '+')}`)
    .join('&');
}

export function vnpSign(params, secret) {
  return hmac('sha512', secret, vnpSignData(params));
}

/** Kiểm tra chữ ký vnp_SecureHash trên query VNPay gửi về. */
export function vnpVerify(query) {
  const { vnp_SecureHash: hash, vnp_SecureHashType: _t, ...rest } = query;
  const vnp = Object.fromEntries(Object.entries(rest).filter(([k]) => k.startsWith('vnp_')));
  return !!hash && safeEqual(hash, vnpSign(vnp, vnpayConfig().hashSecret));
}

export async function createVnpayUrl(buyerId, orderId, ip) {
  const order = await loadPayableOrder(buyerId, orderId, 'vnpay');
  const cfg = vnpayConfig();
  const txnRef = newTxnRef(order);
  order.payment.txnRef = txnRef;
  order.payment.status = 'pending';
  await order.save();
  const now = new Date();
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: cfg.tmnCode,
    vnp_Amount: order.total * 100, // đơn vị: đồng x 100
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: `Thanh toan don hang ${order.code}`,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: cfg.returnUrl,
    vnp_IpAddr: (ip || '127.0.0.1').replace(/^::ffff:/, ''),
    vnp_CreateDate: vnTime(now),
    vnp_ExpireDate: vnTime(new Date(now.getTime() + 15 * 60e3)),
  };
  const query = vnpSignData(params);
  return { payUrl: `${cfg.url}?${query}&vnp_SecureHash=${vnpSign(params, cfg.hashSecret)}`, txnRef };
}

/** Xử lý tham số VNPay gửi về (Return URL hoặc IPN). */
export async function handleVnpay(query) {
  if (!vnpVerify(query)) return { code: 'INVALID_SIGNATURE' };
  const success = query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00';
  return applyResult({
    txnRef: query.vnp_TxnRef,
    amount: Number(query.vnp_Amount) / 100,
    success,
    transactionId: query.vnp_TransactionNo,
    message: success ? 'Thanh toán VNPay thành công' : `VNPay trả mã lỗi ${query.vnp_ResponseCode}`,
  });
}

/** Mã phản hồi IPN theo tài liệu VNPay. */
export function vnpIpnResponse(result) {
  switch (result.code) {
    case 'OK':
      return { RspCode: '00', Message: 'Confirm Success' };
    case 'ALREADY_CONFIRMED':
      return { RspCode: '02', Message: 'Order already confirmed' };
    case 'ORDER_NOT_FOUND':
      return { RspCode: '01', Message: 'Order not found' };
    case 'AMOUNT_MISMATCH':
      return { RspCode: '04', Message: 'Invalid amount' };
    case 'INVALID_SIGNATURE':
      return { RspCode: '97', Message: 'Invalid signature' };
    default:
      return { RspCode: '99', Message: 'Unknown error' };
  }
}

// ======================= MoMo (API v2, captureWallet) =======================

const MOMO_CREATE_FIELDS = ['accessKey', 'amount', 'extraData', 'ipnUrl', 'orderId', 'orderInfo', 'partnerCode', 'redirectUrl', 'requestId', 'requestType'];
const MOMO_RESULT_FIELDS = ['accessKey', 'amount', 'extraData', 'message', 'orderId', 'orderInfo', 'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime', 'resultCode', 'transId'];

export function momoSign(fields, data, secret) {
  return hmac('sha256', secret, fields.map((k) => `${k}=${data[k] ?? ''}`).join('&'));
}

export function momoVerify(data) {
  const cfg = momoConfig();
  return !!data.signature && safeEqual(data.signature, momoSign(MOMO_RESULT_FIELDS, { ...data, accessKey: cfg.accessKey }, cfg.secretKey));
}

export async function createMomoUrl(buyerId, orderId) {
  const order = await loadPayableOrder(buyerId, orderId, 'momo');
  const cfg = momoConfig();
  const txnRef = newTxnRef(order);
  const body = {
    partnerCode: cfg.partnerCode,
    accessKey: cfg.accessKey,
    requestId: `${txnRef}-${crypto.randomBytes(3).toString('hex')}`,
    amount: String(order.total),
    orderId: txnRef,
    orderInfo: `Thanh toan don hang ${order.code}`,
    redirectUrl: cfg.redirectUrl,
    ipnUrl: cfg.ipnUrl,
    requestType: 'captureWallet',
    extraData: '',
    lang: 'vi',
  };
  body.signature = momoSign(MOMO_CREATE_FIELDS, body, cfg.secretKey);
  let res;
  try {
    const r = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    res = await r.json();
  } catch {
    throw new AppError(502, 'PAYMENT_GATEWAY_ERROR', 'Không kết nối được cổng MoMo, vui lòng thử lại');
  }
  if (res?.resultCode !== 0 || !res.payUrl) {
    throw new AppError(502, 'PAYMENT_GATEWAY_ERROR', `MoMo từ chối tạo giao dịch: ${res?.message || 'lỗi không xác định'}`);
  }
  order.payment.txnRef = txnRef;
  order.payment.status = 'pending';
  await order.save();
  return { payUrl: res.payUrl, txnRef };
}

/** Xử lý dữ liệu MoMo gửi về (redirect hoặc IPN). */
export async function handleMomo(data) {
  if (!momoVerify(data)) return { code: 'INVALID_SIGNATURE' };
  const success = Number(data.resultCode) === 0;
  return applyResult({
    txnRef: data.orderId,
    amount: Number(data.amount),
    success,
    transactionId: data.transId ? String(data.transId) : null,
    message: success ? 'Thanh toán MoMo thành công' : `MoMo: ${data.message || 'giao dịch không thành công'}`,
  });
}
