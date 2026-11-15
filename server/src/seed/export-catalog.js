/**
 * Xuất catalog sản phẩm (đang bán công khai) ra ml/data/catalog.json cho dịch vụ gợi ý huấn luyện.
 * Chỉ xuất dữ liệu mô tả sản phẩm — KHÔNG có thông tin người dùng.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Product } from '../models/index.js';
import { env } from '../config/env.js';

export async function exportCatalog(outFile = path.resolve(env.root, '..', 'ml', 'data', 'catalog.json')) {
  const rows = await Product.find({ type: { $in: ['regular', 'rescue'] } })
    .populate('farmId', 'name province')
    .sort({ legacyId: 1, _id: 1 })
    .lean();
  const catalog = rows.map((p) => ({
    id: String(p._id),
    slug: p.slug,
    name: p.name,
    description: p.description,
    category: p.category,
    type: p.type,
    farm: p.farmId?.name || '',
    province: p.farmId?.province || '',
    certifications: p.certifications || [],
    unit: p.unit,
    price: p.price,
    soldCount: p.soldCount || 0,
    isActive: p.isActive,
  }));
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify({ exportedAt: new Date().toISOString(), count: catalog.length, products: catalog }, null, 2));
  return outFile;
}
