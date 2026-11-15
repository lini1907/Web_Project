/**
 * Quản trị đơn hàng toàn sàn: danh sách + lọc theo trạng thái cả đơn, phân quyền, đổi trạng thái cả đơn
 * theo luồng TRANSITIONS, hủy => hoàn kho đúng một lần, lịch sử ghi by: 'admin', nhật ký AuditLog.
 * Kèm kiểm tra bản chụp danh mục (category/categoryName) trong dòng đơn.
 */
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, client, uuid } from './helpers.js';
import { Product, Order, AuditLog, User } from '../src/models/index.js';

let app;
let admin;
const addr = { name: 'Người Mua Test', phone: '0901234567', address: '12 Nguyễn Trãi, Quận 1, TP.HCM' };

before(async () => {
  app = await setup();
  admin = client(app);
  await admin.login('admin@farmtable.vn');
});
after(teardown);

async function freshBuyer() {
  const c = client(app);
  const email = `buyer-${uuid().slice(0, 8)}@example.com`;
  assert.equal((await c.post('/auth/register', { name: 'Buyer Test', email, password: 'Matkhau123' })).status, 201);
  c.email = email;
  return c;
}

/** Đặt đơn gồm các sản phẩm (mỗi dòng qty) và trả body đơn. */
async function placeOrder(buyer, products, qty = 2) {
  for (const p of products) {
    const r = await buyer.post('/cart/items', { productId: String(p._id), qty });
    assert.equal(r.status < 300, true, JSON.stringify(r.body));
  }
  const r = await buyer.post('/orders', { shippingAddress: addr }, { 'Idempotency-Key': uuid() });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}

const productA = () => Product.findOne({ legacyId: '1' }).lean(); // Nông trại Đà Lạt Xanh
async function productOfOtherVendor(vendorId) {
  const approved = await User.find({ role: 'vendor', vendorStatus: 'approved', _id: { $ne: vendorId } }, { _id: 1 }).lean();
  return Product.findOne({
    vendorId: { $in: approved.map((u) => u._id) },
    isActive: true,
    type: 'regular',
    $expr: { $gte: [{ $subtract: ['$stock', '$reservedStock'] }, 5] },
  }).lean();
}

