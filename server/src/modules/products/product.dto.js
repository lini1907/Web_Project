import { productMedia } from './product-media.js';

/**
 * DTO công khai của sản phẩm. Tách dữ liệu nội bộ (reservedStock, searchText, vendorId thô...)
 * khỏi dữ liệu trả cho trình duyệt.
 */
export function isRescueActive(p, now = new Date()) {
  return p.type === 'rescue' && p.rescue && new Date(p.rescue.expiresAt) > now;
}

export function availableStock(p) {
  return Math.max(0, (p.stock || 0) - (p.reservedStock || 0));
}

/** Sản phẩm có thể đặt mua ngay lúc này không. */
export function purchasableReason(p, now = new Date()) {
  if (!p || !p.isActive || p.type === 'mystery-ingredient') return 'INACTIVE';
  if (p.type === 'rescue' && !isRescueActive(p, now)) return 'RESCUE_EXPIRED';
  if (availableStock(p) <= 0) return 'OUT_OF_STOCK';
  return null;
}

function farmRef(farm) {
  if (!farm || typeof farm !== 'object' || !farm.name) return null;
  return { id: String(farm._id), slug: farm.slug, name: farm.name, province: farm.province || '' };
}

export function toPublicProduct(p) {
  const left = availableStock(p);
  return {
    id: String(p._id),
    slug: p.slug,
    name: p.name,
    category: p.category,
    type: p.type,
    price: p.price,
    unit: p.unit,
    inStock: left > 0,
    stockLeft: left,
    farm: farmRef(p.farmId),
    vendorId: String(p.vendorId?._id || p.vendorId),
    certifications: p.certifications || [],
    ...productMedia(p),
    isDemo: !!p.legacyId,
    description: p.description || '',
    packagingNote: p.packagingNote || '',
    storageNote: p.storageNote || '',
    deliveryNote: p.deliveryNote || '',
    rescue: p.type === 'rescue' && p.rescue
      ? {
          originalPrice: p.rescue.originalPrice,
          discountRate: p.rescue.discountRate,
          expiresAt: p.rescue.expiresAt,
          reason: p.rescue.reason || '',
          expired: !isRescueActive(p),
        }
      : null,
    rating: p.rating || 0,
    reviewCount: p.reviewCount || 0,
    soldCount: p.soldCount || 0,
    createdAt: p.createdAt,
  };
}

/** DTO cho vendor: thêm thông tin kho nội bộ. */
export function toVendorProduct(p) {
  return {
    ...toPublicProduct(p),
    stock: p.stock,
    reservedStock: p.reservedStock,
    isActive: p.isActive,
    hasOrders: !!p.hasOrders,
    farmId: String(p.farmId?._id || p.farmId),
    updatedAt: p.updatedAt,
  };
}
