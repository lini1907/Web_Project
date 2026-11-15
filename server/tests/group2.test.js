/**
 * Kiểm thử nhóm 2: SSE real-time, vận đơn (Shipment), thanh toán VNPay/MoMo, đăng nhập Google,
 * lịch sử gợi ý. Cổng thanh toán và Google được giả lập (không gọi Internet).
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import request from 'supertest';
import { setup, teardown, client, uuid, PASSWORD } from './helpers.js';
import { Product, Order, User, Shipment, RecommendHistory } from '../src/models/index.js';
import { vnpSign, momoSign } from '../src/modules/payments/payment.service.js';
import { connectionCount } from '../src/services/realtime.js';

let app;
const addr = { name: 'Người Mua Test', phone: '0901234567', address: '12 Nguyễn Trãi, Quận 1, TP.HCM' };
const realFetch = globalThis.fetch;
const VNP_SECRET = 'TESTSECRETVNPAY0123456789ABCDEF';
const MOMO = { partner: 'MOMOTEST', access: 'accesskey-test', secret: 'secretkey-test' };

before(async () => {
  Object.assign(process.env, {
    PUBLIC_URL: 'http://localhost:3000',
    APP_URL: 'http://localhost:4200',
    VNP_TMN_CODE: 'TESTTMN1',
    VNP_HASH_SECRET: VNP_SECRET,
    MOMO_PARTNER_CODE: MOMO.partner,
    MOMO_ACCESS_KEY: MOMO.access,
    MOMO_SECRET_KEY: MOMO.secret,
    GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'test-google-secret',
  });
  app = await setup();
});
after(async () => {
  globalThis.fetch = realFetch;
  await teardown();
});

const productBy = (legacyId) => Product.findOne({ legacyId }).lean();
async function freshBuyer() {
  const c = client(app);
  const email = `buyer-${uuid().slice(0, 8)}@example.com`;
  assert.equal((await c.post('/auth/register', { name: 'Buyer Test', email, password: 'Matkhau123' })).status, 201);
  c.email = email;
  return c;
}
async function vendorA() {
  const v = client(app);
  await v.login('dalatxanh@farmtable.vn');
  return v;
}
async function placeOrder(buyer, extra = {}) {
  const p = await productBy('1'); // sản phẩm của Đà Lạt Xanh
  await buyer.post('/cart/items', { productId: String(p._id), qty: 1 });
  const r = await buyer.post('/orders', { shippingAddress: addr, ...extra }, { 'Idempotency-Key': uuid() });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}
/** Mô phỏng fetch tới dịch vụ ngoài; URL khác đi qua fetch thật. */
function mockFetch(routes) {
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    for (const [prefix, handler] of Object.entries(routes)) {
      if (u.startsWith(prefix)) {
        const body = await handler(u, opts);
        return new Response(JSON.stringify(body), { status: body.__status || 200, headers: { 'content-type': 'application/json' } });
      }
    }
    return realFetch(url, opts);
  };
}

describe('SSE · cập nhật trạng thái đơn real-time', () => {
  test('người mua mở luồng SSE nhận ngay sự kiện khi nhà bán đổi trạng thái; khách chưa đăng nhập bị 401', async () => {
    const server = http.createServer(app).listen(0);
    const port = server.address().port;
    try {
      assert.equal((await request(app).get('/api/v1/realtime/stream')).status, 401);
      // Đăng nhập thủ công để lấy cookie phiên cho kết nối SSE thô.
      const email = `sse-${uuid().slice(0, 8)}@example.com`;
      const cookies = {};
      const keep = (res) => {
        for (const c of res.headers['set-cookie'] || []) {
          const [kv] = c.split(';');
          const i = kv.indexOf('=');
          cookies[kv.slice(0, i)] = kv.slice(i + 1);
        }
      };
      const jar = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
      keep(await request(app).get('/api/v1/auth/csrf'));
      keep(await request(app).post('/api/v1/auth/register').set('Cookie', jar()).set('X-XSRF-TOKEN', decodeURIComponent(cookies['XSRF-TOKEN'])).send({ name: 'SSE Buyer', email, password: 'Matkhau123' }));

      const received = [];
      const req = http.get({ port, path: '/api/v1/realtime/stream', headers: { Cookie: jar() } });
      const res = await new Promise((resolve) => req.on('response', resolve));
      assert.equal(res.statusCode, 200);
      assert.match(res.headers['content-type'], /text\/event-stream/);
      res.setEncoding('utf8');
      res.on('data', (chunk) => received.push(chunk));
      await new Promise((r) => setTimeout(r, 100));
      assert.ok(received.join('').includes('event: ready'));
      const me = await User.findOne({ email }).lean();
      assert.equal(connectionCount(me._id), 1);

      // Đặt đơn bằng chính phiên đó rồi để nhà bán xác nhận.
      const buyer = client(app);
      await buyer.login(email, 'Matkhau123');
      const order = await placeOrder(buyer);
      const v = await vendorA();
      assert.equal((await v.patch(`/vendor/orders/${order.id}/parts/${order.parts[0].id}`, { status: 'confirmed' })).status, 200);
      await new Promise((r) => setTimeout(r, 100));
      const text = received.join('');
      assert.ok(text.includes('event: order.updated'), text);
      assert.ok(text.includes(order.code) && text.includes('"status":"confirmed"'));
      req.destroy();
      await new Promise((r) => setTimeout(r, 100));
      assert.equal(connectionCount(me._id), 0);
    } finally {
      server.close();
    }
  });
});