describe('Admin · danh sách đơn hàng', () => {
  test('admin xem mọi đơn, lọc theo trạng thái cả đơn, tìm theo mã đơn / email người mua', async () => {
    const buyer = await freshBuyer();
    const order = await placeOrder(buyer, [await productA()], 1);

    const all = await admin.get('/admin/orders?limit=50');
    assert.equal(all.status, 200);
    assert.ok(all.body.total >= 1);
    assert.ok(all.body.counts.all >= all.body.total - 0);
    assert.equal(typeof all.body.counts.pending, 'number');

    const pending = await admin.get('/admin/orders?status=pending&limit=50');
    assert.equal(pending.status, 200);
    assert.ok(pending.body.data.length > 0);
    assert.ok(pending.body.data.every((o) => o.status === 'pending'));
    assert.equal(pending.body.total, pending.body.counts.pending);

    const delivered = await admin.get('/admin/orders?status=delivered&limit=50');
    assert.ok(delivered.body.data.every((o) => o.status === 'delivered'));
    assert.ok(!delivered.body.data.some((o) => o.id === order.id));

    const byCode = await admin.get(`/admin/orders?q=${order.code}`);
    assert.equal(byCode.body.total, 1);
    const row = byCode.body.data[0];
    assert.equal(row.id, order.id);
    assert.equal(row.buyer.email, buyer.email);
    assert.equal(row.buyer.name, 'Buyer Test');
    assert.ok('phone' in row.buyer);

    const byEmail = await admin.get(`/admin/orders?q=${encodeURIComponent(buyer.email)}`);
    assert.deepEqual(byEmail.body.data.map((o) => o.id), [order.id]);

    // Sắp xếp theo tổng tiền tăng dần.
    const sorted = await admin.get('/admin/orders?sort=total&dir=asc&limit=50');
    const totals = sorted.body.data.map((o) => o.total);
    assert.deepEqual(totals, [...totals].sort((a, b) => a - b));

    const detail = await admin.get(`/admin/orders/${order.id}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.code, order.code);
    assert.ok(detail.body.parts[0].vendorName);
    assert.equal(detail.body.shippingAddress.phone, addr.phone);
    assert.deepEqual(detail.body.nextStatuses, ['confirmed', 'cancelled']);
    assert.equal(detail.body.parts[0].history[0].status, 'pending');
  });

  test('người mua và nhà bán bị 403; id sai / không tồn tại => 404', async () => {
    const buyer = await freshBuyer();
    const order = await placeOrder(buyer, [await productA()], 1);
    const vendor = client(app);
    await vendor.login('dalatxanh@farmtable.vn');
    for (const c of [buyer, vendor]) {
      assert.equal((await c.get('/admin/orders')).status, 403);
      assert.equal((await c.get(`/admin/orders/${order.id}`)).status, 403);
      assert.equal((await c.put(`/admin/orders/${order.id}/status`, { status: 'confirmed' })).status, 403);
    }
    assert.equal((await admin.get('/admin/orders/khong-hop-le')).status, 404);
    assert.equal((await admin.get('/admin/orders/000000000000000000000000')).status, 404);
    assert.equal((await admin.put('/admin/orders/000000000000000000000000/status', { status: 'confirmed' })).status, 404);
  });
});

describe('Admin · đổi trạng thái cả đơn', () => {
  test('sai luồng => 409, sai dữ liệu => 400; xác nhận ghi lịch sử by admin và báo người mua thấy', async () => {
    const buyer = await freshBuyer();
    const order = await placeOrder(buyer, [await productA()], 1);
    const url = `/admin/orders/${order.id}/status`;

    let r = await admin.put(url, { status: 'delivered' });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, 'INVALID_STATE');
    assert.equal((await admin.put(url, { status: 'shipping' })).status, 409);
    assert.equal((await admin.put(url, { status: 'teleported' })).status, 400);
    assert.equal((await admin.put(url, { status: 'pending' })).status, 400);
    assert.equal((await admin.put(url, { status: 'cancelled' })).status, 400, 'hủy phải có lý do');

    r = await admin.put(url, { status: 'confirmed' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.status, 'confirmed');
    assert.deepEqual(r.body.nextStatuses, ['shipping', 'cancelled']);
    const last = r.body.parts[0].history.at(-1);
    assert.equal(last.status, 'confirmed');
    assert.equal(last.by, 'admin');

    // Lùi trạng thái không được phép.
    assert.equal((await admin.put(url, { status: 'confirmed' })).status, 409);

    r = await admin.put(url, { status: 'shipping' });
    assert.equal(r.status, 200);
    assert.ok(r.body.parts[0].shipment?.trackingCode, 'chuyển đang giao tạo vận đơn');
    r = await admin.put(url, { status: 'delivered' });
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'delivered');
    assert.deepEqual(r.body.nextStatuses, []);
    assert.equal((await admin.put(url, { status: 'cancelled', reason: 'Thử hủy đơn đã giao' })).status, 409);

    const seen = await buyer.get(`/orders/${order.id}`);
    assert.equal(seen.body.status, 'delivered');
    assert.ok(seen.body.parts[0].history.some((h) => h.by === 'admin'));

    const logs = await AuditLog.find({ targetType: 'order', targetId: order.id }).lean();
    assert.deepEqual(logs.map((l) => l.action).sort(), ['order.confirmed', 'order.delivered', 'order.shipping']);
    assert.equal(logs[0].actorEmail, 'admin@farmtable.vn');
    assert.equal(logs[0].targetLabel, `Đơn ${order.code}`);
    const list = await admin.get('/admin/audit-logs?limit=50');
    assert.ok(list.body.data.some((l) => l.targetType === 'order' && l.targetId === order.id));
  });

  test('hủy cả đơn => hoàn kho mọi phần đơn đúng một lần, lịch sử by admin kèm lý do', async () => {
    const pA = await productA();
    const pB = await productOfOtherVendor(pA.vendorId);
    assert.ok(pB, 'cần sản phẩm của nhà bán khác');
    const buyer = await freshBuyer();
    const order = await placeOrder(buyer, [pA, pB], 2);
    assert.equal(order.parts.length, 2);
    const afterOrderA = (await Product.findById(pA._id).lean()).stock;
    const afterOrderB = (await Product.findById(pB._id).lean()).stock;

    const r = await admin.put(`/admin/orders/${order.id}/status`, { status: 'cancelled', reason: 'Người mua gọi điện yêu cầu hủy' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.status, 'cancelled');
    assert.equal((await Product.findById(pA._id).lean()).stock, afterOrderA + 2);
    assert.equal((await Product.findById(pB._id).lean()).stock, afterOrderB + 2);

    const doc = await Order.findById(order.id).lean();
    for (const part of doc.parts) {
      assert.equal(part.status, 'cancelled');
      assert.equal(part.stockRestored, true);
      const last = part.history.at(-1);
      assert.equal(last.by, 'admin');
      assert.equal(last.note, 'Người mua gọi điện yêu cầu hủy');
    }
    // Hủy lần nữa: 409 và không hoàn kho thêm.
    assert.equal((await admin.put(`/admin/orders/${order.id}/status`, { status: 'cancelled', reason: 'Lặp lại' })).status, 409);
    assert.equal((await Product.findById(pA._id).lean()).stock, afterOrderA + 2);
    const log = await AuditLog.findOne({ targetType: 'order', targetId: order.id, action: 'order.cancelled' }).lean();
    assert.equal(log.reason, 'Người mua gọi điện yêu cầu hủy');
  });

  test('phần đơn lệch trạng thái (một nhà bán đã xác nhận) => admin không đổi được cả đơn (409)', async () => {
    const pA = await productA();
    const pB = await productOfOtherVendor(pA.vendorId);
    const buyer = await freshBuyer();
    const order = await placeOrder(buyer, [pA, pB], 1);
    const vendor = client(app);
    await vendor.login('dalatxanh@farmtable.vn');
    const partA = order.parts.find((p) => p.vendor.id === String(pA.vendorId));
    assert.equal((await vendor.patch(`/vendor/orders/${order.id}/parts/${partA.id}`, { status: 'confirmed' })).status, 200);

    const detail = await admin.get(`/admin/orders/${order.id}`);
    assert.equal(detail.body.status, 'processing');
    assert.equal(detail.body.uniformStatus, null);
    assert.deepEqual(detail.body.nextStatuses, []);
    assert.ok(detail.body.lockedReason);
    const r = await admin.put(`/admin/orders/${order.id}/status`, { status: 'cancelled', reason: 'Thử hủy' });
    assert.equal(r.status, 409);
    const filtered = await admin.get(`/admin/orders?status=processing&q=${order.code}`);
    assert.deepEqual(filtered.body.data.map((o) => o.id), [order.id]);
  });
});

describe('Dòng đơn lưu bản chụp danh mục', () => {
  test('đơn mới có category + categoryName; đơn cũ không có field vẫn trả về (null)', async () => {
    const pA = await productA();
    const buyer = await freshBuyer();
    const order = await placeOrder(buyer, [pA], 1);
    const item = order.parts[0].items[0];
    assert.equal(item.category, pA.category);
    assert.ok(item.categoryName && item.categoryName !== pA.category);

    // Mô phỏng đơn cũ: xóa field danh mục.
    await Order.updateOne({ _id: order.id }, { $unset: { 'parts.0.items.0.category': '', 'parts.0.items.0.categoryName': '' } });
    const old = await buyer.get(`/orders/${order.id}`);
    assert.equal(old.status, 200);
    assert.equal(old.body.parts[0].items[0].categoryName, null);
    assert.equal((await admin.get(`/admin/orders/${order.id}`)).status, 200);
    const vendor = client(app);
    await vendor.login('dalatxanh@farmtable.vn');
    const vlist = await vendor.get('/vendor/orders?limit=50');
    assert.ok(vlist.body.data.some((p) => p.orderId === order.id));
  });
});
