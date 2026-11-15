/**
 * Kiểm thử các chức năng nâng cấp: Voucher (CRUD + áp mã), Review (CRUD), quên mật khẩu (OTP),
 * rate limiting và xuất CSV.
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, client, uuid } from './helpers.js';
import { Product, Voucher, Order } from '../src/models/index.js';
import { outbox } from '../src/services/mail.service.js';
import { resetRateLimits } from '../src/middleware/security.js';
import { csvCell } from '../src/modules/exports/export.routes.js';

let app;
const addr = { name: 'Người Mua Test', phone: '0901234567', address: '12 Nguyễn Trãi, Quận 1, TP.HCM' };

before(async () => {
  app = await setup();
});
after(teardown);

const productBy = (legacyId) => Product.findOne({ legacyId }).lean();
async function freshBuyer() {
  const c = client(app);
  const email = `buyer-${uuid().slice(0, 8)}@example.com`;
  const res = await c.post('/auth/register', { name: 'Buyer Test', email, password: 'Matkhau123' });
  assert.equal(res.status, 201);
  c.email = email;
  return c;
}
async function admin() {
  const c = client(app);
  await c.login('admin@farmtable.vn');
  return c;
}
/** Người mua đặt 1 đơn và vendor giao xong (để được đánh giá). */
async function deliveredOrder(buyer, legacyId = '1', vendorEmail = 'dalatxanh@farmtable.vn') {
  const p = await productBy(legacyId);
  await buyer.post('/cart/items', { productId: String(p._id), qty: 1 });
  const order = (await buyer.post('/orders', { shippingAddress: addr }, { 'Idempotency-Key': uuid() })).body;
  const vendor = client(app);
  await vendor.login(vendorEmail);
  const part = order.parts[0].id;
  for (const status of ['confirmed', 'shipping', 'delivered']) {
    assert.equal((await vendor.patch(`/vendor/orders/${order.id}/parts/${part}`, { status })).status, 200);
  }
  return { order, product: p };
}

describe('Voucher · CRUD của admin', () => {
  test('tạo / xem / sửa / xóa mã; validate; chỉ admin; ghi nhật ký', async () => {
    const a = await admin();
    // Create
    let r = await a.post('/admin/vouchers', { code: 'test10', type: 'percent', value: 10, maxDiscount: 15000, minOrderValue: 50000 });
    assert.equal(r.status, 201);
    assert.equal(r.body.code, 'TEST10');
    const id = r.body.id;
    // Validate: % > 100, mã trùng, ngày hết hạn trước ngày bắt đầu
    assert.equal((await a.post('/admin/vouchers', { code: 'BAD1', type: 'percent', value: 150 })).status, 400);
    assert.equal((await a.post('/admin/vouchers', { code: 'TEST10', type: 'fixed', value: 5000 })).body.error.code, 'VOUCHER_CODE_TAKEN');
    r = await a.post('/admin/vouchers', { code: 'BAD2', type: 'fixed', value: 5000, startsAt: '2026-12-10', expiresAt: '2026-12-01' });
    assert.equal(r.status, 400);
    // Read
    r = await a.get('/admin/vouchers?q=test10');
    assert.equal(r.status, 200);
    assert.equal(r.body.data.length, 1);
    assert.equal((await a.get(`/admin/vouchers/${id}`)).body.value, 10);
    // Update
    r = await a.patch(`/admin/vouchers/${id}`, { value: 15, description: 'Giảm 15%' });
    assert.equal(r.status, 200);
    assert.equal(r.body.value, 15);
    // Phân quyền
    const b = await freshBuyer();
    assert.equal((await b.get('/admin/vouchers')).status, 403);
    assert.equal((await b.post('/admin/vouchers', { code: 'HACK', type: 'fixed', value: 99000 })).status, 403);
    // Delete
    assert.equal((await a.del(`/admin/vouchers/${id}`)).status, 204);
    assert.equal((await a.get(`/admin/vouchers/${id}`)).status, 404);
    const logs = (await a.get('/admin/audit-logs')).body.data.map((l) => l.action);
    assert.ok(logs.includes('voucher.create') && logs.includes('voucher.update') && logs.includes('voucher.delete'));
  });
});

