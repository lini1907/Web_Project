import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/** Lịch sử các lần hệ thống gợi ý cho người dùng: sản phẩm nào, điểm bao nhiêu, vì sao. Tự xóa sau 90 ngày. */
const recommendHistorySchema = new mongoose.Schema({
  userId: { type: ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['for-me', 'similar'], required: true },
  contextProductId: { type: ObjectId, ref: 'Product', default: null },
  source: { type: String, enum: ['model', 'fallback'], required: true },
  reason: { type: String, default: '' },
  modelVersion: { type: String, default: null },
  items: {
    type: [{ productId: { type: ObjectId, ref: 'Product' }, score: { type: Number, default: null }, reason: { type: String, default: '' }, _id: false }],
    default: [],
  },
  at: { type: Date, default: Date.now },
});
recommendHistorySchema.index({ userId: 1, at: -1 });
recommendHistorySchema.index({ at: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

export const RecommendHistory = mongoose.model('RecommendHistory', recommendHistorySchema);
