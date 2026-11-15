import { Router } from 'express';
import { Article, Product, AuditLog } from '../../models/index.js';
import { requireRole } from '../../middleware/auth.js';
import { parse, v, pageParams, paged, qstr, assertId } from '../../utils/validate.js';
import { Errors } from '../../utils/AppError.js';
import { escapeRegex, normalizeVi, uniqueSlug } from '../../utils/text.js';
import { toPublicProduct } from '../products/product.dto.js';

/** Công thức nấu ăn + Blog: trang công khai (Read) và quản trị CRUD cho admin. */
const router = Router();

const ingredientRule = v.object({
  name: v.string({ min: 1, max: 80 }),
  amount: v.string({ min: 0, max: 40 }).optional(),
  productId: v.id().nullable(),
});

function articleShape(partial = false) {
  const shape = {
    kind: v.enum(['recipe', 'blog']),
    title: v.string({ min: 5, max: 160 }),
    summary: v.string({ min: 0, max: 400 }).optional(),
    coverImage: v.url({ allowEmpty: true }).optional(),
    content: v.string({ min: 0, max: 20000 }).optional(),
    tags: v.array(v.string({ min: 1, max: 30 }), { max: 10 }).optional(),
    status: v.enum(['draft', 'published']).optional(),
    recipe: v
      .object({
        servings: v.int({ min: 1, max: 50 }),
        cookMinutes: v.int({ min: 1, max: 1440 }),
        difficulty: v.enum(['easy', 'medium', 'hard']),
        ingredients: v.array(ingredientRule, { min: 1, max: 40 }),
        steps: v.array(v.string({ min: 3, max: 1000 }), { min: 1, max: 40 }),
      })
      .nullable(),
  };
  if (partial) for (const k of ['kind', 'title']) shape[k] = shape[k].optional();
  return shape;
}

const searchTextOf = (a) => normalizeVi([a.title, a.summary, (a.tags || []).join(' '), (a.recipe?.ingredients || []).map((i) => i.name).join(' ')].join(' '));

function toListDto(a) {
  return {
    id: String(a._id),
    kind: a.kind,
    title: a.title,
    slug: a.slug,
    summary: a.summary,
    coverImage: a.coverImage,
    tags: a.tags,
    status: a.status,
    authorName: a.authorName,
    publishedAt: a.publishedAt,
    views: a.views,
    recipe: a.recipe ? { servings: a.recipe.servings, cookMinutes: a.recipe.cookMinutes, difficulty: a.recipe.difficulty } : null,
    updatedAt: a.updatedAt,
  };
}

async function toDetailDto(a) {
  const ids = (a.recipe?.ingredients || []).map((i) => i.productId).filter(Boolean);
  const products = ids.length ? await Product.find({ _id: { $in: ids }, isActive: true }).populate('farmId', 'name slug province').lean() : [];
  const byId = new Map(products.map((p) => [String(p._id), toPublicProduct(p)]));
  return {
    ...toListDto(a),
    content: a.content,
    recipe: a.recipe
      ? {
          ...toListDto(a).recipe,
          steps: a.recipe.steps,
          ingredients: a.recipe.ingredients.map((i) => ({ name: i.name, amount: i.amount, product: i.productId ? byId.get(String(i.productId)) || null : null })),
        }
      : null,
  };
}

async function validateRecipe(body) {
  if (body.kind === 'recipe' && !body.recipe) throw Errors.validation([{ field: 'recipe', message: 'Công thức cần nguyên liệu và các bước' }]);
  const ids = (body.recipe?.ingredients || []).map((i) => i.productId).filter(Boolean);
  if (ids.length && (await Product.countDocuments({ _id: { $in: ids } })) !== new Set(ids).size) {
    throw Errors.validation([{ field: 'recipe.ingredients', message: 'Có sản phẩm gắn với nguyên liệu không tồn tại' }]);
  }
}

async function audit(req, action, a) {
  await AuditLog.create({ actorId: req.user._id, actorEmail: req.user.email, action, targetType: 'article', targetId: String(a._id), targetLabel: a.title });
}

