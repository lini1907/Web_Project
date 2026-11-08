import { Router } from 'express';
import { Farm, Product, User } from '../../models/index.js';
import { requireRole } from '../../middleware/auth.js';
import { parse, v, qstr, assertId } from '../../utils/validate.js';
import { Errors } from '../../utils/AppError.js';
import { uniqueSlug, normalizeVi } from '../../utils/text.js';
import { toPublicProduct } from '../products/product.dto.js';
import { approvedVendorIds, publicFilter, buildSearchText } from '../products/product.service.js';

const router = Router();

function toPublicFarm(f, extra = {}) {
  return {
    id: String(f._id),
    slug: f.slug,
    name: f.name,
    province: f.province,
    address: f.address,
    story: f.story,
    certifications: f.certifications || [],
    images: f.images || [],
    vendorId: String(f.vendorId),
    ...extra,
  };
}

const farmShape = (partial) => {
  const shape = {
    name: v.string({ min: 3, max: 120 }),
    province: v.string({ min: 2, max: 60 }),
    address: v.string({ min: 0, max: 200 }).optional(),
    story: v.string({ min: 0, max: 3000 }).optional(),
    certifications: v.array(v.string({ max: 40 }), { max: 10 }).optional(),
    images: v.array(v.url(), { max: 8 }).optional(),
    status: v.enum(['active', 'hidden']).optional(),
  };
  return partial ? Object.fromEntries(Object.entries(shape).map(([k, r]) => [k, r.optional()])) : shape;
};

// ---------- Công khai: chỉ nông trại của vendor đã duyệt ----------
router.get('/farms', async (req, res) => {
  const filter = { status: 'active', vendorId: { $in: await approvedVendorIds() } };
  const province = qstr(req.query.province);
  if (province) filter.province = province;
  const farms = await Farm.find(filter).sort({ name: 1 }).lean();
  const pf = await publicFilter();
  const counts = await Product.aggregate([
    { $match: { ...pf, farmId: { $in: farms.map((f) => f._id) } } },
    { $group: { _id: '$farmId', count: { $sum: 1 } } },
  ]);
  const q = qstr(req.query.q);
  const list = farms
    .filter((f) => !q || normalizeVi(`${f.name} ${f.province}`).includes(normalizeVi(q)))
    .map((f) => toPublicFarm(f, { productCount: counts.find((c) => String(c._id) === String(f._id))?.count || 0 }));
  res.json(list);
});

router.get('/farms/:slug', async (req, res) => {
  const slug = qstr(req.params.slug, 120);
  const farm = slug && (await Farm.findOne({ slug, status: 'active' }).lean());
  if (!farm) throw Errors.notFound('Nông trại không tồn tại');
  const vendor = await User.findById(farm.vendorId, { name: 1, vendorStatus: 1, status: 1, phone: 1, createdAt: 1 }).lean();
  if (!vendor || vendor.vendorStatus !== 'approved' || vendor.status !== 'active') throw Errors.notFound('Nông trại không tồn tại');
  const products = await Product.find({ ...(await publicFilter()), farmId: farm._id })
    .sort({ createdAt: -1 })
    .limit(Number(qstr(req.query.limit)) || 8)
    .populate('farmId', 'name slug province')
    .lean();
  res.json(
    toPublicFarm(farm, {
      vendor: { id: String(vendor._id), name: vendor.name, since: vendor.createdAt },
      products: products.map(toPublicProduct),
    }),
  );
});

// ---------- Vendor: quản lý nông trại của mình ----------
router.get('/vendor/farms', requireRole('vendor'), async (req, res) => {
  const farms = await Farm.find({ vendorId: req.user._id }).sort({ createdAt: 1 }).lean();
  res.json(farms.map((f) => toPublicFarm(f, { status: f.status })));
});

router.post('/vendor/farms', requireRole('vendor'), async (req, res) => {
  const body = parse(farmShape(false), req.body);
  const farm = await Farm.create({ ...body, vendorId: req.user._id, slug: await uniqueSlug(Farm, body.name) });
  res.status(201).json(toPublicFarm(farm, { status: farm.status }));
});

router.patch('/vendor/farms/:id', requireRole('vendor'), async (req, res) => {
  const body = parse(farmShape(true), req.body);
  const farm = await Farm.findOne({ _id: assertId(req.params.id), vendorId: req.user._id });
  if (!farm) throw Errors.notFound('Nông trại không tồn tại');
  const renamed = body.name && body.name !== farm.name;
  if (renamed) farm.slug = await uniqueSlug(Farm, body.name, farm._id);
  Object.assign(farm, body);
  await farm.save();
  if (renamed) {
    // Cập nhật chuỗi tìm kiếm của sản phẩm thuộc nông trại.
    const products = await Product.find({ farmId: farm._id });
    await Promise.all(
      products.map((p) => Product.updateOne({ _id: p._id }, { $set: { searchText: buildSearchText(p, farm.name) } })),
    );
  }
  res.json(toPublicFarm(farm, { status: farm.status }));
});

export default router;
