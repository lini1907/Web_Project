import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

export const PART_STATUSES = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
export const PAYMENT_METHODS = ['cod', 'vnpay', 'momo'];
export const DELIVERY_WINDOWS = { morning: '8:00–12:00', afternoon: '13:00–17:00', evening: '18:00–21:00' };

// Một lần trừ kho thực tế (để hoàn kho chính xác khi hủy). Với Mystery Box là các nguyên liệu.
const stockMoveSchema = new mongoose.Schema(
  {
    productId: { type: ObjectId, ref: 'Product', required: true },
    qty: { type: Number, required: true },
    // reserved: true nếu trừ từ phần giữ chỗ (mua chung)
    fromReserved: { type: Boolean, default: false },
  },
  { _id: false },
);

const orderItemSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['product', 'box', 'group-buy'], required: true },
    productId: { type: ObjectId, ref: 'Product' },
    boxId: { type: ObjectId, ref: 'MysteryBox' },
    // Bản chụp tại thời điểm đặt: đổi giá/tên sau này không ảnh hưởng đơn cũ.
    name: { type: String, required: true },
    unit: { type: String, default: '' },
    image: { type: String, default: '' },
    unitPrice: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true },
    isRescue: { type: Boolean, default: false },
    stockMoves: { type: [stockMoveSchema], default: [], select: true },
  },
  { _id: true },
);

const historySchema = new mongoose.Schema(
  { status: String, at: { type: Date, default: Date.now }, by: { type: String, enum: ['buyer', 'vendor', 'system', 'admin'] } },
  { _id: false },
);

const partSchema = new mongoose.Schema({
  vendorId: { type: ObjectId, ref: 'User', required: true },
  vendorName: { type: String, default: '' },
  items: { type: [orderItemSchema], default: [] },
  subtotal: { type: Number, required: true },
  status: { type: String, enum: PART_STATUSES, default: 'pending' },
  history: { type: [historySchema], default: [] },
  cod: {
    status: { type: String, enum: ['unpaid', 'collected'], default: 'unpaid' },
    collectedAt: Date,
  },
  // Đánh dấu đã hoàn kho để bảo đảm chỉ hoàn đúng một lần.
  stockRestored: { type: Boolean, default: false },
});

const orderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    buyerId: { type: ObjectId, ref: 'User', required: true, index: true },
    idempotencyKey: { type: String },
    source: { type: String, enum: ['checkout', 'group-buy'], default: 'checkout' },
    groupBuyId: { type: ObjectId, ref: 'GroupBuy' },
    parts: { type: [partSchema], default: [] },
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, required: true },
    // Giảm giá từ voucher toàn sàn (sàn chịu, không trừ vào tiền hàng của từng nhà bán).
    discount: { type: Number, default: 0, min: 0 },
    voucher: {
      type: new mongoose.Schema({ code: String, type: { type: String } }, { _id: false }),
      default: null,
    },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cod' },
    // Thanh toán online (VNPay/MoMo). Đơn COD: status luôn 'unpaid' (tiền thu theo từng phần đơn ở parts[].cod).
    payment: {
      status: { type: String, enum: ['unpaid', 'pending', 'paid', 'failed', 'refund_pending'], default: 'unpaid' },
      txnRef: { type: String, default: null }, // mã giao dịch phía FarmTable gửi sang cổng
      transactionId: { type: String, default: null }, // mã giao dịch phía cổng thanh toán
      paidAt: { type: Date, default: null },
      message: { type: String, default: '' },
    },
    // Khung giờ nhận hàng người mua mong muốn.
    deliverySlot: {
      type: new mongoose.Schema({ date: String, window: { type: String, enum: ['morning', 'afternoon', 'evening'] } }, { _id: false }),
      default: null,
    },
    shippingAddress: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },
    note: { type: String, default: '' },
  },
  { timestamps: true },
);

// Chống tạo đơn trùng khi bấm 2 lần / mạng chập chờn.
orderSchema.index(
  { buyerId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);
orderSchema.index({ 'parts.vendorId': 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.txnRef': 1 }, { sparse: true });

/** Trạng thái cả đơn được suy ra từ các phần đơn, không lưu riêng. */
export function deriveOrderStatus(parts) {
  const statuses = parts.map((p) => p.status);
  if (statuses.length === 0) return 'pending';
  if (statuses.every((s) => s === 'cancelled')) return 'cancelled';
  const active = statuses.filter((s) => s !== 'cancelled');
  if (active.every((s) => s === 'delivered')) return 'delivered';
  if (active.some((s) => s === 'shipping' || s === 'delivered')) return 'shipping';
  if (active.every((s) => s === 'confirmed')) return 'confirmed';
  if (active.some((s) => s === 'confirmed')) return 'processing';
  return 'pending';
}

export const Order = mongoose.model('Order', orderSchema);
