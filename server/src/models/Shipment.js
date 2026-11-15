import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

export const CARRIERS = ['self', 'ghn', 'ghtk', 'viettel-post', 'other'];
export const CARRIER_LABELS = { self: 'Nhà vườn tự giao', ghn: 'Giao Hàng Nhanh', ghtk: 'Giao Hàng Tiết Kiệm', 'viettel-post': 'Viettel Post', other: 'Đơn vị khác' };
// Vòng đời vận đơn (chi tiết hơn trạng thái phần đơn):
// picked (đã lấy hàng) -> in_transit (đang trung chuyển) -> out_for_delivery (đang đi giao) -> delivered | failed
export const SHIPMENT_STATUSES = ['picked', 'in_transit', 'out_for_delivery', 'delivered', 'failed'];
export const SHIPMENT_FLOW = {
  picked: ['in_transit', 'out_for_delivery', 'delivered', 'failed'],
  in_transit: ['out_for_delivery', 'delivered', 'failed'],
  out_for_delivery: ['delivered', 'failed'],
  failed: ['out_for_delivery'], // giao lại
  delivered: [],
};

const eventSchema = new mongoose.Schema(
  { status: { type: String, enum: SHIPMENT_STATUSES }, note: { type: String, default: '' }, location: { type: String, default: '' }, at: { type: Date, default: Date.now } },
  { _id: false },
);

/** Vận đơn: mỗi phần đơn (1 nhà bán) có tối đa 1 vận đơn, tạo khi nhà bán bắt đầu giao. */
const shipmentSchema = new mongoose.Schema(
  {
    orderId: { type: ObjectId, ref: 'Order', required: true, index: true },
    orderCode: { type: String, required: true },
    partId: { type: ObjectId, required: true },
    vendorId: { type: ObjectId, ref: 'User', required: true, index: true },
    buyerId: { type: ObjectId, ref: 'User', required: true, index: true },
    carrier: { type: String, enum: CARRIERS, default: 'self' },
    trackingCode: { type: String, required: true, unique: true },
    status: { type: String, enum: SHIPMENT_STATUSES, default: 'picked' },
    estimatedDelivery: { type: Date, default: null },
    events: { type: [eventSchema], default: [] },
  },
  { timestamps: true },
);
shipmentSchema.index({ orderId: 1, partId: 1 }, { unique: true });

export const Shipment = mongoose.model('Shipment', shipmentSchema);
