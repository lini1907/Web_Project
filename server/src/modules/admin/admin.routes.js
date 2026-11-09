import { Router } from 'express';
import mongoose from 'mongoose';
import { User, AuditLog, Farm, Product } from '../../models/index.js';
import { requireRole } from '../../middleware/auth.js';
import { parse, v, pageParams, paged, qstr, assertId } from '../../utils/validate.js';
import { Errors } from '../../utils/AppError.js';
import { escapeRegex } from '../../utils/text.js';

const router = Router();
router.use('/admin', requireRole('admin'));

async function audit(req, { action, target, before, after, reason }) {
  await AuditLog.create({
    actorId: req.user._id,
    actorEmail: req.user.email,
    action,
    targetType: 'user',
    targetId: String(target._id),
    targetLabel: `${target.name} <${target.email}>`,
    before,
    after,
    reason,
  });
}

function searchFilter(q) {
  if (!q) return {};
  const rx = { $regex: escapeRegex(q), $options: 'i' };
  return { $or: [{ name: rx }, { email: rx }] };
}

router.get('/admin/vendors', async (req, res) => {
  const filter = { role: 'vendor', ...searchFilter(qstr(req.query.q)) };
  const status = qstr(req.query.status);
  if (['pending', 'approved', 'rejected'].includes(status)) filter.vendorStatus = status;
  const vendors = await User.find(filter).sort({ createdAt: -1 }).lean();
  const farms = await Farm.find({ vendorId: { $in: vendors.map((x) => x._id) } }, { name: 1, vendorId: 1, province: 1 }).lean();
  const counts = await Product.aggregate([
    { $match: { vendorId: { $in: vendors.map((x) => x._id) } } },
    { $group: { _id: '$vendorId', total: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } },
  ]);
  res.json(
    vendors.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      phone: u.phone,
      status: u.status,
      vendorStatus: u.vendorStatus,
      vendorNote: u.vendorNote || '',
      createdAt: u.createdAt,
      farms: farms.filter((f) => String(f.vendorId) === String(u._id)).map((f) => ({ id: String(f._id), name: f.name, province: f.province })),
      productCount: counts.find((c) => String(c._id) === String(u._id))?.total || 0,
      activeProductCount: counts.find((c) => String(c._id) === String(u._id))?.active || 0,
    })),
  );
});

router.patch('/admin/vendors/:id', async (req, res) => {
  const body = parse(
    { vendorStatus: v.enum(['approved', 'rejected', 'pending']), reason: v.string({ min: 0, max: 300 }).optional() },
    req.body,
  );
  if (body.vendorStatus === 'rejected' && !body.reason) {
    throw Errors.validation([{ field: 'reason', message: 'Cần ghi lý do khi từ chối' }]);
  }
  const vendor = await User.findOne({ _id: assertId(req.params.id), role: 'vendor' });
  if (!vendor) throw Errors.notFound('Nhà bán không tồn tại');
  const before = { vendorStatus: vendor.vendorStatus };
  vendor.vendorStatus = body.vendorStatus;
  vendor.vendorNote = body.reason || '';
  await vendor.save();
  await audit(req, { action: `vendor.${body.vendorStatus}`, target: vendor, before, after: { vendorStatus: vendor.vendorStatus }, reason: body.reason });
  res.json(vendor.toPublic());
});

router.get('/admin/users', async (req, res) => {
  const filter = searchFilter(qstr(req.query.q));
  const role = qstr(req.query.role);
  const status = qstr(req.query.status);
  if (['buyer', 'vendor', 'admin'].includes(role)) filter.role = role;
  if (['active', 'locked'].includes(status)) filter.status = status;
  const page = pageParams(req.query, { defLimit: 20 });
  const [rows, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit),
    User.countDocuments(filter),
  ]);
  res.json(paged(rows.map((u) => ({ ...u.toPublic(), lastLoginAt: u.lastLoginAt || null })), total, page));
});

router.patch('/admin/users/:id', async (req, res) => {
  const body = parse({ status: v.enum(['active', 'locked']), reason: v.string({ min: 0, max: 300 }).optional() }, req.body);
  const id = assertId(req.params.id);
  if (id === String(req.user._id)) throw Errors.invalidState('Không thể tự khóa tài khoản của chính mình');
  const user = await User.findById(id);
  if (!user) throw Errors.notFound('Người dùng không tồn tại');
  if (user.role === 'admin') throw Errors.forbidden('Không thể khóa tài khoản quản trị khác');
  const before = { status: user.status };
  user.status = body.status;
  await user.save();
  // Khóa: xóa các session đang mở của user này để mất quyền ngay lập tức.
  if (body.status === 'locked') {
    await mongoose.connection
      .collection('sessions')
      .deleteMany({ session: { $regex: `"userId":"${id}"` } })
      .catch(() => {});
  }
  await audit(req, { action: `user.${body.status === 'locked' ? 'lock' : 'unlock'}`, target: user, before, after: { status: user.status }, reason: body.reason });
  res.json(user.toPublic());
});

router.get('/admin/audit-logs', async (req, res) => {
  const page = pageParams(req.query, { defLimit: 20 });
  const [rows, total] = await Promise.all([
    AuditLog.find().sort({ at: -1 }).skip(page.skip).limit(page.limit).lean(),
    AuditLog.countDocuments(),
  ]);
  res.json(
    paged(
      rows.map((r) => ({
        id: String(r._id),
        actorEmail: r.actorEmail,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        targetLabel: r.targetLabel,
        before: r.before,
        after: r.after,
        reason: r.reason || '',
        at: r.at,
      })),
      total,
      page,
    ),
  );
});

export default router;
