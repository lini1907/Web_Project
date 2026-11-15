import { Router } from 'express';
import mongoose from 'mongoose';
import { Review, Product, Order, AuditLog } from '../../models/index.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { limits } from '../../middleware/security.js';
import { parse, v, pageParams, paged, qstr, assertId } from '../../utils/validate.js';
import { Errors } from '../../utils/AppError.js';
import { escapeRegex } from '../../utils/text.js';

const router = Router();

const reviewShape = {
  rating: v.int({ min: 1, max: 5 }),
  comment: v.string({ min: 0, max: 1000 }).optional(),
};

function toDto(r, viewerId) {
  return {
    id: String(r._id),
    productId: String(r.productId),
    userName: r.userName || 'Người mua',
    rating: r.rating,
    comment: r.comment || '',
    status: r.status,
    mine: viewerId ? String(r.userId) === String(viewerId) : false,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Tính lại điểm trung bình + số đánh giá của sản phẩm từ các đánh giá đang hiển thị. */
export async function recalcProductRating(productId) {
  const pid = new mongoose.Types.ObjectId(String(productId));
  const [agg] = await Review.aggregate([
    { $match: { productId: pid, status: 'visible' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ]);
  await Product.updateOne({ _id: pid }, { $set: { rating: agg ? Math.round(agg.avg * 10) / 10 : 0, reviewCount: agg?.n || 0 } });
}

/** Người mua đã nhận được sản phẩm này chưa (có phần đơn delivered chứa sản phẩm). */
async function hasReceived(userId, productId) {
  return !!(await Order.exists({
    buyerId: userId,
    parts: { $elemMatch: { status: 'delivered', 'items.productId': productId } },
  }));
}

async function loadProduct(id) {
  const p = await Product.findOne({ _id: assertId(id, 'Không tìm thấy sản phẩm'), type: { $ne: 'mystery-ingredient' } }, { _id: 1, name: 1 }).lean();
  if (!p) throw Errors.notFound('Không tìm thấy sản phẩm');
  return p;
}

// ---------- Read: công khai ----------
router.get('/products/:id/reviews', async (req, res) => {
  const product = await loadProduct(req.params.id);
  const filter = { productId: product._id, status: 'visible' };
  const page = pageParams(req.query, { defLimit: 5, maxLimit: 20 });
  const [rows, total, dist] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).lean(),
    Review.countDocuments(filter),
    Review.aggregate([{ $match: filter }, { $group: { _id: '$rating', n: { $sum: 1 } } }]),
  ]);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const d of dist) distribution[d._id] = d.n;
  res.json({ ...paged(rows.map((r) => toDto(r, req.user?._id)), total, page), distribution });
});

/** Đánh giá của chính tôi + tôi có được viết đánh giá không. */
router.get('/products/:id/reviews/mine', requireAuth, async (req, res) => {
  const product = await loadProduct(req.params.id);
  const mine = await Review.findOne({ productId: product._id, userId: req.user._id }).lean();
  const canReview = req.user.role === 'buyer' && !mine && (await hasReceived(req.user._id, product._id));
  res.json({ review: mine ? toDto(mine, req.user._id) : null, canReview });
});

// ---------- Create ----------
router.post('/products/:id/reviews', requireRole('buyer'), limits.writeReview, async (req, res) => {
  const body = parse(reviewShape, req.body);
  const product = await loadProduct(req.params.id);
  if (!(await hasReceived(req.user._id, product._id))) {
    throw Errors.forbidden('Bạn chỉ có thể đánh giá sản phẩm đã mua và nhận hàng thành công');
  }
  if (await Review.exists({ productId: product._id, userId: req.user._id })) {
    throw Errors.conflict('REVIEW_EXISTS', 'Bạn đã đánh giá sản phẩm này. Hãy sửa đánh giá cũ.');
  }
  const doc = await Review.create({ ...body, productId: product._id, userId: req.user._id, userName: req.user.name });
  await recalcProductRating(product._id);
  res.status(201).json(toDto(doc, req.user._id));
});

// ---------- Update: chỉ chủ đánh giá ----------
router.patch('/reviews/:id', requireRole('buyer'), limits.writeReview, async (req, res) => {
  const body = parse({ rating: reviewShape.rating.optional(), comment: reviewShape.comment }, req.body);
  const doc = await Review.findById(assertId(req.params.id));
  // Không phải của mình => 404 (không tiết lộ đánh giá tồn tại).
  if (!doc || String(doc.userId) !== String(req.user._id)) throw Errors.notFound('Không tìm thấy đánh giá');
  Object.assign(doc, body);
  await doc.save();
  await recalcProductRating(doc.productId);
  res.json(toDto(doc, req.user._id));
});

// ---------- Delete: chủ đánh giá hoặc admin ----------
router.delete('/reviews/:id', requireAuth, async (req, res) => {
  const doc = await Review.findById(assertId(req.params.id));
  const isAdmin = req.user.role === 'admin';
  if (!doc || (!isAdmin && String(doc.userId) !== String(req.user._id))) throw Errors.notFound('Không tìm thấy đánh giá');
  await doc.deleteOne();
  await recalcProductRating(doc.productId);
  if (isAdmin) {
    await AuditLog.create({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: 'review.delete',
      targetType: 'review',
      targetId: String(doc._id),
      targetLabel: `${doc.userName}: ${doc.rating}★`,
      before: { rating: doc.rating, comment: doc.comment, status: doc.status },
    });
  }
  res.status(204).end();
});

// ---------- Admin: kiểm duyệt ----------
router.get('/admin/reviews', requireRole('admin'), async (req, res) => {
  const filter = {};
  const status = qstr(req.query.status);
  if (['visible', 'hidden'].includes(status)) filter.status = status;
  const rating = Number(req.query.rating);
  if (Number.isInteger(rating) && rating >= 1 && rating <= 5) filter.rating = rating;
  const q = qstr(req.query.q);
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' };
    const products = await Product.find({ name: rx }, { _id: 1 }).limit(200).lean();
    filter.$or = [{ comment: rx }, { userName: rx }, { productId: { $in: products.map((p) => p._id) } }];
  }
  const page = pageParams(req.query, { defLimit: 20 });
  const [rows, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).lean(),
    Review.countDocuments(filter),
  ]);
  const products = await Product.find({ _id: { $in: rows.map((r) => r.productId) } }, { name: 1, slug: 1 }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  res.json(
    paged(
      rows.map((r) => ({ ...toDto(r), product: { name: byId.get(String(r.productId))?.name || '(đã xóa)', slug: byId.get(String(r.productId))?.slug || '' } })),
      total,
      page,
    ),
  );
});

router.patch('/admin/reviews/:id', requireRole('admin'), async (req, res) => {
  const body = parse({ status: v.enum(['visible', 'hidden']), reason: v.string({ min: 0, max: 300 }).optional() }, req.body);
  const doc = await Review.findById(assertId(req.params.id));
  if (!doc) throw Errors.notFound('Không tìm thấy đánh giá');
  const before = { status: doc.status };
  doc.status = body.status;
  await doc.save();
  await recalcProductRating(doc.productId);
  await AuditLog.create({
    actorId: req.user._id,
    actorEmail: req.user.email,
    action: `review.${body.status === 'hidden' ? 'hide' : 'show'}`,
    targetType: 'review',
    targetId: String(doc._id),
    targetLabel: `${doc.userName}: ${doc.rating}★`,
    before,
    after: { status: doc.status },
    reason: body.reason,
  });
  res.json(toDto(doc));
});

export default router;
