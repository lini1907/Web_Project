import mongoose from 'mongoose';

const componentSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const mysteryBoxSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    price: { type: Number, required: true, min: 1 },
    // Thành phần là dữ liệu NỘI BỘ: chỉ vendor sở hữu thấy, API công khai không trả.
    components: { type: [componentSchema], validate: (arr) => arr.length > 0 },
    publicNote: { type: String, default: '' },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    soldCount: { type: Number, default: 0 },
    legacyId: { type: String, sparse: true },
  },
  { timestamps: true },
);

export const MysteryBox = mongoose.model('MysteryBox', mysteryBoxSchema);