describe('Voucher · áp mã khi đặt hàng', () => {
  test('kiểm mã, đặt đơn có giảm giá, mỗi người dùng 1 lần, hủy đơn thì hoàn lượt; mã đã dùng không xóa được', async () => {
    const a = await admin();
    const created = (await a.post('/admin/vouchers', { code: 'GIAM15K', type: 'fixed', value: 15000, minOrderValue: 40000, maxUses: 5 })).body;
    const b = await freshBuyer();
    const p = await productBy('4'); // Cam sành 25.000đ
    await b.post('/cart/items', { productId: String(p._id), qty: 1 });
    // Chưa đủ đơn tối thiểu
    let r = await b.post('/vouchers/check', { code: 'giam15k' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'VOUCHER_MIN_ORDER');
    await b.post('/cart/items', { productId: String(p._id), qty: 1 }); // 50.000đ
    r = await b.post('/vouchers/check', { code: 'giam15k' });
    assert.equal(r.status, 200);
    assert.equal(r.body.discount, 15000);
    assert.equal(r.body.total, 50000 + 20000 - 15000);
    assert.equal((await b.post('/vouchers/check', { code: 'KHONGCO' })).body.error.code, 'VOUCHER_INVALID');

    const order = (await b.post('/orders', { shippingAddress: addr, expectedTotal: 70000, voucherCode: 'GIAM15K' }, { 'Idempotency-Key': uuid() })).body;
    assert.equal(order.discount, 15000);
    assert.equal(order.total, 55000);
    assert.equal(order.voucher.code, 'GIAM15K');
    assert.equal((await Voucher.findById(created.id)).usedCount, 1);

    // Dùng lần 2 bị chặn
    await b.post('/cart/items', { productId: String(p._id), qty: 2 });
    r = await b.post('/orders', { shippingAddress: addr, voucherCode: 'GIAM15K' }, { 'Idempotency-Key': uuid() });
    assert.equal(r.body.error.code, 'VOUCHER_USED');
    assert.equal((await b.get('/cart')).body.items.length, 1); // lỗi => giỏ giữ nguyên

    // Mã đã dùng: không xóa được, không đổi mã được
    assert.equal((await a.del(`/admin/vouchers/${created.id}`)).status, 409);
    assert.equal((await a.patch(`/admin/vouchers/${created.id}`, { code: 'DOIMA' })).status, 409);

    // Hủy cả đơn => hoàn lượt, dùng lại được
    assert.equal((await b.post(`/orders/${order.id}/cancel`)).status, 200);
    assert.equal((await Voucher.findById(created.id)).usedCount, 0);
    r = await b.post('/orders', { shippingAddress: addr, voucherCode: 'GIAM15K' }, { 'Idempotency-Key': uuid() });
    assert.equal(r.status, 201);
    assert.equal(r.body.discount, 15000);
  });

  test('freeship trừ đúng phí ship; mã tắt/hết hạn không dùng được; hết lượt khi đặt đồng thời', async () => {
    const a = await admin();
    await a.post('/admin/vouchers', { code: 'SHIP0', type: 'freeship', minOrderValue: 0 });
    const off = (await a.post('/admin/vouchers', { code: 'TAT', type: 'fixed', value: 5000, isActive: false })).body;
    await a.post('/admin/vouchers', { code: 'HETHAN', type: 'fixed', value: 5000, expiresAt: '2020-01-01' });
    await a.post('/admin/vouchers', { code: 'MOTLUOT', type: 'fixed', value: 5000, maxUses: 1 });
    const b = await freshBuyer();
    const p = await productBy('4');
    await b.post('/cart/items', { productId: String(p._id), qty: 1 });
    assert.equal((await b.post('/vouchers/check', { code: 'SHIP0' })).body.discount, 20000);
    assert.equal((await b.post('/vouchers/check', { code: 'TAT' })).status, 400);
    assert.equal((await b.post('/vouchers/check', { code: 'HETHAN' })).body.error.code, 'VOUCHER_EXPIRED');
    const pub = (await client(app).get('/vouchers')).body.map((x) => x.code);
    assert.ok(pub.includes('SHIP0') && !pub.includes('TAT') && !pub.includes('HETHAN'));
    assert.equal((await a.patch(`/admin/vouchers/${off.id}`, { isActive: true })).body.isActive, true);

    const [b1, b2] = [await freshBuyer(), await freshBuyer()];
    for (const x of [b1, b2]) await x.post('/cart/items', { productId: String(p._id), qty: 1 });
    const res = await Promise.all([b1, b2].map((x) => x.post('/orders', { shippingAddress: addr, voucherCode: 'MOTLUOT' }, { 'Idempotency-Key': uuid() })));
    assert.deepEqual(res.map((r) => r.status).sort(), [201, 400]);
    assert.equal((await Voucher.findOne({ code: 'MOTLUOT' })).usedCount, 1);
  });
});

describe('Review · CRUD đánh giá sản phẩm', () => {
  test('chỉ người đã nhận hàng mới đánh giá; sửa / xóa của mình; điểm trung bình tự cập nhật', async () => {
    const b = await freshBuyer();
    const p = await productBy('1');
    // Chưa mua => không được đánh giá
    let r = await b.post(`/products/${p._id}/reviews`, { rating: 5, comment: 'Ngon' });
    assert.equal(r.status, 403);
    assert.equal((await b.get(`/products/${p._id}/reviews/mine`)).body.canReview, false);

    await deliveredOrder(b, '1');
    assert.equal((await b.get(`/products/${p._id}/reviews/mine`)).body.canReview, true);
    // Create
    r = await b.post(`/products/${p._id}/reviews`, { rating: 4, comment: 'Rau tươi, giao nhanh' });
    assert.equal(r.status, 201);
    const reviewId = r.body.id;
    assert.equal((await b.post(`/products/${p._id}/reviews`, { rating: 5 })).body.error.code, 'REVIEW_EXISTS');
    assert.equal((await b.post(`/products/${p._id}/reviews`, { rating: 6 })).status, 400);
    let prod = await Product.findById(p._id).lean();
    assert.equal(prod.rating, 4);
    assert.equal(prod.reviewCount, 1);

    // Người thứ hai đánh giá 2 sao => trung bình 3
    const b2 = await freshBuyer();
    await deliveredOrder(b2, '1');
    const second = (await b2.post(`/products/${p._id}/reviews`, { rating: 2, comment: 'Hơi héo' })).body;
    assert.equal((await Product.findById(p._id).lean()).rating, 3);

    // Read (công khai)
    r = await client(app).get(`/products/${p._id}/reviews`);
    assert.equal(r.status, 200);
    assert.equal(r.body.total, 2);
    assert.equal(r.body.distribution[4], 1);

    // Update: chỉ chủ đánh giá
    assert.equal((await b2.patch(`/reviews/${reviewId}`, { rating: 1 })).status, 404);
    r = await b.patch(`/reviews/${reviewId}`, { rating: 5, comment: 'Rất ngon' });
    assert.equal(r.status, 200);
    assert.equal((await Product.findById(p._id).lean()).rating, 3.5);

    // Admin ẩn đánh giá => không tính điểm, không hiện công khai
    const a = await admin();
    assert.equal((await a.patch(`/admin/reviews/${second.id}`, { status: 'hidden', reason: 'Spam' })).status, 200);
    prod = await Product.findById(p._id).lean();
    assert.equal(prod.rating, 5);
    assert.equal(prod.reviewCount, 1);
    assert.equal((await client(app).get(`/products/${p._id}/reviews`)).body.total, 1);
    assert.ok((await a.get('/admin/reviews?status=hidden')).body.data.some((x) => x.id === second.id));

    // Delete: người khác không xóa được; chủ xóa được; admin xóa được
    assert.equal((await b2.del(`/reviews/${reviewId}`)).status, 404);
    assert.equal((await b.del(`/reviews/${reviewId}`)).status, 204);
    assert.equal((await a.del(`/reviews/${second.id}`)).status, 204);
    prod = await Product.findById(p._id).lean();
    assert.equal(prod.reviewCount, 0);
  });
});

describe('Quên mật khẩu · OTP qua email', () => {
  test('gửi OTP, sai mã bị chặn, đúng mã đổi được mật khẩu và hủy phiên cũ; email lạ không lộ thông tin', async () => {
    const b = await freshBuyer();
    assert.equal((await b.get('/auth/me')).status, 200);
    outbox.length = 0;
    const anon = client(app);
    // Email không tồn tại vẫn 202 và không gửi mail
    let r = await anon.post('/auth/forgot-password', { email: 'khongtontai@example.com' });
    assert.equal(r.status, 202);
    assert.equal(outbox.length, 0);

    r = await anon.post('/auth/forgot-password', { email: b.email });
    assert.equal(r.status, 202);
    assert.equal(outbox.length, 1);
    const otp = /(\d{6})/.exec(outbox[0].text)[1];
    assert.equal(outbox[0].to, b.email);

    const wrong = otp === '000000' ? '111111' : '000000';
    r = await anon.post('/auth/reset-password', { email: b.email, otp: wrong, newPassword: 'MatKhauMoi9' });
    assert.equal(r.body.error.code, 'OTP_INVALID');
    r = await anon.post('/auth/reset-password', { email: b.email, otp, newPassword: 'yeu' });
    assert.equal(r.status, 400);
    r = await anon.post('/auth/reset-password', { email: b.email, otp, newPassword: 'MatKhauMoi9' });
    assert.equal(r.status, 204);
    // OTP chỉ dùng 1 lần
    assert.equal((await anon.post('/auth/reset-password', { email: b.email, otp, newPassword: 'MatKhauMoi8' })).status, 400);
    // Phiên cũ mất quyền; mật khẩu cũ không đăng nhập được, mật khẩu mới thì được
    assert.equal((await b.get('/auth/me')).status, 401);
    assert.equal((await client(app).post('/auth/login', { email: b.email, password: 'Matkhau123' })).status, 401);
    assert.equal((await client(app).post('/auth/login', { email: b.email, password: 'MatKhauMoi9' })).status, 200);
  });

  test('nhập sai OTP quá 5 lần thì mã bị vô hiệu', async () => {
    const b = await freshBuyer();
    outbox.length = 0;
    const anon = client(app);
    await anon.post('/auth/forgot-password', { email: b.email });
    const otp = /(\d{6})/.exec(outbox[0].text)[1];
    const wrong = otp === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) await anon.post('/auth/reset-password', { email: b.email, otp: wrong, newPassword: 'MatKhauMoi9' });
    const r = await anon.post('/auth/reset-password', { email: b.email, otp, newPassword: 'MatKhauMoi9' });
    assert.equal(r.status, 400);
  });
});