// ---------- Công khai ----------
router.get('/articles', async (req, res) => {
  const filter = { status: 'published' };
  const kind = qstr(req.query.kind);
  if (['recipe', 'blog'].includes(kind)) filter.kind = kind;
  const q = qstr(req.query.q);
  if (q) filter.searchText = { $regex: escapeRegex(normalizeVi(q)) };
  const tag = qstr(req.query.tag, 30);
  if (tag) filter.tags = tag;
  const page = pageParams(req.query, { defLimit: 9 });
  const [rows, total] = await Promise.all([Article.find(filter).sort({ publishedAt: -1 }).skip(page.skip).limit(page.limit).lean(), Article.countDocuments(filter)]);
  res.json(paged(rows.map(toListDto), total, page));
});

router.get('/articles/:slug', async (req, res) => {
  const a = await Article.findOneAndUpdate({ slug: String(req.params.slug), status: 'published' }, { $inc: { views: 1 } }, { returnDocument: 'after' }).lean();
  if (!a) throw Errors.notFound('Không tìm thấy bài viết');
  res.json(await toDetailDto(a));
});

// ---------- Admin CRUD ----------
router.get('/admin/articles', requireRole('admin'), async (req, res) => {
  const filter = {};
  const kind = qstr(req.query.kind);
  if (['recipe', 'blog'].includes(kind)) filter.kind = kind;
  const status = qstr(req.query.status);
  if (['draft', 'published'].includes(status)) filter.status = status;
  const q = qstr(req.query.q);
  if (q) filter.searchText = { $regex: escapeRegex(normalizeVi(q)) };
  const page = pageParams(req.query, { defLimit: 20 });
  const [rows, total] = await Promise.all([Article.find(filter).sort({ updatedAt: -1 }).skip(page.skip).limit(page.limit).lean(), Article.countDocuments(filter)]);
  res.json(paged(rows.map(toListDto), total, page));
});

router.get('/admin/articles/:id', requireRole('admin'), async (req, res) => {
  const a = await Article.findById(assertId(req.params.id)).lean();
  if (!a) throw Errors.notFound('Không tìm thấy bài viết');
  res.json({ ...toListDto(a), content: a.content, recipe: a.recipe ? { ...a.recipe, ingredients: a.recipe.ingredients.map((i) => ({ ...i, productId: i.productId ? String(i.productId) : null })) } : null });
});

router.post('/admin/articles', requireRole('admin'), async (req, res) => {
  const body = parse(articleShape(), req.body);
  await validateRecipe(body);
  if (body.kind === 'blog') body.recipe = null;
  const a = new Article({ ...body, authorId: req.user._id, authorName: req.user.name, slug: await uniqueSlug(Article, body.title) });
  if (a.status === 'published') a.publishedAt = new Date();
  a.searchText = searchTextOf(a);
  await a.save();
  await audit(req, 'article.create', a);
  res.status(201).json(await toDetailDto(a.toObject()));
});

router.patch('/admin/articles/:id', requireRole('admin'), async (req, res) => {
  const body = parse(articleShape(true), req.body);
  const a = await Article.findById(assertId(req.params.id));
  if (!a) throw Errors.notFound('Không tìm thấy bài viết');
  await validateRecipe({ kind: body.kind || a.kind, recipe: body.recipe === undefined ? a.recipe : body.recipe });
  if (body.title && body.title !== a.title) a.slug = await uniqueSlug(Article, body.title, a._id);
  Object.assign(a, body);
  if (a.kind === 'blog') a.recipe = null;
  if (a.status === 'published' && !a.publishedAt) a.publishedAt = new Date();
  a.searchText = searchTextOf(a);
  await a.save();
  await audit(req, 'article.update', a);
  res.json(await toDetailDto(a.toObject()));
});

router.delete('/admin/articles/:id', requireRole('admin'), async (req, res) => {
  const a = await Article.findById(assertId(req.params.id));
  if (!a) throw Errors.notFound('Không tìm thấy bài viết');
  await a.deleteOne();
  await audit(req, 'article.delete', a);
  res.status(204).end();
});

export default router;
