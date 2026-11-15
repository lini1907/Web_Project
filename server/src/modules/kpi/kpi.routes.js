import { Router } from 'express';
import mongoose from 'mongoose';
import { Order, Product, User, GroupBuy } from '../../models/index.js';
import { requireRole } from '../../middleware/auth.js';
import { qstr } from '../../utils/validate.js';
import { Errors } from '../../utils/AppError.js';

const router = Router();
const LOW_STOCK = 5;

/** Khoảng ngày theo giờ Việt Nam; mặc định 30 ngày gần nhất. */
function range(query) {
  const parse = (s, endOfDay) => {
    if (!s) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw Errors.validation([{ field: 'from/to', message: 'Định dạng YYYY-MM-DD' }]);
    return new Date(`${s}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+07:00`);
  };
  const to = parse(qstr(query.to), true) || new Date();
  const from = parse(qstr(query.from), false) || new Date(to.getTime() - 29 * 86400000);
  if (from > to) throw Errors.validation([{ field: 'from', message: 'Ngày bắt đầu phải trước ngày kết thúc' }]);
  return { from, to };
}

/**
 * Định nghĩa KPI (thống nhất với API contract):
 * - orderCount: số phần đơn KHÔNG bị hủy trong khoảng ngày
 * - deliveredValue: tổng tiền hàng của phần đơn đã giao (giá trị đơn hoàn tất)
 * - codCollected: tổng tiền phần đơn vendor đã xác nhận thu COD (doanh thu đã thu)
 * - cancelledCount: số phần đơn bị hủy
 * - lowStock: sản phẩm đang bán có tồn khả dụng <= 5
 */
async function partStats(match, { from, to }) {
  const [res] = await Order.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $unwind: '$parts' },
    { $match: match },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              orderCount: { $sum: { $cond: [{ $ne: ['$parts.status', 'cancelled'] }, 1, 0] } },
              cancelledCount: { $sum: { $cond: [{ $eq: ['$parts.status', 'cancelled'] }, 1, 0] } },
              pendingCount: { $sum: { $cond: [{ $eq: ['$parts.status', 'pending'] }, 1, 0] } },
              deliveredCount: { $sum: { $cond: [{ $eq: ['$parts.status', 'delivered'] }, 1, 0] } },
              deliveredValue: { $sum: { $cond: [{ $eq: ['$parts.status', 'delivered'] }, '$parts.subtotal', 0] } },
              openValue: {
                $sum: { $cond: [{ $in: ['$parts.status', ['pending', 'confirmed', 'shipping']] }, '$parts.subtotal', 0] },
              },
              codCollected: { $sum: { $cond: [{ $eq: ['$parts.cod.status', 'collected'] }, '$parts.subtotal', 0] } },
            },
          },
        ],
        byStatus: [{ $group: { _id: '$parts.status', count: { $sum: 1 } } }],
        daily: [
          { $match: { 'parts.status': { $ne: 'cancelled' } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+07:00' } },
              orders: { $sum: 1 },
              value: { $sum: '$parts.subtotal' },
            },
          },
          { $sort: { _id: 1 } },
        ],
        topProducts: [
          { $match: { 'parts.status': { $ne: 'cancelled' } } },
          { $unwind: '$parts.items' },
          { $group: { _id: '$parts.items.name', qty: { $sum: '$parts.items.qty' }, value: { $sum: '$parts.items.lineTotal' } } },
          { $sort: { value: -1 } },
          { $limit: 5 },
        ],
        byVendor: [
          {
            $group: {
              _id: '$parts.vendorId',
              vendorName: { $first: '$parts.vendorName' },
              orderCount: { $sum: { $cond: [{ $ne: ['$parts.status', 'cancelled'] }, 1, 0] } },
              deliveredValue: { $sum: { $cond: [{ $eq: ['$parts.status', 'delivered'] }, '$parts.subtotal', 0] } },
              codCollected: { $sum: { $cond: [{ $eq: ['$parts.cod.status', 'collected'] }, '$parts.subtotal', 0] } },
              cancelledCount: { $sum: { $cond: [{ $eq: ['$parts.status', 'cancelled'] }, 1, 0] } },
            },
          },
          { $sort: { deliveredValue: -1, orderCount: -1 } },
        ],
      },
    },
  ]);
  const t = res.totals[0] || {};
  return {
    orderCount: t.orderCount || 0,
    cancelledCount: t.cancelledCount || 0,
    pendingCount: t.pendingCount || 0,
    deliveredCount: t.deliveredCount || 0,
    deliveredValue: t.deliveredValue || 0,
    openValue: t.openValue || 0,
    codCollected: t.codCollected || 0,
    byStatus: Object.fromEntries(res.byStatus.map((s) => [s._id, s.count])),
    daily: res.daily.map((d) => ({ date: d._id, orders: d.orders, value: d.value })),
    topProducts: res.topProducts.map((p) => ({ name: p._id, qty: p.qty, value: p.value })),
    byVendor: res.byVendor.map((x) => ({ vendorId: String(x._id), ...x, _id: undefined })),
  };
}

async function lowStock(filter) {
  const rows = await Product.find({
    ...filter,
    isActive: true,
    $expr: { $lte: [{ $subtract: ['$stock', '$reservedStock'] }, LOW_STOCK] },
  })
    .sort({ stock: 1 })
    .limit(20)
    .lean();
  return rows.map((p) => ({ id: String(p._id), name: p.name, stock: p.stock, reservedStock: p.reservedStock, stockLeft: p.stock - p.reservedStock, unit: p.unit }));
}

router.get('/vendor/kpi', requireRole('vendor'), async (req, res) => {
  const r = range(req.query);
  const vid = new mongoose.Types.ObjectId(String(req.user._id));
  const stats = await partStats({ 'parts.vendorId': vid }, r);
  delete stats.byVendor;
  const [productCount, openCampaigns] = await Promise.all([
    Product.countDocuments({ vendorId: vid, isActive: true }),
    GroupBuy.countDocuments({ vendorId: vid, status: 'open' }),
  ]);
  res.json({ from: r.from, to: r.to, ...stats, productCount, openCampaigns, lowStock: await lowStock({ vendorId: vid }) });
});

router.get('/admin/kpi', requireRole('admin'), async (req, res) => {
  const r = range(req.query);
  const stats = await partStats({}, r);
  const [users, pendingVendors, productCount, orderCount] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.countDocuments({ role: 'vendor', vendorStatus: 'pending' }),
    Product.countDocuments({ isActive: true }),
    Order.countDocuments({ createdAt: { $gte: r.from, $lte: r.to } }),
  ]);
  res.json({
    from: r.from,
    to: r.to,
    ...stats,
    checkoutOrders: orderCount,
    users: Object.fromEntries(users.map((u) => [u._id, u.count])),
    pendingVendors,
    productCount,
    lowStock: await lowStock({}),
  });
});

export default router;
