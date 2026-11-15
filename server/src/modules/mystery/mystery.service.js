import { MysteryBox, Product, User } from '../../models/index.js';
import { Errors } from '../../utils/AppError.js';
import { uniqueSlug } from '../../utils/text.js';
import { availableStock } from '../products/product.dto.js';
import { boxImage } from '../products/product-media.js';

/** Số hộp còn bán được = min(tồn khả dụng của từng nguyên liệu / định lượng). */
export function boxesAvailable(box, productsById) {
  let min = Infinity;
  for (const c of box.components) {
    const p = productsById.get(String(c.productId));
    if (!p || !p.isActive) return 0;
    if (p.type === 'rescue' && !(p.rescue && new Date(p.rescue.expiresAt) > new Date())) return 0;
    min = Math.min(min, Math.floor(availableStock(p) / c.qty));
  }
  return Number.isFinite(min) ? Math.max(0, min) : 0;
}

export async function loadComponents(boxes) {
  const ids = [...new Set(boxes.flatMap((b) => b.components.map((c) => String(c.productId))))];
  const products = await Product.find({ _id: { $in: ids } }).lean();
  return new Map(products.map((p) => [String(p._id), p]));
}

/** DTO công khai: KHÔNG có danh sách thành phần, chỉ có nhóm hàng và ghi chú vendor tự viết. */
export function toPublicBox(box, productsById, vendor) {
  const categories = [
    ...new Set(box.components.map((c) => productsById.get(String(c.productId))?.category).filter(Boolean)),
  ];
  const value = box.components.reduce((s, c) => s + (productsById.get(String(c.productId))?.price || 0) * c.qty, 0);
  return {
    id: String(box._id),
    slug: box.slug,
    name: box.name,
    price: box.price,
    available: boxesAvailable(box, productsById),
    categories,
    itemCount: box.components.length,
    // Giá trị ước tính dạng khoảng, không cho phép suy ngược thành phần.
    estimatedValue: value > 0 ? { min: Math.floor((value * 0.9) / 10000) * 10000, max: Math.ceil((value * 1.1) / 10000) * 10000 } : null,
    publicNote: box.publicNote,
    image: boxImage(box.image),
    isDemo: box.components.some(c => !!productsById.get(String(c.productId))?.legacyId),
    vendor: vendor ? { id: String(vendor._id), name: vendor.name } : { id: String(box.vendorId) },
    soldCount: box.soldCount || 0,
  };
}

export function toVendorBox(box, productsById) {
  return {
    ...toPublicBox(box, productsById),
    isActive: box.isActive,
    components: box.components.map((c) => {
      const p = productsById.get(String(c.productId));
      return {
        productId: String(c.productId),
        qty: c.qty,
        name: p?.name || '(đã xóa)',
        unit: p?.unit || '',
        stockLeft: p ? availableStock(p) : 0,
        price: p?.price || 0,
      };
    }),
  };
}

export async function listPublic() {
  const vendors = await User.find({ role: 'vendor', vendorStatus: 'approved', status: 'active' }, { name: 1 }).lean();
  const vmap = new Map(vendors.map((x) => [String(x._id), x]));
  const boxes = (await MysteryBox.find({ isActive: true }).sort({ createdAt: 1 }).lean()).filter((b) =>
    vmap.has(String(b.vendorId)),
  );
  const pmap = await loadComponents(boxes);
  return boxes.map((b) => toPublicBox(b, pmap, vmap.get(String(b.vendorId))));
}

export async function getPublic(idOrSlug) {
  const filter = /^[a-f0-9]{24}$/i.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const box = await MysteryBox.findOne({ ...filter, isActive: true }).lean();
  if (!box) throw Errors.notFound('Hộp bí ẩn không tồn tại');
  const vendor = await User.findOne({ _id: box.vendorId, vendorStatus: 'approved', status: 'active' }, { name: 1 }).lean();
  if (!vendor) throw Errors.notFound('Hộp bí ẩn không tồn tại');
  const pmap = await loadComponents([box]);
  return toPublicBox(box, pmap, vendor);
}

async function assertOwnComponents(vendorId, components) {
  const ids = components.map((c) => c.productId);
  if (new Set(ids).size !== ids.length) {
    throw Errors.validation([{ field: 'components', message: 'Mỗi sản phẩm chỉ xuất hiện một lần trong hộp' }]);
  }
  const count = await Product.countDocuments({ _id: { $in: ids }, vendorId });
  if (count !== ids.length) {
    throw Errors.validation([{ field: 'components', message: 'Thành phần phải là sản phẩm của chính bạn' }]);
  }
}

export async function listForVendor(vendorId) {
  const boxes = await MysteryBox.find({ vendorId }).sort({ createdAt: -1 }).lean();
  const pmap = await loadComponents(boxes);
  return boxes.map((b) => toVendorBox(b, pmap));
}

export async function create(vendorId, data) {
  await assertOwnComponents(vendorId, data.components);
  const box = await MysteryBox.create({ ...data, vendorId, slug: await uniqueSlug(MysteryBox, data.name) });
  const pmap = await loadComponents([box]);
  return toVendorBox(box.toObject(), pmap);
}

export async function update(vendorId, id, data) {
  const box = await MysteryBox.findOne({ _id: id, vendorId });
  if (!box) throw Errors.notFound('Hộp bí ẩn không tồn tại');
  if (data.components) await assertOwnComponents(vendorId, data.components);
  if (data.name && data.name !== box.name) box.slug = await uniqueSlug(MysteryBox, data.name, box._id);
  Object.assign(box, data);
  await box.save();
  const pmap = await loadComponents([box]);
  return toVendorBox(box.toObject(), pmap);
}
