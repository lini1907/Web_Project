import { Router } from 'express';
import { Voucher, Cart, AuditLog, VOUCHER_TYPES } from '../../models/index.js';
import { requireRole } from '../../middleware/auth.js';
import { limits } from '../../middleware/security.js';
import { parse, v, pageParams, paged, qstr, assertId } from '../../utils/validate.js';
import { Errors } from '../../utils/AppError.js';
import { escapeRegex } from '../../utils/text.js';
import { resolveLines, summarize } from '../cart/cart.service.js';
import * as service from './voucher.service.js';

const router = Router();

const codeRule = v.string({ min: 3, max: 30, pattern: /^[A-Za-z0-9_-]+$/, message: 'Mã chỉ gồm chữ, số, "-" và "_"' });

function voucherShape(partial = false) {
  const shape = {
    code: codeRule,
    description: v.string({ min: 0, max: 200 }).optional(),
    type: v.enum(VOUCHER_TYPES),
    value: v.int({ min: 0, max: 100_000_000 }).optional(),
    maxDiscount: v.int({ min: 0, max: 100_000_000 }).optional(),
    minOrderValue: v.int({ min: 0, max: 1_000_000_000 }).optional(),
    maxUses: v.int({ min: 0, max: 1_000_000 }).optional(),
    startsAt: v.date().nullable(),
    expiresAt: v.date().nullable(),
    isActive: v.bool().optional(),
  };
  if (partial) for (const k of ['code', 'type']) shape[k] = shape[k].optional();
  return shape;
}

/** Kiểm tra ràng buộc giữa các trường (sau khi đã gộp dữ liệu cũ + mới). */
function validateRules(d) {
  const issues = [];
  if (d.type === 'percent' && (!d.value || d.value < 1 || d.value > 100)) issues.push({ field: 'value', message: 'Phần trăm giảm phải từ 1 đến 100' });
  if (d.type === 'fixed' && (!d.value || d.value < 1000)) issues.push({ field: 'value', message: 'Số tiền giảm tối thiểu 1.000đ' });
  if (d.startsAt && d.expiresAt && d.expiresAt <= d.startsAt) issues.push({ field: 'expiresAt', message: 'Ngày hết hạn phải sau ngày bắt đầu' });
  if (issues.length) throw Errors.validation(issues);
}

async function audit(req, action, voucher, before, after) {
  await AuditLog.create({
    actorId: req.user._id,
    actorEmail: req.user.email,
    action,
    targetType: 'voucher',
    targetId: String(voucher._id),
    targetLabel: voucher.code,
    before,
    after,
  });
}

const snapshot = (doc) => {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = service.toAdminVoucher(doc);
  return rest;
};

const codeTaken = () => Errors.conflict('VOUCHER_CODE_TAKEN', 'Mã này đã tồn tại', [{ field: 'code', message: 'Mã này đã tồn tại' }]);

// ---------- Admin: CRUD (Create - Read - Update - Delete) ----------
router.get('/admin/vouchers', requireRole('admin'), async (req, res) => {
  const filter = {};
  const q = qstr(req.query.q);
  if (q) filter.$or = [{ code: { $regex: escapeRegex(q), $options: 'i' } }, { description: { $regex: escapeRegex(q), $options: 'i' } }];
  const status = qstr(req.query.status);
  const now = new Date();
  if (status === 'active') Object.assign(filter, { isActive: true, $and: [{ $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] }] });
  if (status === 'inactive') filter.isActive = false;
  if (status === 'expired') filter.expiresAt = { $lt: now };
  const page = pageParams(req.query, { defLimit: 20 });
  const [rows, total] = await Promise.all([
    Voucher.find(filter).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).lean(),
    Voucher.countDocuments(filter),
  ]);
  res.json(paged(rows.map(service.toAdminVoucher), total, page));
});

router.get('/admin/vouchers/:id', requireRole('admin'), async (req, res) => {
  const doc = await Voucher.findById(assertId(req.params.id)).lean();
  if (!doc) throw Errors.notFound('Mã giảm giá không tồn tại');
  res.json(service.toAdminVoucher(doc));
});

router.post('/admin/vouchers', requireRole('admin'), async (req, res) => {
  const body = parse(voucherShape(), req.body);
  body.code = service.normalizeCode(body.code);
  validateRules(body);
  if (await Voucher.exists({ code: body.code })) throw codeTaken();
  const doc = await Voucher.create({ ...body, createdBy: req.user._id });
  await audit(req, 'voucher.create', doc, null, snapshot(doc));
  res.status(201).json(service.toAdminVoucher(doc));
});

router.patch('/admin/vouchers/:id', requireRole('admin'), async (req, res) => {
  const body = parse(voucherShape(true), req.body);
  const doc = await Voucher.findById(assertId(req.params.id));
  if (!doc) throw Errors.notFound('Mã giảm giá không tồn tại');
  const before = snapshot(doc);
  if (body.code !== undefined) {
    body.code = service.normalizeCode(body.code);
    if (body.code !== doc.code) {
      // Đơn cũ lưu mã cũ: đổi mã sau khi đã dùng sẽ không hoàn lượt được khi hủy đơn.
      if (doc.usedCount > 0) throw Errors.invalidState('Mã đã được sử dụng, không thể đổi mã. Hãy tạo mã mới.');
      if (await Voucher.exists({ code: body.code })) throw codeTaken();
    }
  }
  if (body.maxUses !== undefined && body.maxUses > 0 && body.maxUses < doc.usedCount) {
    throw Errors.validation([{ field: 'maxUses', message: `Đã có ${doc.usedCount} lượt dùng, không thể đặt thấp hơn` }]);
  }
  Object.assign(doc, body);
  validateRules(doc);
  await doc.save();
  await audit(req, 'voucher.update', doc, before, snapshot(doc));
  res.json(service.toAdminVoucher(doc));
});

router.delete('/admin/vouchers/:id', requireRole('admin'), async (req, res) => {
  const doc = await Voucher.findById(assertId(req.params.id));
  if (!doc) throw Errors.notFound('Mã giảm giá không tồn tại');
  // Mã đã dùng thì giữ lại để đối soát đơn cũ: chỉ cho tắt, không cho xóa.
  if (doc.usedCount > 0) throw Errors.invalidState('Mã đã được dùng trong đơn hàng nên không thể xóa. Hãy tắt mã thay vì xóa.');
  await doc.deleteOne();
  await audit(req, 'voucher.delete', doc, snapshot(doc), null);
  res.status(204).end();
});

// ---------- Người mua ----------
/** Danh sách mã đang áp dụng (gợi ý ở trang thanh toán). */
router.get('/vouchers', async (req, res) => {
  const now = new Date();
  const rows = await Voucher.find({
    isActive: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
      { $or: [{ maxUses: 0 }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
    ],
  })
    .sort({ minOrderValue: 1 })
    .limit(20)
    .lean();
  res.json(rows.map(service.toPublicVoucher));
});

/** Kiểm tra mã với giỏ hàng hiện tại của người mua. */
router.post('/vouchers/check', requireRole('buyer'), limits.voucherCheck, async (req, res) => {
  const { code } = parse({ code: v.string({ min: 1, max: 30 }) }, req.body);
  const cart = await Cart.findOne({ userId: req.user._id }).lean();
  const { lines } = await resolveLines(cart?.items || []);
  const summary = summarize(lines);
  if (!summary.subtotal) throw Errors.validation([{ field: 'voucherCode', message: 'Giỏ hàng đang trống' }]);
  res.json(await service.preview(code, req.user._id, summary));
});

export default router;
