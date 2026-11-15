import { Product, RecommendHistory, CATEGORY_LABELS } from '../../models/index.js';
import { env } from '../../config/env.js';
import { publicFilter } from '../products/product.service.js';
import { toPublicProduct } from '../products/product.dto.js';

/**
 * Gọi dịch vụ ML (Python). Quá ML_TIMEOUT_MS hoặc lỗi => trả null để dùng phương pháp cơ sở.
 */
async function callMl(path, { method = 'GET', body } = {}) {
  try {
    const res = await fetch(`${env.mlUrl}${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(env.mlTimeoutMs),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function mlHealth() {
  const r = await callMl('/health');
  return r && r.status === 'ok' ? { status: 'ok', modelVersion: r.modelVersion, items: r.items } : { status: 'down' };
}

/** Sản phẩm đủ điều kiện gợi ý: đang bán công khai và còn hàng. */
async function eligibleProducts(ids) {
  const filter = { ...(await publicFilter()), $expr: { $gt: [{ $subtract: ['$stock', '$reservedStock'] }, 0] } };
  if (ids) filter._id = { $in: ids };
  return Product.find(filter).populate('farmId', 'name slug province').lean();
}

/**
 * Phương pháp cơ sở (baseline): cùng danh mục, bán chạy nhất; thiếu thì bổ sung sản phẩm bán chạy toàn sàn.
 * Đây là luật đơn giản, KHÔNG phải kết quả máy học — response luôn ghi source: "fallback".
 */
export async function baseline({ category, excludeIds = [], limit = 5 }) {
  const all = await eligibleProducts();
  const exclude = new Set(excludeIds.map(String));
  const pool = all.filter((p) => !exclude.has(String(p._id)));
  const byPopularity = (a, b) => (b.soldCount || 0) - (a.soldCount || 0) || String(a._id).localeCompare(String(b._id));
  const same = pool.filter((p) => !category || p.category === category).sort(byPopularity);
  const rest = pool.filter((p) => category && p.category !== category).sort(byPopularity);
  // Lý do hiển thị cho người dùng: vì sao sản phẩm này được gợi ý.
  const why = (p) => (category && p.category === category ? `Bán chạy trong nhóm ${CATEGORY_LABELS[p.category] || p.category}` : 'Bán chạy trên FarmTable');
  return [...same, ...rest].slice(0, limit).map((p) => ({ product: toPublicProduct(p), score: null, reason: why(p) }));
}

async function fromModelResult(result, { excludeIds, limit, reason = 'Nội dung tương đồng' }) {
  if (!result || !Array.isArray(result.items)) return null;
  const exclude = new Set(excludeIds.map(String));
  const ids = result.items.map((x) => x.id).filter((id) => !exclude.has(String(id)));
  const products = await eligibleProducts(ids);
  const map = new Map(products.map((p) => [String(p._id), p]));
  const items = [];
  for (const r of result.items) {
    const p = map.get(String(r.id));
    if (p && !exclude.has(String(r.id))) items.push({ product: toPublicProduct(p), score: Math.round(r.score * 1000) / 1000, reason });
    if (items.length >= limit) break;
  }
  return items;
}

export async function similar(productId, limit = 5) {
  const started = Date.now();
  const target = await Product.findById(productId, { category: 1 }).lean();
  const excludeIds = [productId];
  // Lấy dư để còn đủ sau khi lọc hàng hết/ngừng bán.
  const result = await callMl(`/similar/${encodeURIComponent(productId)}?k=${limit * 3}`);
  const items = await fromModelResult(result, { excludeIds, limit });
  if (items && items.length >= Math.min(limit, 1)) {
    if (items.length < limit) {
      const extra = await baseline({ category: target?.category, excludeIds: [...excludeIds, ...items.map((i) => i.product.id)], limit: limit - items.length });
      items.push(...extra);
    }
    return { source: 'model', modelVersion: result.modelVersion || null, latencyMs: Date.now() - started, items };
  }
  return {
    source: 'fallback',
    modelVersion: null,
    latencyMs: Date.now() - started,
    items: await baseline({ category: target?.category, excludeIds, limit }),
  };
}

export async function forUser(interactedIds, limit = 8) {
  const started = Date.now();
  if (interactedIds.length === 0) {
    // Người dùng mới (cold start): dùng phương pháp cơ sở.
    return { source: 'fallback', reason: 'cold-start', modelVersion: null, latencyMs: Date.now() - started, items: await baseline({ limit }) };
  }
  const result = await callMl('/for-user', { method: 'POST', body: { productIds: interactedIds, k: limit * 3 } });
  const lastViewed = await Product.findById(interactedIds[0], { name: 1 }).lean();
  const items = await fromModelResult(result, { excludeIds: interactedIds, limit, reason: lastViewed ? `Giống sản phẩm bạn đã quan tâm: ${lastViewed.name}` : 'Theo lịch sử xem của bạn' });
  if (items && items.length > 0) {
    return { source: 'model', modelVersion: result.modelVersion || null, latencyMs: Date.now() - started, items };
  }
  const last = await Product.findById(interactedIds[0], { category: 1 }).lean();
  return {
    source: 'fallback',
    reason: 'model-unavailable',
    modelVersion: null,
    latencyMs: Date.now() - started,
    items: await baseline({ category: last?.category, excludeIds: interactedIds, limit }),
  };
}

/**
 * Lưu lại lần gợi ý cho người dùng (sản phẩm, điểm, lý do). Bỏ qua nếu 10 phút trước vừa lưu đúng danh sách đó
 * (người dùng tải lại trang chủ nhiều lần không sinh bản ghi trùng).
 */
export async function saveHistory(userId, kind, rec, contextProductId = null) {
  if (!userId || !rec?.items?.length) return;
  const productIds = rec.items.map((i) => String(i.product.id));
  const last = await RecommendHistory.findOne({ userId, kind, contextProductId }).sort({ at: -1 }).lean();
  if (last && Date.now() - last.at.getTime() < 10 * 60e3 && last.items.map((i) => String(i.productId)).join() === productIds.join()) return;
  await RecommendHistory.create({
    userId,
    kind,
    contextProductId,
    source: rec.source,
    reason: rec.reason || '',
    modelVersion: rec.modelVersion || null,
    items: rec.items.map((i) => ({ productId: i.product.id, score: i.score, reason: i.reason || '' })),
  });
}

export async function history(userId, limit = 20) {
  const rows = await RecommendHistory.find({ userId }).sort({ at: -1 }).limit(limit).lean();
  const ids = [...new Set(rows.flatMap((r) => [...r.items.map((i) => String(i.productId)), r.contextProductId && String(r.contextProductId)]).filter(Boolean))];
  const products = await Product.find({ _id: { $in: ids } }, { name: 1, slug: 1, mainImage: 1, price: 1 }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const brief = (id) => {
    const p = byId.get(String(id));
    return p ? { id: String(p._id), name: p.name, slug: p.slug, image: p.mainImage, price: p.price } : null;
  };
  return rows.map((r) => ({
    id: String(r._id),
    kind: r.kind,
    source: r.source,
    reason: r.reason,
    modelVersion: r.modelVersion,
    context: r.contextProductId ? brief(r.contextProductId) : null,
    items: r.items.map((i) => ({ product: brief(i.productId), score: i.score, reason: i.reason })).filter((i) => i.product),
    at: r.at,
  }));
}
