import mongoose from 'mongoose';
import { Product, Farm, User, CATEGORIES, Order } from '../../models/index.js';
import { Errors } from '../../utils/AppError.js';
import { escapeRegex, normalizeVi, uniqueSlug } from '../../utils/text.js';
import { rescuePrice } from '../../utils/money.js';
import { paged } from '../../utils/validate.js';
import { toPublicProduct, toVendorProduct } from './product.dto.js';

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
  popular: { soldCount: -1, _id: 1 },
  expiring: { 'rescue.expiresAt': 1, _id: 1 },
};

export function buildSearchText(p, farmName = '') {
  return normalizeVi([p.name, p.description, p.category, farmName, (p.certifications || []).join(' ')].join(' '));
}

/** Danh sách vendor đã duyệt và đang hoạt động (chỉ sản phẩm của họ được hiển thị công khai). */
export async function approvedVendorIds() {
  const rows = await User.find({ role: 'vendor', vendorStatus: 'approved', status: 'active' }, { _id: 1 }).lean();
  return rows.map((r) => r._id);
}

/** Điều kiện "đang bán công khai": active, vendor đã duyệt, Rescue chưa hết hạn. */
export async function publicFilter(now = new Date()) {
  return {
    isActive: true,
    vendorId: { $in: await approvedVendorIds() },
    $or: [{ type: 'regular' }, { type: 'rescue', 'rescue.expiresAt': { $gt: now } }],
  };
}