describe('Shipment · vận đơn và hành trình giao hàng', () => {
  test('giao hàng tạo vận đơn, thêm mốc hành trình, giao xong đóng vận đơn; tra cứu công khai; khung giờ nhận', async () => {
    const b = await freshBuyer();
    const tomorrow = new Date(Date.now() + 7 * 3600e3 + 86400e3).toISOString().slice(0, 10);
    // Ngày nhận hôm nay hoặc quá 7 ngày bị từ chối
    const p = await productBy('1');
    await b.post('/cart/items', { productId: String(p._id), qty: 1 });
    const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
    let r = await b.post('/orders', { shippingAddress: addr, deliverySlot: { date: today, window: 'morning' } }, { 'Idempotency-Key': uuid() });
    assert.equal(r.status, 400);
    r = await b.post('/orders', { shippingAddress: addr, deliverySlot: { date: tomorrow, window: 'evening' } }, { 'Idempotency-Key': uuid() });
    assert.equal(r.status, 201);
    const order = r.body;
    assert.deepEqual(order.deliverySlot, { date: tomorrow, window: 'evening' });
    const partId = order.parts[0].id;
    const v = await vendorA();
    const base = `/vendor/orders/${order.id}/parts/${partId}`;
    assert.equal((await v.patch(base, { status: 'confirmed' })).status, 200);
    // Chưa giao thì không thêm mốc được
    assert.equal((await v.post(`${base}/shipment/events`, { status: 'in_transit' })).status, 409);
    r = await v.patch(base, { status: 'shipping', carrier: 'ghn', trackingCode: 'ghn123456vn' });
    assert.equal(r.status, 200);
    assert.equal(r.body.shipment.trackingCode, 'GHN123456VN');
    assert.equal(r.body.shipment.carrier, 'ghn');
    assert.equal(r.body.deliverySlot.window, 'evening');

    r = await v.post(`${base}/shipment/events`, { status: 'in_transit', location: 'Kho Đà Lạt' });
    assert.equal(r.status, 200);
    assert.equal(r.body.shipment.status, 'in_transit');
    assert.equal((await v.post(`${base}/shipment/events`, { status: 'delivered' })).status, 400); // giao xong phải qua đổi trạng thái phần đơn
    assert.equal((await v.post(`${base}/shipment/events`, { status: 'out_for_delivery' })).status, 200);
    // Người mua thấy hành trình
    let view = (await b.get(`/orders/${order.id}`)).body;
    assert.equal(view.parts[0].shipment.events.length, 3);
    assert.equal((await v.patch(base, { status: 'delivered' })).status, 200);
    view = (await b.get(`/orders/${order.id}`)).body;
    assert.equal(view.parts[0].shipment.status, 'delivered');
    // Tra cứu công khai không lộ địa chỉ người nhận
    r = await client(app).get('/tracking/ghn123456vn');
    assert.equal(r.status, 200);
    assert.equal(r.body.orderCode, order.code);
    assert.equal(JSON.stringify(r.body).includes(addr.phone), false);
    assert.equal((await client(app).get('/tracking/KHONGCO123')).status, 404);
  });

  test('chuyển sang giao không nhập mã => tự sinh mã FTS; mã vận đơn trùng bị chặn', async () => {
    const v = await vendorA();
    const o1 = await placeOrder(await freshBuyer());
    const o2 = await placeOrder(await freshBuyer());
    for (const o of [o1, o2]) await v.patch(`/vendor/orders/${o.id}/parts/${o.parts[0].id}`, { status: 'confirmed' });
    let r = await v.patch(`/vendor/orders/${o1.id}/parts/${o1.parts[0].id}`, { status: 'shipping' });
    assert.match(r.body.shipment.trackingCode, /^FTS[0-9A-F]{10}$/);
    r = await v.patch(`/vendor/orders/${o2.id}/parts/${o2.parts[0].id}`, { status: 'shipping', trackingCode: r.body.shipment.trackingCode });
    assert.equal(r.body.error.code, 'TRACKING_TAKEN');
    assert.equal(await Shipment.countDocuments({ orderId: o2.id }), 0);
  });
});

