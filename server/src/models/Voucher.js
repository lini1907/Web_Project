import mongoose from 'mongoose';

/**
 * Mã giảm giá toàn sàn (do admin quản lý).
 *  - percent: giảm value% tiền hàng, tối đa maxDiscount (0 = không giới hạn)
 *  - fixed:   giảm thẳng value đồng
 *  - freeship: miễn phí giao hàng (value bỏ qua)
 * Tiền giảm không bao giờ vượt quá tiền hàng + phí ship của đơn.
 */
export const VOUCHER_TYPES = ['percent', 'fixed', 'freeship'];

const voucherSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: VOUCHER_TYPES, required: true },
    value: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: 0, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    // 0 = không giới hạn tổng lượt dùng
    maxUses: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    // Mỗi tài khoản chỉ dùng 1 lần (lưu danh sách người đã dùng để kiểm tra nguyên tử).
    usedBy: { type: [mongoose.Schema.Types.ObjectId], default: [], select: false },
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Voucher = mongoose.model('Voucher', voucherSchema);
