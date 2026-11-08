import mongoose from 'mongoose';

export const CATEGORIES = ['rau-cu', 'trai-cay', 'thit-thuy-san', 'trung-sua'];
export const CATEGORY_LABELS = {
  'rau-cu': 'Rau củ',
  'trai-cay': 'Trái cây',
  'thit-thuy-san': 'Thịt & thủy sản',
  'trung-sua': 'Trứng & sữa',
};

const rescueSchema = new mongoose.Schema(
  {
    originalPrice: { type: Number, required: true, min: 1 },
    discountRate: { type: Number, required: true, min: 30, max: 50 },
    expiresAt: { type: Date, required: true },
    reason: { type: String, default: '' },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    // regular: hàng thường; rescue: hàng giải cứu (giá do server tính từ rescue.*);
    // mystery-ingredient: nguyên liệu nội bộ chỉ bán qua Mystery Box (không hiện ở shop).
    type: { type: String, enum: ['regular', 'rescue', 'mystery-ingredient'], default: 'regular', index: true },
    price: { type: Number, required: true, min: 1 },
    unit: { type: String, required: true, default: 'kg' },
    stock: { type: Number, required: true, min: 0, default: 0 },
    // Số lượng đang giữ chỗ cho chiến dịch mua chung (chưa bán).
    reservedStock: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    rescue: { type: rescueSchema, default: null },
    certifications: { type: [String], default: [] },
    mainImage: { type: String, default: '' },
    galleryImages: { type: [String], default: [] },
    description: { type: String, default: '' },
    // Số liệu hiển thị kế thừa từ bản HTML cũ — là dữ liệu demo, không dùng làm KPI.
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 },
    hasOrders: { type: Boolean, default: false },
    // Chuỗi không dấu để tìm kiếm "ca chua" khớp "Cà chua".
    searchText: { type: String, default: '' },
    legacyId: { type: String, index: true, sparse: true },
  },
  { timestamps: true },
);

productSchema.index({ isActive: 1, category: 1, createdAt: -1 });
productSchema.index({ type: 1, 'rescue.expiresAt': 1 });

export const Product = mongoose.model('Product', productSchema);