describe('Rate limiting', () => {
  test('gửi OTP quá 3 lần / 15 phút => 429 kèm Retry-After', async () => {
    process.env.RATE_LIMIT_IN_TEST = '1';
    resetRateLimits();
    try {
      const anon = client(app);
      const codes = [];
      for (let i = 0; i < 4; i++) codes.push((await anon.post('/auth/forgot-password', { email: 'spam@example.com' })).status);
      assert.deepEqual(codes, [202, 202, 202, 429]);
      const r = await anon.post('/auth/forgot-password', { email: 'spam@example.com' });
      assert.equal(r.body.error.code, 'RATE_LIMITED');
      assert.ok(Number(r.headers['retry-after']) > 0);
      // Email khác không bị ảnh hưởng
      assert.equal((await anon.post('/auth/forgot-password', { email: 'khac@example.com' })).status, 202);
    } finally {
      delete process.env.RATE_LIMIT_IN_TEST;
      resetRateLimits();
    }
  });
});

describe('Xuất CSV', () => {
  test('admin tải CSV đơn hàng / sản phẩm / người dùng; người khác bị chặn; chống CSV injection', async () => {
    const a = await admin();
    for (const name of ['orders', 'products', 'users', 'vouchers', 'reviews']) {
      const r = await a.get(`/admin/export/${name}.csv`);
      assert.equal(r.status, 200, name);
      assert.match(r.headers['content-type'], /text\/csv/);
      assert.match(r.headers['content-disposition'], /attachment; filename="farmtable-/);
      assert.ok(r.text.startsWith('﻿'));
    }
    const orders = (await a.get('/admin/export/orders.csv')).text.split('\r\n');
    assert.ok(orders[0].includes('Mã đơn'));
    assert.ok(orders.length - 2 >= (await Order.countDocuments()));
    const users = (await a.get('/admin/export/users.csv?role=vendor')).text;
    assert.ok(users.includes('Nhà bán') && !users.includes('Người mua,'));
    assert.equal((await (await freshBuyer()).get('/admin/export/orders.csv')).status, 403);
    assert.equal((await client(app).get('/admin/export/users.csv')).status, 401);
    assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
    assert.equal(csvCell('a,b'), '"a,b"');
  });
});
