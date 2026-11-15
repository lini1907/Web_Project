import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/** Đánh giá sản phẩm. Chỉ người đã nhận hàng (phần đơn delivered) mới được viết; mỗi người 1 đánh giá / sản phẩm. */
const reviewSchema = new mongoose.Schema(
  {
    productId: { type: ObjectId, ref: 'Product', required: true, index: true },
    userId: { type: ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, default: '' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 1000 },
    // Admin có thể ẩn đánh giá vi phạm; đánh giá ẩn không tính vào điểm trung bình.
    status: { type: String, enum: ['visible', 'hidden'], default: 'visible', index: true },
  },
  { timestamps: true },
);

reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });

export const Review = mongoose.model('Review', reviewSchema);
