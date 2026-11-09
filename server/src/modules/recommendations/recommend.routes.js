import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../../middleware/auth.js';
import { parse, v, assertId } from '../../utils/validate.js';
import { Product } from '../../models/index.js';
import { Errors } from '../../utils/AppError.js';
import * as rec from './recommend.service.js';
import { recordEvent, recentInteractions } from './events.service.js';
import { dbState } from '../../config/db.js';

const router = Router();

function limitOf(q, def, max = 12) {
  const n = Number.parseInt(q.limit, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(1, n)) : def;
}

router.get('/recommendations/similar/:productId', async (req, res) => {
  const id = assertId(req.params.productId, 'Sản phẩm không tồn tại');
  if (!(await Product.exists({ _id: id }))) throw Errors.notFound('Sản phẩm không tồn tại');
  const r = await rec.similar(id, limitOf(req.query, 5));
  if (req.user) await rec.saveHistory(req.user._id, 'similar', r, id).catch(() => {});
  res.json(r);
});

router.get('/recommendations/for-me', requireAuth, async (req, res) => {
  const ids = await recentInteractions(req.user._id, 20);
  const r = await rec.forUser(ids, limitOf(req.query, 8));
  await rec.saveHistory(req.user._id, 'for-me', r).catch(() => {});
  res.json(r);
});

/** Lịch sử gợi ý của chính người dùng (giải thích vì sao từng sản phẩm được gợi ý). */
router.get('/recommendations/history', requireAuth, async (req, res) => {
  res.json(await rec.history(req.user._id, limitOf(req.query, 20, 50)));
});

/** Ghi sự kiện từ client. "purchase" chỉ do server tự ghi khi tạo đơn. */
router.post('/events', async (req, res) => {
  const body = parse({ type: v.enum(['view', 'add_to_cart']), productId: v.id() }, req.body);
  const r = await recordEvent(req, body.type, body.productId);
  res.status(r.recorded ? 201 : 200).json(r);
});

router.get('/health', async (req, res) => {
  const ml = await rec.mlHealth();
  res.json({
    api: 'ok',
    db: dbState(),
    ml: ml.status,
    modelVersion: ml.modelVersion || null,
    mongo: mongoose.connection.host ? { host: mongoose.connection.host, name: mongoose.connection.name } : null,
    time: new Date().toISOString(),
  });
});

export default router;
