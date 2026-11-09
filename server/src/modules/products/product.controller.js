import * as service from './product.service.js';
import { CATEGORIES } from '../../models/index.js';
import { parse, v, pageParams, qstr, assertId } from '../../utils/validate.js';
import { Errors } from '../../utils/AppError.js';
import { toVendorProduct } from './product.dto.js';

const productShape = (partial = false) => {
  const shape = {
    farmId: v.id(),
    name: v.string({ min: 3, max: 120 }),
    category: v.enum(CATEGORIES),
    price: v.int({ min: 1000, max: 50_000_000 }),
    unit: v.string({ min: 1, max: 30 }),
    stock: v.int({ min: 0, max: 1_000_000 }),
    description: v.string({ min: 0, max: 3000 }).optional(),
    packagingNote: v.string({ min: 0, max: 500 }).optional(),
    storageNote: v.string({ min: 0, max: 500 }).optional(),
    deliveryNote: v.string({ min: 0, max: 500 }).optional(),
    certifications: v.array(v.string({ max: 40 }), { max: 10 }).optional(),
    mainImage: v.url().optional(),
    galleryImages: v.array(v.url(), { max: 8 }).optional(),
    isActive: v.bool().optional(),
    type: v.enum(['regular', 'mystery-ingredient']).optional(),
  };
  if (!partial) return shape;
  return Object.fromEntries(Object.entries(shape).map(([k, rule]) => [k, rule.optional ? rule.optional() : rule]));
};

function listQuery(query) {
  const num = (x) => {
    const n = Number.parseInt(qstr(x) ?? '', 10);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const category = qstr(query.category);
  const type = qstr(query.type);
  return {
    q: qstr(query.q),
    category: CATEGORIES.includes(category) ? category : undefined,
    farm: qstr(query.farm),
    type: ['regular', 'rescue'].includes(type) ? type : undefined,
    sort: qstr(query.sort),
    minPrice: num(query.minPrice),
    maxPrice: num(query.maxPrice),
    inStock: query.inStock === 'true' || query.inStock === '1',
  };
}

export async function list(req, res) {
  res.json(await service.listPublic(listQuery(req.query), pageParams(req.query)));
}

export async function detail(req, res) {
  const key = qstr(req.params.idOrSlug, 120);
  if (!key) throw Errors.notFound();
  res.json(await service.getPublic(key));
}

export async function categories(req, res) {
  res.json(await service.categoriesSummary());
}

export async function rescueList(req, res) {
  res.json(await service.listRescue(pageParams(req.query, { defLimit: 24 })));
}

// ----- Vendor -----
export async function vendorList(req, res) {
  res.json(await service.listForVendor(req.user._id, { q: qstr(req.query.q), status: qstr(req.query.status) }));
}

export async function vendorGet(req, res) {
  const p = await service.getOwned(req.user._id, assertId(req.params.id));
  await p.populate('farmId', 'name slug');
  res.json(toVendorProduct(p.toObject()));
}

export async function vendorCreate(req, res) {
  const body = parse(productShape(false), req.body);
  res.status(201).json(await service.createForVendor(req.user._id, body));
}

export async function vendorUpdate(req, res) {
  const body = parse(productShape(true), req.body);
  res.json(await service.updateForVendor(req.user._id, assertId(req.params.id), body));
}

export async function vendorRemove(req, res) {
  res.json(await service.removeForVendor(req.user._id, assertId(req.params.id)));
}

export async function vendorSetRescue(req, res) {
  const body = parse(
    {
      originalPrice: v.int({ min: 1000, max: 50_000_000 }),
      discountRate: v.int({ min: 30, max: 50 }),
      expiresAt: v.date(),
      reason: v.string({ min: 0, max: 200 }).optional(),
    },
    req.body,
  );
  res.json(await service.setRescue(req.user._id, assertId(req.params.id), body));
}

export async function vendorClearRescue(req, res) {
  res.json(await service.clearRescue(req.user._id, assertId(req.params.id)));
}