describe('Thanh toán VNPay Sandbox', () => {
  test('tạo URL có chữ ký; return/IPN kiểm chữ ký, số tiền; đơn chưa trả tiền thì nhà bán chưa xác nhận được', async () => {
    assert.deepEqual((await client(app).get('/payments/methods')).body, { cod: true, vnpay: true, momo: true });
    const b = await freshBuyer();
    const order = await placeOrder(b, { paymentMethod: 'vnpay' });
    assert.equal(order.paymentMethod, 'vnpay');
    assert.equal(order.payment.status, 'pending');
    assert.equal(order.canPay, true);
    const v = await vendorA();
    assert.equal((await v.patch(`/vendor/orders/${order.id}/parts/${order.parts[0].id}`, { status: 'confirmed' })).status, 409);

    let r = await b.post(`/orders/${order.id}/pay`, {});
    assert.equal(r.status, 200);
    const url = new URL(r.body.payUrl);
    assert.equal(url.origin + url.pathname, 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    const q = Object.fromEntries(url.searchParams);
    assert.equal(q.vnp_Amount, String(order.total * 100));
    assert.equal(q.vnp_TmnCode, 'TESTTMN1');
    const { vnp_SecureHash, ...unsigned } = q;
    assert.equal(vnp_SecureHash, vnpSign(unsigned, VNP_SECRET));
    // Người khác không tạo được link thanh toán cho đơn của mình
    assert.equal((await (await freshBuyer()).post(`/orders/${order.id}/pay`, {})).status, 404);

    const result = (extra) => {
      const p = { vnp_Amount: q.vnp_Amount, vnp_TxnRef: q.vnp_TxnRef, vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '14000001', vnp_TmnCode: 'TESTTMN1', ...extra };
      return { ...p, vnp_SecureHash: vnpSign(p, VNP_SECRET) };
    };
    // Sửa số tiền sau khi ký => sai chữ ký
    const forged = { ...result(), vnp_Amount: '100' };
    r = await request(app).get('/api/v1/payments/vnpay/ipn').query(forged);
    assert.equal(r.body.RspCode, '97');
    // Ký đúng nhưng số tiền khác đơn
    r = await request(app).get('/api/v1/payments/vnpay/ipn').query(result({ vnp_Amount: '100' }));
    assert.equal(r.body.RspCode, '04');
    assert.equal((await Order.findById(order.id)).payment.status, 'pending');
    // IPN hợp lệ
    r = await request(app).get('/api/v1/payments/vnpay/ipn').query(result());
    assert.deepEqual(r.body, { RspCode: '00', Message: 'Confirm Success' });
    r = await request(app).get('/api/v1/payments/vnpay/ipn').query(result());
    assert.equal(r.body.RspCode, '02'); // gửi lặp không ghi 2 lần
    // Return URL chuyển về trang đơn của Angular
    r = await request(app).get('/api/v1/payments/vnpay/return').query(result());
    assert.equal(r.status, 302);
    assert.equal(r.headers.location, `http://localhost:4200/orders/${order.id}?payment=success`);
    const paid = (await b.get(`/orders/${order.id}`)).body;
    assert.equal(paid.payment.status, 'paid');
    assert.equal(paid.payment.transactionId, '14000001');
    assert.equal(paid.canPay, false);
    assert.equal((await b.post(`/orders/${order.id}/pay`, {})).status, 409);
    assert.equal((await v.patch(`/vendor/orders/${order.id}/parts/${order.parts[0].id}`, { status: 'confirmed' })).status, 200);
  });

  test('VNPay trả mã lỗi => thanh toán thất bại, có thể trả lại; hủy đơn đã trả => chờ hoàn tiền', async () => {
    const b = await freshBuyer();
    const order = await placeOrder(b, { paymentMethod: 'vnpay' });
    let q = Object.fromEntries(new URL((await b.post(`/orders/${order.id}/pay`, {})).body.payUrl).searchParams);
    const sign = (p) => ({ ...p, vnp_SecureHash: vnpSign(p, VNP_SECRET) });
    let r = await request(app).get('/api/v1/payments/vnpay/return').query(sign({ vnp_Amount: q.vnp_Amount, vnp_TxnRef: q.vnp_TxnRef, vnp_ResponseCode: '24', vnp_TransactionStatus: '02' }));
    assert.match(r.headers.location, /payment=failed$/);
    let view = (await b.get(`/orders/${order.id}`)).body;
    assert.equal(view.payment.status, 'failed');
    assert.equal(view.canPay, true);
    // Thanh toán lại với mã giao dịch mới
    q = Object.fromEntries(new URL((await b.post(`/orders/${order.id}/pay`, {})).body.payUrl).searchParams);
    await request(app).get('/api/v1/payments/vnpay/ipn').query(sign({ vnp_Amount: q.vnp_Amount, vnp_TxnRef: q.vnp_TxnRef, vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '1' }));
    assert.equal((await b.post(`/orders/${order.id}/cancel`)).status, 200);
    view = (await b.get(`/orders/${order.id}`)).body;
    assert.equal(view.payment.status, 'refund_pending');
  });
});

describe('Thanh toán MoMo Test', () => {
  test('tạo giao dịch qua API MoMo (giả lập), IPN POST không cần CSRF nhưng phải đúng chữ ký', async () => {
    let sent;
    mockFetch({
      'https://test-payment.momo.vn/': async (u, opts) => {
        sent = JSON.parse(opts.body);
        return { resultCode: 0, message: 'Thành công', payUrl: `https://test-payment.momo.vn/pay?o=${sent.orderId}` };
      },
    });
    try {
      const b = await freshBuyer();
      const order = await placeOrder(b, { paymentMethod: 'momo' });
      const r = await b.post(`/orders/${order.id}/pay`, {});
      assert.equal(r.status, 200);
      assert.match(r.body.payUrl, /^https:\/\/test-payment\.momo\.vn\/pay/);
      assert.equal(sent.amount, String(order.total));
      assert.equal(sent.requestType, 'captureWallet');
      const { signature, ...rest } = sent;
      assert.equal(signature, momoSign(['accessKey', 'amount', 'extraData', 'ipnUrl', 'orderId', 'orderInfo', 'partnerCode', 'redirectUrl', 'requestId', 'requestType'], rest, MOMO.secret));

      const ipn = {
        partnerCode: MOMO.partner,
        orderId: sent.orderId,
        requestId: sent.requestId,
        amount: order.total,
        orderInfo: sent.orderInfo,
        orderType: 'momo_wallet',
        transId: 4088878653,
        resultCode: 0,
        message: 'Thành công.',
        payType: 'qr',
        responseTime: Date.now(),
        extraData: '',
      };
      const fields = ['accessKey', 'amount', 'extraData', 'message', 'orderId', 'orderInfo', 'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime', 'resultCode', 'transId'];
      ipn.signature = momoSign(fields, { ...ipn, accessKey: MOMO.access }, MOMO.secret);
      // Gọi IPN như máy chủ MoMo: không cookie, không X-XSRF-TOKEN
      let res = await request(app).post('/api/v1/payments/momo/ipn').send({ ...ipn, amount: 1000 });
      assert.equal(res.status, 400);
      res = await request(app).post('/api/v1/payments/momo/ipn').send(ipn);
      assert.equal(res.status, 204);
      const o = await Order.findById(order.id).lean();
      assert.equal(o.payment.status, 'paid');
      assert.equal(o.payment.transactionId, '4088878653');
      // Các POST khác vẫn bị chặn nếu thiếu CSRF
      assert.equal((await request(app).post('/api/v1/vouchers/check').send({ code: 'X' })).status, 403);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test('MoMo từ chối tạo giao dịch => 502, đơn giữ nguyên chờ thanh toán', async () => {
    mockFetch({ 'https://test-payment.momo.vn/': async () => ({ resultCode: 22, message: 'Số tiền không hợp lệ' }) });
    try {
      const b = await freshBuyer();
      const order = await placeOrder(b, { paymentMethod: 'momo' });
      const r = await b.post(`/orders/${order.id}/pay`, {});
      assert.equal(r.status, 502);
      assert.equal(r.body.error.code, 'PAYMENT_GATEWAY_ERROR');
      assert.equal((await Order.findById(order.id)).payment.status, 'pending');
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe('Đăng nhập Google OAuth 2.0', () => {
  async function googleLogin(c, profile, { tamperState = false } = {}) {
    mockFetch({
      'https://oauth2.googleapis.com/token': async (u, opts) => {
        const form = new URLSearchParams(opts.body);
        assert.equal(form.get('client_secret'), 'test-google-secret');
        return form.get('code') === 'good-code' ? { access_token: 'ya29.test' } : { __status: 400, error: 'invalid_grant' };
      },
      'https://openidconnect.googleapis.com/v1/userinfo': async () => profile,
    });
    try {
      const start = await c.agent.get('/api/v1/auth/google?returnUrl=/orders');
      assert.equal(start.status, 302);
      const loc = new URL(start.headers.location);
      assert.equal(loc.host, 'accounts.google.com');
      assert.equal(loc.searchParams.get('redirect_uri'), 'http://localhost:3000/api/v1/auth/google/callback');
      const state = tamperState ? 'sai-state' : loc.searchParams.get('state');
      return await c.agent.get(`/api/v1/auth/google/callback?code=good-code&state=${state}`);
    } finally {
      globalThis.fetch = realFetch;
    }
  }

  test('tài khoản mới được tạo; state sai bị chặn; email trùng thì liên kết vào tài khoản cũ', async () => {
    assert.deepEqual((await client(app).get('/auth/providers')).body, { google: true });
    const c = client(app);
    let r = await googleLogin(c, { sub: 'g-111', email: 'nguoimoi.google@gmail.com', email_verified: true, name: 'Người Google' }, { tamperState: true });
    assert.equal(r.headers.location, 'http://localhost:4200/login?error=google_state');
    assert.equal((await c.get('/auth/me')).status, 401);

    r = await googleLogin(c, { sub: 'g-111', email: 'nguoimoi.google@gmail.com', email_verified: true, name: 'Người Google' });
    assert.equal(r.headers.location, 'http://localhost:4200/orders');
    const me = (await c.get('/auth/me')).body;
    assert.equal(me.email, 'nguoimoi.google@gmail.com');
    assert.equal(me.role, 'buyer');
    assert.equal(me.authProvider, 'google');

    // Tài khoản có sẵn (đăng ký bằng mật khẩu) => liên kết, không tạo trùng
    const c2 = client(app);
    r = await googleLogin(c2, { sub: 'g-222', email: 'bich.tran@example.com', email_verified: true, name: 'Bích' });
    assert.equal((await c2.get('/auth/me')).body.email, 'bich.tran@example.com');
    const bich = await User.findOne({ email: 'bich.tran@example.com' }).lean();
    assert.equal(bich.googleId, 'g-222');
    assert.equal(await User.countDocuments({ email: 'bich.tran@example.com' }), 1);
    // Vẫn đăng nhập bằng mật khẩu được
    assert.equal((await client(app).post('/auth/login', { email: 'bich.tran@example.com', password: PASSWORD })).status, 200);
  });

  test('email Google chưa xác minh hoặc tài khoản bị khóa thì không đăng nhập được', async () => {
    let r = await googleLogin(client(app), { sub: 'g-333', email: 'chua.xacminh@gmail.com', email_verified: false });
    assert.match(r.headers.location, /error=google_unverified/);
    await User.updateOne({ email: 'nguoimoi.google@gmail.com' }, { $set: { status: 'locked' } });
    r = await googleLogin(client(app), { sub: 'g-111', email: 'nguoimoi.google@gmail.com', email_verified: true });
    assert.match(r.headers.location, /error=locked/);
  });
});

describe('Lịch sử gợi ý', () => {
  test('mỗi lần gợi ý được lưu kèm lý do; tải lại liên tục không lưu trùng; chỉ xem được lịch sử của mình', async () => {
    const b = await freshBuyer();
    const p = await productBy('1');
    await b.post('/events', { type: 'view', productId: String(p._id) });
    let r = await b.get('/recommendations/for-me?limit=4');
    assert.equal(r.status, 200);
    assert.ok(r.body.items.length > 0);
    assert.ok(r.body.items.every((i) => typeof i.reason === 'string' && i.reason.length > 0));
    await b.get('/recommendations/for-me?limit=4');
    await b.get(`/recommendations/similar/${p._id}`);
    const me = (await b.get('/auth/me')).body;
    assert.equal(await RecommendHistory.countDocuments({ userId: me.id, kind: 'for-me' }), 1);
    r = await b.get('/recommendations/history');
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 2);
    const sim = r.body.find((h) => h.kind === 'similar');
    assert.equal(sim.context.id, String(p._id));
    assert.ok(sim.items[0].product.name && sim.items[0].reason);
    assert.equal((await client(app).get('/recommendations/history')).status, 401);
    assert.equal((await (await freshBuyer()).get('/recommendations/history')).body.length, 0);
  });
});
