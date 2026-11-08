/**
 * Kiểm thử API theo bộ tiêu chí nghiệm thu (AC02–AC08 trong kế hoạch).
 * Chạy: npm test  (dùng MongoDB replica set trong bộ nhớ, dữ liệu seed thật từ FarmTable/XML+Json)
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, client, uuid } from './helpers.js';
import { Product, User, Order, GroupBuy, GroupBuyMembership, MysteryBox } from '../src/models/index.js';
import { shippingFeeFor, rescuePrice } from '../src/utils/money.js';
import { closeCampaign } from '../src/modules/group-buys/groupbuy.service.js';
import { loginLimiter } from '../src/middleware/security.js';

let app;
const addr = { name: 'Người Mua Test', phone: '0901234567', address: '12 Nguyễn Trãi, Quận 1, TP.HCM' };

before(async () => {
  app = await setup();
});
after(teardown);

async function productBy(legacyId) {
  return Product.findOne({ legacyId }).lean();
}
async function freshBuyer(tag = uuid().slice(0, 8)) {
  const c = client(app);
  const res = await c.post('/auth/register', { name: 'Buyer Test', email: `buyer-${tag}@example.com`, password: 'Matkhau123' });
  assert.equal(res.status, 201);
  return c;
}

describe('AC02 · Xác thực và phân quyền', () => {
  test('đăng ký: mật khẩu yếu bị từ chối, không trả passwordHash, không tạo được admin', async () => {
    const c = client(app);
    let r = await c.post('/auth/register', { name: 'A', email: 'x@example.com', password: '123' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'VALIDATION_ERROR');
    r = await c.post('/auth/register', { name: 'Hacker', email: 'hacker@example.com', password: 'Matkhau123', role: 'admin' });
    assert.equal(r.status, 400);
    r = await c.post('/auth/register', { name: 'Người mới', email: 'moi@example.com', password: 'Matkhau123' });
    assert.equal(r.status, 201);
    assert.equal(r.body.role, 'buyer');
    assert.equal(r.body.passwordHash, undefined);
    const dup = await client(app).post('/auth/register', { name: 'Trùng', email: 'moi@example.com', password: 'Matkhau123' });
    assert.equal(dup.status, 409);
  });

  test('ghi dữ liệu thiếu CSRF token bị chặn', async () => {
    const r = await client(app).agent.post('/api/v1/auth/login').send({ email: 'admin@farmtable.vn', password: 'x' });
    assert.equal(r.status, 403);
    assert.equal(r.body.error.code, 'CSRF_INVALID');
  });

  test('sai mật khẩu => 401; sai quá 5 lần => 429', async () => {
    loginLimiter.clearAll();
    const c = client(app);
    for (let i = 0; i < 5; i += 1) {
      const r = await c.post('/auth/login', { email: 'cuong.le@example.com', password: 'sai-mat-khau' });
      assert.equal(r.status, 401);
      assert.equal(r.body.error.code, 'INVALID_CREDENTIALS');
    }
    const r = await c.post('/auth/login', { email: 'cuong.le@example.com', password: 'sai-mat-khau' });
    assert.equal(r.status, 429);
    loginLimiter.clearAll();
  });

  test('đăng xuất thì session mất quyền', async () => {
    const c = client(app);
    await c.login('bich.tran@example.com');
    assert.equal((await c.get('/auth/me')).status, 200);
    assert.equal((await c.post('/auth/logout')).status, 204);
    assert.equal((await c.get('/auth/me')).status, 401);
  });

  test('buyer gọi API admin => 403; khách gọi giỏ hàng => 401', async () => {
    const c = client(app);
    assert.equal((await c.get('/cart')).status, 401);
    await c.login('bich.tran@example.com');
    assert.equal((await c.get('/admin/users')).status, 403);
    assert.equal((await c.get('/vendor/products')).status, 403);
  });

  test('vendor A không sửa được sản phẩm của vendor B (DB không đổi)', async () => {
    const a = client(app);
    await a.login('dalatxanh@farmtable.vn');
    const other = await productBy('7'); // Trang trại CP
    const r = await a.patch(`/vendor/products/${other._id}`, { price: 1000 });
    assert.equal(r.status, 404);
    assert.equal((await productBy('7')).price, other.price);
  });

  test('vendor chưa duyệt không đăng được sản phẩm', async () => {
    const c = client(app);
    await c.login('tamdao@farmtable.vn');
    const farm = (await c.get('/vendor/farms')).body[0];
    const r = await c.post('/vendor/products', { farmId: farm.id, name: 'Su su Tam Đảo', category: 'rau-cu', price: 20000, unit: 'kg', stock: 10 });
    assert.equal(r.status, 403);
    assert.equal(r.body.error.code, 'VENDOR_NOT_APPROVED');
  });

  test('admin khóa tài khoản => session cũ mất quyền ngay; mở khóa ghi audit log', async () => {
    const buyer = await freshBuyer('lock');
    const me = (await buyer.get('/auth/me')).body;
    const admin = client(app);
    await admin.login('admin@farmtable.vn');
    assert.equal((await admin.patch(`/admin/users/${me.id}`, { status: 'locked' })).status, 200);
    const r = await buyer.get('/cart');
    assert.ok([401, 403].includes(r.status));
    const relogin = await buyer.post('/auth/login', { email: me.email, password: 'Matkhau123' });
    assert.equal(relogin.status, 403);
    assert.equal(relogin.body.error.code, 'ACCOUNT_LOCKED');
    const logs = (await admin.get('/admin/audit-logs')).body;
    assert.ok(logs.data.some((l) => l.action === 'user.lock' && l.targetId === me.id));
  });

  test('input chứa toán tử MongoDB bị từ chối', async () => {
    const r = await client(app).post('/auth/login', { email: { $ne: '' }, password: { $ne: '' } });
    assert.equal(r.status, 400);
  });
});

describe('AC01/AC05 · Sản phẩm, tìm kiếm và Rescue', () => {
  test('phân trang + tìm không dấu', async () => {
    const c = client(app);
    const p1 = (await c.get('/products?limit=10&page=1&sort=price_asc')).body;
    const p2 = (await c.get('/products?limit=10&page=2&sort=price_asc')).body;
    assert.equal(p1.data.length, 10);
    assert.equal(p1.total, p2.total);
    assert.ok(!p1.data.some((x) => p2.data.find((y) => y.id === x.id)));
    const s = (await c.get('/products?q=ca%20chua')).body;
    assert.ok(s.data.length >= 1 && s.data.every((p) => p.name.toLowerCase().includes('cà chua')));
  });

  test('ID sai định dạng => 404, không lộ lỗi', async () => {
    const r = await client(app).get('/products/abc$');
    assert.equal(r.status, 404);
  });

  test('Rescue: giá do server tính; mức giảm ngoài 30–50% bị chặn; hàng hết hạn không mua được', async () => {
    const v = client(app);
    await v.login('dalatxanh@farmtable.vn');
    const p = await productBy('1');
    let r = await v.put(`/vendor/products/${p._id}/rescue`, { originalPrice: 60000, discountRate: 29, expiresAt: new Date(Date.now() + 86400000).toISOString() });
    assert.equal(r.status, 400);
    r = await v.put(`/vendor/products/${p._id}/rescue`, { originalPrice: 60000, discountRate: 50, expiresAt: new Date(Date.now() + 86400000).toISOString() });
    assert.equal(r.status, 200);
    assert.equal(r.body.price, rescuePrice(60000, 50));
    assert.equal(r.body.price, 30000);
    r = await v.del(`/vendor/products/${p._id}/rescue`);
    assert.equal(r.body.price, 60000);
    await v.patch(`/vendor/products/${p._id}`, { price: p.price });

    const expired = await productBy('16'); // seed cố ý hết hạn
    assert.equal((await client(app).get(`/products/${expired._id}`)).body.rescue.expired, true);
    const buyer = await freshBuyer();
    r = await buyer.post('/cart/items', { productId: String(expired._id), qty: 1 });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, 'RESCUE_EXPIRED');
    const list = (await client(app).get('/rescue')).body;
    assert.ok(!list.data.some((x) => x.id === String(expired._id)));
  });

  test('vendor tạo sản phẩm: giá âm bị chặn; sửa giá hiện ở shop', async () => {
    const v = client(app);
    await v.login('dalatxanh@farmtable.vn');
    const farm = (await v.get('/vendor/farms')).body[0];
    let r = await v.post('/vendor/products', { farmId: farm.id, name: 'Ớt chuông', category: 'rau-cu', price: -5, unit: 'kg', stock: 10 });
    assert.equal(r.status, 400);
    r = await v.post('/vendor/products', { farmId: farm.id, name: 'Ớt chuông Đà Lạt', category: 'rau-cu', price: 55000, unit: 'kg', stock: 10 });
    assert.equal(r.status, 201);
    await v.patch(`/vendor/products/${r.body.id}`, { price: 59000 });
    assert.equal((await client(app).get(`/products/${r.body.slug}`)).body.price, 59000);
  });
});

describe('AC03/AC04 · Giỏ hàng, đặt hàng COD, tồn kho', () => {
  test('phí ship: 199.999đ => 20.000đ, 200.000đ => miễn phí', () => {
    assert.equal(shippingFeeFor(199999), 20000);
    assert.equal(shippingFeeFor(200000), 0);
    assert.equal(shippingFeeFor(0), 0);
  });

  test('giá client sai => 409 PRICE_CHANGED; tổng tiền do server tính; giỏ chỉ xóa khi thành công', async () => {
    const b = await freshBuyer();
    const p = await productBy('4'); // Cam sành 25.000đ
    await b.post('/cart/items', { productId: String(p._id), qty: 2 });
    let r = await b.post('/orders', { shippingAddress: addr, expectedTotal: 1000 }, { 'Idempotency-Key': uuid() });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, 'PRICE_CHANGED');
    assert.equal((await b.get('/cart')).body.items.length, 1);
    r = await b.post('/orders', { shippingAddress: addr, expectedTotal: 70000 }, { 'Idempotency-Key': uuid() });
    assert.equal(r.status, 201);
    assert.equal(r.body.subtotal, 50000);
    assert.equal(r.body.shippingFee, 20000);
    assert.equal(r.body.total, 70000);
    assert.equal((await productBy('4')).stock, p.stock - 2);
    assert.equal((await b.get('/cart')).body.items.length, 0);
  });

  test('giỏ rỗng => 400; thiếu Idempotency-Key => 400', async () => {
    const b = await freshBuyer();
    assert.equal((await b.post('/orders', { shippingAddress: addr })).status, 400);
    const r = await b.post('/orders', { shippingAddress: addr }, { 'Idempotency-Key': uuid() });
    assert.equal(r.body.error.code, 'CART_EMPTY');
  });

  test('gửi lặp cùng Idempotency-Key (song song) chỉ tạo 1 đơn', async () => {
    const b = await freshBuyer();
    const p = await productBy('23');
    await b.post('/cart/items', { productId: String(p._id), qty: 1 });
    const key = uuid();
    const results = await Promise.all([1, 2, 3].map(() => b.post('/orders', { shippingAddress: addr }, { 'Idempotency-Key': key })));
    const ok = results.filter((r) => r.status === 200 || r.status === 201);
    assert.ok(ok.length >= 1);
    assert.equal(new Set(ok.map((r) => r.body.id)).size, 1);
    const me = (await b.get('/auth/me')).body;
    assert.equal(await Order.countDocuments({ buyerId: me.id }), 1);
    assert.equal((await productBy('23')).stock, p.stock - 1);
  });

  test('2 người mua món cuối cùng lúc: chỉ 1 thành công, tồn không âm', async () => {
    const p = await productBy('12');
    await Product.updateOne({ _id: p._id }, { $set: { stock: 1, reservedStock: 0 } });
    const [b1, b2] = [await freshBuyer(), await freshBuyer()];
    await b1.post('/cart/items', { productId: String(p._id), qty: 1 });
    await b2.post('/cart/items', { productId: String(p._id), qty: 1 });
    const res = await Promise.all([b1, b2].map((b) => b.post('/orders', { shippingAddress: addr }, { 'Idempotency-Key': uuid() })));
    assert.deepEqual(res.map((r) => r.status).sort(), [201, 409]);
    assert.equal((await productBy('12')).stock, 0);
  });

  test('đơn 2 vendor: mỗi vendor chỉ thấy phần của mình; hủy lặp chỉ hoàn kho 1 lần; không nhảy lùi trạng thái', async () => {
    const b = await freshBuyer();
    const pA = await productBy('1'); // Đà Lạt Xanh
    const pB = await productBy('7'); // Trang trại CP
    await b.post('/cart/items', { productId: String(pA._id), qty: 1 });
    await b.post('/cart/items', { productId: String(pB._id), qty: 1 });
    const order = (await b.post('/orders', { shippingAddress: addr }, { 'Idempotency-Key': uuid() })).body;
    assert.equal(order.parts.length, 2);

    const vA = client(app);
    await vA.login('dalatxanh@farmtable.vn');
    const listA = (await vA.get('/vendor/orders')).body.data.filter((x) => x.orderId === order.id);
    assert.equal(listA.length, 1);
    assert.ok(listA[0].items.every((i) => i.productId === String(pA._id)));
    const partA = listA[0].partId;
    const partB = order.parts.find((p) => p.vendor.id === String(pB.vendorId)).id;
    // Vendor A không đụng được phần đơn của vendor B
    assert.equal((await vA.patch(`/vendor/orders/${order.id}/parts/${partB}`, { status: 'confirmed' })).status, 404);
    // A xác nhận -> giao -> không được quay lại pending
    assert.equal((await vA.patch(`/vendor/orders/${order.id}/parts/${partA}`, { status: 'confirmed' })).status, 200);
    assert.equal((await vA.patch(`/vendor/orders/${order.id}/parts/${partA}`, { status: 'pending' })).status, 409);
    // COD chỉ thu khi đã giao
    assert.equal((await vA.patch(`/vendor/orders/${order.id}/parts/${partA}/cod`, { status: 'collected' })).status, 409);

    // Buyer hủy: chỉ phần B còn pending bị hủy; gọi 2 lần song song chỉ hoàn kho một lần
    const stockB = (await productBy('7')).stock;
    const cancels = await Promise.all([b.post(`/orders/${order.id}/cancel`), b.post(`/orders/${order.id}/cancel`)]);
    assert.ok(cancels.some((r) => r.status === 200));
    assert.equal((await productBy('7')).stock, stockB + 1);
    const again = await b.post(`/orders/${order.id}/cancel`);
    assert.equal(again.status, 409);
    assert.equal((await productBy('7')).stock, stockB + 1);
    const view = (await b.get(`/orders/${order.id}`)).body;
    assert.equal(view.parts.find((p) => p.id === partA).status, 'confirmed');
    assert.equal(view.parts.find((p) => p.id === partB).status, 'cancelled');
  });

  test('buyer khác không xem được đơn bằng cách đổi ID', async () => {
    const owner = await freshBuyer();
    const p = await productBy('24');
    await owner.post('/cart/items', { productId: String(p._id), qty: 1 });
    const order = (await owner.post('/orders', { shippingAddress: addr }, { 'Idempotency-Key': uuid() })).body;
    const other = await freshBuyer();
    assert.equal((await other.get(`/orders/${order.id}`)).status, 404);
    assert.equal((await other.post(`/orders/${order.id}/cancel`)).status, 404);
  });

  test('sửa giá sau khi đặt không đổi đơn cũ (snapshot)', async () => {
    const b = await freshBuyer();
    const p = await productBy('27');
    await b.post('/cart/items', { productId: String(p._id), qty: 1 });
    const order = (await b.post('/orders', { shippingAddress: addr }, { 'Idempotency-Key': uuid() })).body;
    await Product.updateOne({ _id: p._id }, { $set: { price: p.price + 9000 } });
    const again = (await b.get(`/orders/${order.id}`)).body;
    assert.equal(again.parts[0].items[0].unitPrice, p.price);
    await Product.updateOne({ _id: p._id }, { $set: { price: p.price } });
  });
});

describe('AC06 · Mystery Box', () => {
  test('API công khai không lộ thành phần; mua hộp trừ đúng nguyên liệu; thiếu 1 nguyên liệu thì không bán', async () => {
    const list = (await client(app).get('/mystery-boxes')).body;
    assert.ok(list.length >= 2);
    for (const b of list) {
      assert.equal(b.components, undefined);
      assert.ok(!JSON.stringify(b).includes('productId'));
    }
    const box = await MysteryBox.findOne({ legacyId: 'box-rau-dalat' }).lean();
    const before = await Product.find({ _id: { $in: box.components.map((c) => c.productId) } }).lean();
    const b = await freshBuyer();
    let r = await b.post('/cart/items', { boxId: String(box._id), qty: 2 });
    assert.equal(r.status, 201);
    r = await b.post('/orders', { shippingAddress: addr }, { 'Idempotency-Key': uuid() });
    assert.equal(r.status, 201);
    assert.equal(r.body.parts[0].items[0].contents, undefined);
    for (const c of box.components) {
      const prev = before.find((p) => String(p._id) === String(c.productId));
      assert.equal((await Product.findById(c.productId)).stock, prev.stock - c.qty * 2);
    }
    // Hủy đơn => hoàn lại nguyên liệu
    await b.post(`/orders/${r.body.id}/cancel`);
    for (const c of box.components) {
      const prev = before.find((p) => String(p._id) === String(c.productId));
      assert.equal((await Product.findById(c.productId)).stock, prev.stock);
    }
    // Một nguyên liệu hết hàng => số hộp còn bán = 0
    const ing = await Product.findOne({ legacyId: 'ing-caingot' });
    const saved = ing.stock;
    await Product.updateOne({ _id: ing._id }, { $set: { stock: 0 } });
    const pub = (await client(app).get(`/mystery-boxes/${box._id}`)).body;
    assert.equal(pub.available, 0);
    const b2 = await freshBuyer();
    assert.equal((await b2.post('/cart/items', { boxId: String(box._id), qty: 1 })).status, 409);
    await Product.updateOne({ _id: ing._id }, { $set: { stock: saved } });
  });
});

describe('AC07 · Group Buy', () => {
  async function newCampaign({ target = 3, max = 4 } = {}) {
    const v = client(app);
    await v.login('dalatxanh@farmtable.vn');
    const p = await productBy('1');
    const r = await v.post('/vendor/group-buys', {
      productId: String(p._id),
      groupPrice: p.price - 5000,
      targetQty: target,
      maxQty: max,
      deadline: new Date(Date.now() + 2 * 3600000).toISOString(),
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return { v, campaign: r.body, product: p };
  }

  test('validate khi tạo: giá nhóm phải thấp hơn giá lẻ, hạn chót >= 1 giờ', async () => {
    const v = client(app);
    await v.login('dalatxanh@farmtable.vn');
    const p = await productBy('1');
    const r = await v.post('/vendor/group-buys', { productId: String(p._id), groupPrice: p.price + 1, targetQty: 5, maxQty: 3, deadline: new Date().toISOString() });
    assert.equal(r.status, 400);
    const fields = r.body.error.details.map((d) => d.field);
    assert.ok(fields.includes('groupPrice') && fields.includes('targetQty') && fields.includes('deadline'));
  });

  test('join giữ chỗ, chặn join trùng và vượt số lượng; đủ max thì đóng ngay và sinh 1 đơn/người', async () => {
    const { campaign, product } = await newCampaign({ target: 3, max: 4 });
    const b1 = await freshBuyer();
    const b2 = await freshBuyer();
    let r = await b1.post(`/group-buys/${campaign.id}/join`, { qty: 2, shippingAddress: addr }, { 'Idempotency-Key': uuid() });
    assert.equal(r.status, 201);
    assert.equal((await productBy('1')).reservedStock, product.reservedStock + 2);
    r = await b1.post(`/group-buys/${campaign.id}/join`, { qty: 1, shippingAddress: addr }, { 'Idempotency-Key': uuid() });
    assert.equal(r.body.error.code, 'ALREADY_JOINED');
    r = await b2.post(`/group-buys/${campaign.id}/join`, { qty: 3, shippingAddress: addr }, { 'Idempotency-Key': uuid() });
    assert.equal(r.body.error.code, 'CAMPAIGN_FULL');
    // Chưa thu tiền, chưa có đơn ở bước cam kết
    assert.equal(await Order.countDocuments({ groupBuyId: campaign.id }), 0);
    r = await b2.post(`/group-buys/${campaign.id}/join`, { qty: 2, shippingAddress: addr }, { 'Idempotency-Key': uuid() });
    assert.equal(r.status, 201);
    const c = await GroupBuy.findById(campaign.id).lean();
    assert.equal(c.status, 'succeeded');
    assert.equal(await Order.countDocuments({ groupBuyId: campaign.id }), 2);
    // Chạy đóng lặp lại (như worker restart) không sinh thêm đơn, không trừ kho lần nữa
    const stockAfter = (await productBy('1')).stock;
    await Promise.all([closeCampaign(campaign.id, { force: true }), closeCampaign(campaign.id, { force: true })]);
    assert.equal(await Order.countDocuments({ groupBuyId: campaign.id }), 2);
    assert.equal((await productBy('1')).stock, stockAfter);
    assert.equal((await productBy('1')).reservedStock, product.reservedStock);
  });

  test('join đồng thời không vượt maxQty', async () => {
    const { campaign } = await newCampaign({ target: 5, max: 6 });
    const buyers = await Promise.all([1, 2, 3, 4, 5].map(() => freshBuyer()));
    const res = await Promise.all(
      buyers.map((b) => b.post(`/group-buys/${campaign.id}/join`, { qty: 2, shippingAddress: addr }, { 'Idempotency-Key': uuid() })),
    );
    const okCount = res.filter((r) => r.status === 201).length;
    assert.ok(okCount <= 3);
    const c = await GroupBuy.findById(campaign.id).lean();
    assert.ok(c.joinedQty <= 6);
    const members = await GroupBuyMembership.countDocuments({ campaignId: campaign.id, status: { $in: ['committed', 'ordered'] } });
    assert.equal(members, okCount);
  });

  test('hết hạn mà không đạt ngưỡng: không sinh đơn, trả lại giữ chỗ', async () => {
    const { campaign } = await newCampaign({ target: 4, max: 4 });
    const before = (await productBy('1')).reservedStock;
    const b = await freshBuyer();
    await b.post(`/group-buys/${campaign.id}/join`, { qty: 1, shippingAddress: addr }, { 'Idempotency-Key': uuid() });
    assert.equal((await productBy('1')).reservedStock, before + 1);
    await GroupBuy.updateOne({ _id: campaign.id }, { $set: { deadline: new Date(Date.now() - 1000) } });
    assert.equal(await closeCampaign(campaign.id), 'failed');
    assert.equal(await Order.countDocuments({ groupBuyId: campaign.id }), 0);
    assert.equal((await productBy('1')).reservedStock, before);
    const r = await b.post(`/group-buys/${campaign.id}/join`, { qty: 1, shippingAddress: addr }, { 'Idempotency-Key': uuid() });
    assert.equal(r.body.error.code, 'CAMPAIGN_CLOSED');
  });
});

describe('AC08 · Gợi ý sản phẩm (ML tắt => fallback)', () => {
  test('ML không chạy: vẫn trả gợi ý, ghi rõ source=fallback, không chứa chính sản phẩm', async () => {
    const p = await productBy('1');
    const r = await client(app).get(`/recommendations/similar/${p._id}?limit=5`);
    assert.equal(r.status, 200);
    assert.equal(r.body.source, 'fallback');
    assert.equal(r.body.items.length, 5);
    assert.ok(!r.body.items.some((i) => i.product.id === String(p._id)));
    assert.ok(r.body.items.every((i) => i.product.inStock));
    const h = (await client(app).get('/health')).body;
    assert.equal(h.ml, 'down');
    assert.equal(h.db, 'ok');
  });

  test('user mới (cold start) có gợi ý cơ sở; sự kiện view không nhân đôi khi reload', async () => {
    const b = await freshBuyer();
    const r = await b.get('/recommendations/for-me');
    assert.equal(r.body.reason, 'cold-start');
    const p = await productBy('3');
    assert.equal((await b.post('/events', { type: 'view', productId: String(p._id) })).status, 201);
    const again = await b.post('/events', { type: 'view', productId: String(p._id) });
    assert.equal(again.body.deduped, true);
  });
});

describe('KPI', () => {
  test('vendor chỉ thấy số liệu của mình; giá trị hoàn tất tách khỏi COD đã thu', async () => {
    const v = client(app);
    await v.login('dalatxanh@farmtable.vn');
    const k = (await v.get('/vendor/kpi')).body;
    assert.ok(typeof k.deliveredValue === 'number' && typeof k.codCollected === 'number');
    assert.equal(k.byVendor, undefined);
    const vendor = await User.findOne({ email: 'dalatxanh@farmtable.vn' }).lean();
    const agg = await Order.aggregate([
      { $unwind: '$parts' },
      { $match: { 'parts.vendorId': vendor._id, 'parts.status': { $ne: 'cancelled' }, createdAt: { $gte: new Date(k.from) } } },
      { $count: 'n' },
    ]);
    assert.equal(k.orderCount, agg[0]?.n || 0);
    const admin = client(app);
    await admin.login('admin@farmtable.vn');
    const ak = (await admin.get('/admin/kpi')).body;
    assert.ok(ak.byVendor.length >= 1);
    assert.equal((await v.get('/admin/kpi')).status, 403);
  });
});