export async function listPublic({ q, category, farm, type, sort = 'newest', minPrice, maxPrice, inStock }, page) {
  const filter = await publicFilter();
  if (category) filter.category = category;
  if (type) filter.type = type;
  if (q) filter.searchText = { $regex: escapeRegex(normalizeVi(q)) };
  if (farm) {
    const f = await Farm.findOne({ slug: farm }, { _id: 1 }).lean();
    filter.farmId = f ? f._id : new mongoose.Types.ObjectId();
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
  if (inStock) filter.$expr = { $gt: [{ $subtract: ['$stock', '$reservedStock'] }, 0] };

  const [rows, total] = await Promise.all([
    Product.find(filter)
      .sort(SORTS[sort] || SORTS.newest)
      .skip(page.skip)
      .limit(page.limit)
      .populate('farmId', 'name slug province')
      .lean(),
    Product.countDocuments(filter),
  ]);
  return paged(rows.map(toPublicProduct), total, page);
}

export async function getPublic(idOrSlug) {
  const filter = mongoose.isValidObjectId(idOrSlug) && idOrSlug.length === 24 ? { _id: idOrSlug } : { slug: idOrSlug };
  const p = await Product.findOne(filter).populate('farmId', 'name slug province status').lean();
  if (!p || !p.isActive || p.type === 'mystery-ingredient') throw Errors.notFound('Sản phẩm không tồn tại hoặc đã ngừng bán');
  const vendor = await User.findById(p.vendorId, { vendorStatus: 1, status: 1, name: 1 }).lean();
  if (!vendor || vendor.vendorStatus !== 'approved' || vendor.status !== 'active') {
    throw Errors.notFound('Sản phẩm không tồn tại hoặc đã ngừng bán');
  }
  return { ...toPublicProduct(p), vendor: { id: String(vendor._id), name: vendor.name } };
}

export async function categoriesSummary() {
  const filter = await publicFilter();
  const rows = await Product.aggregate([{ $match: filter }, { $group: { _id: '$category', count: { $sum: 1 } } }]);
  return CATEGORIES.map((c) => ({ slug: c, count: rows.find((r) => r._id === c)?.count || 0 }));
}

// ----- Vendor -----

export async function listForVendor(vendorId, { q, status }) {
  const filter = { vendorId };
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;
  if (q) filter.searchText = { $regex: escapeRegex(normalizeVi(q)) };
  const rows = await Product.find(filter).sort({ updatedAt: -1 }).populate('farmId', 'name slug').lean();
  return rows.map(toVendorProduct);
}

async function assertOwnFarm(vendorId, farmId) {
  const farm = await Farm.findOne({ _id: farmId, vendorId }).lean();
  if (!farm) throw Errors.validation([{ field: 'farmId', message: 'Nông trại không thuộc tài khoản của bạn' }]);
  return farm;
}

export async function createForVendor(vendorId, data) {
  const farm = await assertOwnFarm(vendorId, data.farmId);
  const doc = new Product({
    ...data,
    vendorId,
    type: data.type === 'mystery-ingredient' ? 'mystery-ingredient' : 'regular',
    slug: await uniqueSlug(Product, data.name),
  });
  doc.searchText = buildSearchText(doc, farm.name);
  await doc.save();
  await doc.populate('farmId', 'name slug');
  return toVendorProduct(doc.toObject());
}

export async function getOwned(vendorId, id) {
  const p = await Product.findOne({ _id: id, vendorId });
  if (!p) throw Errors.notFound('Sản phẩm không tồn tại');
  return p;
}

export async function updateForVendor(vendorId, id, data) {
  const p = await getOwned(vendorId, id);
  let farmName;
  if (data.farmId && String(data.farmId) !== String(p.farmId)) farmName = (await assertOwnFarm(vendorId, data.farmId)).name;
  if (data.name && data.name !== p.name) p.slug = await uniqueSlug(Product, data.name, p._id);
  // Sản phẩm Rescue: giá luôn do server tính từ rescue.*, không cho sửa trực tiếp.
  if (p.type === 'rescue' && data.price !== undefined) delete data.price;
  if (data.stock !== undefined && data.stock < p.reservedStock) {
    throw Errors.validation([{ field: 'stock', message: `Tồn kho không được nhỏ hơn số đang giữ chỗ mua chung (${p.reservedStock})` }]);
  }
  Object.assign(p, data);
  if (!farmName) farmName = (await Farm.findById(p.farmId, { name: 1 }).lean())?.name;
  p.searchText = buildSearchText(p, farmName);
  await p.save();
  await p.populate('farmId', 'name slug');
  return toVendorProduct(p.toObject());
}

/** Xóa: nếu đã có đơn thì xóa mềm (ngừng bán) để giữ lịch sử; chưa có đơn thì xóa hẳn. */
export async function removeForVendor(vendorId, id) {
  const p = await getOwned(vendorId, id);
  if (p.reservedStock > 0) throw Errors.invalidState('Sản phẩm đang có chiến dịch mua chung giữ chỗ, không thể xóa');
  const used = p.hasOrders || (await Order.exists({ 'parts.items.productId': p._id }));
  if (used) {
    p.isActive = false;
    p.hasOrders = true;
    await p.save();
    return { deleted: false, softDeleted: true };
  }
  await p.deleteOne();
  return { deleted: true, softDeleted: false };
}

export async function setRescue(vendorId, id, { originalPrice, discountRate, expiresAt, reason }) {
  const p = await getOwned(vendorId, id);
  if (expiresAt <= new Date()) throw Errors.validation([{ field: 'expiresAt', message: 'Hạn bán phải ở tương lai' }]);
  p.type = 'rescue';
  p.rescue = { originalPrice, discountRate, expiresAt, reason: reason || '' };
  p.price = rescuePrice(originalPrice, discountRate);
  await p.save();
  await p.populate('farmId', 'name slug');
  return toVendorProduct(p.toObject());
}

export async function clearRescue(vendorId, id) {
  const p = await getOwned(vendorId, id);
  if (p.type !== 'rescue') throw Errors.invalidState('Sản phẩm không phải hàng giải cứu');
  p.price = p.rescue.originalPrice;
  p.type = 'regular';
  p.rescue = null;
  await p.save();
  await p.populate('farmId', 'name slug');
  return toVendorProduct(p.toObject());
}

export async function listRescue(page) {
  const now = new Date();
  const filter = { ...(await publicFilter(now)), type: 'rescue', 'rescue.expiresAt': { $gt: now } };
  delete filter.$or;
  const [rows, total] = await Promise.all([
    Product.find(filter)
      .sort(SORTS.expiring)
      .skip(page.skip)
      .limit(page.limit)
      .populate('farmId', 'name slug province')
      .lean(),
    Product.countDocuments(filter),
  ]);
  return paged(rows.map(toPublicProduct), total, page);
}
