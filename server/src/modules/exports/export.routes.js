import { Router } from 'express';
import { Order, Product, User, Voucher, Review, Farm, deriveOrderStatus, CATEGORY_LABELS } from '../../models/index.js';
import { requireRole } from '../../middleware/auth.js';
import { qstr } from '../../utils/validate.js';
import { Errors } from '../../utils/AppError.js';

/**
 * Xuất dữ liệu CSV cho admin (mở được bằng Excel: UTF-8 có BOM, phân cách dấu phẩy).
 * Chống "CSV injection": ô bắt đầu bằng = + - @ được thêm dấu ' để Excel không chạy công thức.
 */
const router = Router();
router.use('/admin/export', requireRole('admin'));

const MAX_ROWS = 50_000;

export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let s = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers, rows) {
  const lines = [headers.map(csvCell).join(',')];
  for (const r of rows) lines.push(r.map(csvCell).join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

function send(res, name, headers, rows) {
  const day = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="farmtable-${name}-${day}.csv"`);
  res.set('Cache-Control', 'no-store');
  res.send(toCsv(headers, rows));
}

function dateRange(query) {
  const range = {};
  const from = qstr(query.from);
  const to = qstr(query.to);
  if (from) {
    const d = new Date(`${from}T00:00:00+07:00`);
    if (Number.isNaN(d.getTime())) throw Errors.validation([{ field: 'from', message: 'Ngày không hợp lệ' }]);
    range.$gte = d;
  }
  if (to) {
    const d = new Date(`${to}T23:59:59.999+07:00`);
    if (Number.isNaN(d.getTime())) throw Errors.validation([{ field: 'to', message: 'Ngày không hợp lệ' }]);
    range.$lte = d;
  }
  return Object.keys(range).length ? { createdAt: range } : {};
}

const STATUS_VI = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', processing: 'Đang xử lý', shipping: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy' };
const PAY_VI = { pending: 'Chờ thanh toán', paid: 'Đã thanh toán', failed: 'Thất bại', refund_pending: 'Chờ hoàn tiền', unpaid: 'Chưa thanh toán' };
const ROLE_VI = { buyer: 'Người mua', vendor: 'Nhà bán', admin: 'Quản trị' };

/** Mỗi dòng = một phần đơn (đơn nhiều nhà bán sẽ có nhiều dòng cùng mã đơn). */
router.get('/admin/export/orders.csv', async (req, res) => {
  const orders = await Order.find(dateRange(req.query)).sort({ createdAt: -1 }).limit(MAX_ROWS).lean();
  const buyers = await User.find({ _id: { $in: orders.map((o) => o.buyerId) } }, { email: 1 }).lean();
  const emailOf = new Map(buyers.map((b) => [String(b._id), b.email]));
  const rows = [];
  for (const o of orders) {
    for (const p of o.parts) {
      rows.push([
        o.code,
        o.createdAt,
        STATUS_VI[deriveOrderStatus(o.parts)],
        o.source === 'group-buy' ? 'Mua chung' : 'Giỏ hàng',
        emailOf.get(String(o.buyerId)) || '',
        o.shippingAddress?.name,
        o.shippingAddress?.phone,
        o.shippingAddress?.address,
        p.vendorName,
        STATUS_VI[p.status],
        p.items.map((i) => `${i.name} x${i.qty}`).join('; '),
        p.subtotal,
        p.cod?.status === 'collected' ? 'Đã thu' : 'Chưa thu',
        o.subtotal,
        o.shippingFee,
        o.discount || 0,
        o.voucher?.code || '',
        o.total,
        { cod: 'COD', vnpay: 'VNPay', momo: 'MoMo' }[o.paymentMethod || 'cod'],
        o.paymentMethod && o.paymentMethod !== 'cod' ? PAY_VI[o.payment?.status] || '' : '',
      ]);
    }
  }
  send(
    res,
    'don-hang',
    ['Mã đơn', 'Ngày đặt', 'Trạng thái đơn', 'Nguồn', 'Email người mua', 'Người nhận', 'SĐT', 'Địa chỉ', 'Nhà bán', 'Trạng thái phần đơn', 'Sản phẩm', 'Tiền hàng phần đơn', 'COD', 'Tiền hàng cả đơn', 'Phí ship', 'Giảm giá', 'Mã giảm giá', 'Tổng thanh toán', 'Thanh toán', 'Trạng thái thanh toán online'],
    rows,
  );
});

router.get('/admin/export/products.csv', async (req, res) => {
  const products = await Product.find({}).sort({ createdAt: -1 }).limit(MAX_ROWS).lean();
  const farms = await Farm.find({ _id: { $in: products.map((p) => p.farmId) } }, { name: 1 }).lean();
  const farmName = new Map(farms.map((f) => [String(f._id), f.name]));
  send(
    res,
    'san-pham',
    ['ID', 'Tên', 'Nông trại', 'Danh mục', 'Loại', 'Giá', 'Đơn vị', 'Tồn kho', 'Đang giữ chỗ', 'Đã bán', 'Điểm đánh giá', 'Số đánh giá', 'Đang bán', 'Ngày tạo'],
    products.map((p) => [
      String(p._id),
      p.name,
      farmName.get(String(p.farmId)) || '',
      CATEGORY_LABELS[p.category] || p.category,
      { regular: 'Thường', rescue: 'Giải cứu', 'mystery-ingredient': 'Nguyên liệu Mystery Box' }[p.type],
      p.price,
      p.unit,
      p.stock,
      p.reservedStock,
      p.soldCount,
      p.rating,
      p.reviewCount,
      p.isActive ? 'Có' : 'Không',
      p.createdAt,
    ]),
  );
});

router.get('/admin/export/users.csv', async (req, res) => {
  const filter = {};
  const role = qstr(req.query.role);
  if (['buyer', 'vendor', 'admin'].includes(role)) filter.role = role;
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(MAX_ROWS).lean();
  send(
    res,
    'nguoi-dung',
    ['ID', 'Họ tên', 'Email', 'SĐT', 'Vai trò', 'Trạng thái', 'Duyệt nhà bán', 'Ngày tạo', 'Đăng nhập gần nhất'],
    users.map((u) => [
      String(u._id),
      u.name,
      u.email,
      u.phone,
      ROLE_VI[u.role],
      u.status === 'locked' ? 'Đã khóa' : 'Hoạt động',
      u.role === 'vendor' ? u.vendorStatus : '',
      u.createdAt,
      u.lastLoginAt || '',
    ]),
  );
});

router.get('/admin/export/vouchers.csv', async (req, res) => {
  const rows = await Voucher.find({}).sort({ createdAt: -1 }).limit(MAX_ROWS).lean();
  send(
    res,
    'ma-giam-gia',
    ['Mã', 'Mô tả', 'Loại', 'Giá trị', 'Giảm tối đa', 'Đơn tối thiểu', 'Lượt tối đa', 'Đã dùng', 'Bắt đầu', 'Hết hạn', 'Đang bật'],
    rows.map((x) => [
      x.code,
      x.description,
      { percent: 'Giảm %', fixed: 'Giảm tiền', freeship: 'Miễn phí ship' }[x.type],
      x.value,
      x.maxDiscount,
      x.minOrderValue,
      x.maxUses || 'Không giới hạn',
      x.usedCount,
      x.startsAt || '',
      x.expiresAt || '',
      x.isActive ? 'Có' : 'Không',
    ]),
  );
});

router.get('/admin/export/reviews.csv', async (req, res) => {
  const rows = await Review.find({}).sort({ createdAt: -1 }).limit(MAX_ROWS).lean();
  const products = await Product.find({ _id: { $in: rows.map((r) => r.productId) } }, { name: 1 }).lean();
  const nameOf = new Map(products.map((p) => [String(p._id), p.name]));
  send(
    res,
    'danh-gia',
    ['Sản phẩm', 'Người đánh giá', 'Số sao', 'Nội dung', 'Trạng thái', 'Ngày tạo'],
    rows.map((r) => [nameOf.get(String(r.productId)) || '', r.userName, r.rating, r.comment, r.status === 'hidden' ? 'Đã ẩn' : 'Hiển thị', r.createdAt]),
  );
});

export default router;
