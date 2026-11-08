import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const groupBuySchema = new mongoose.Schema(
  {
    vendorId: { type: ObjectId, ref: 'User', required: true, index: true },
    productId: { type: ObjectId, ref: 'Product', required: true },
    title: { type: String, default: '' },
    groupPrice: { type: Number, required: true, min: 1 },
    regularPrice: { type: Number, required: true },
    targetQty: { type: Number, required: true, min: 1 },
    maxQty: { type: Number, required: true, min: 1 },
    joinedQty: { type: Number, default: 0, min: 0 },
    memberCount: { type: Number, default: 0, min: 0 },
    deadline: { type: Date, required: true },
    status: { type: String, enum: ['open', 'closing', 'succeeded', 'failed', 'cancelled'], default: 'open' },
    closingAt: Date,
    closedAt: Date,
    closeReason: { type: String, default: '' },
    seedKey: { type: String, index: true, sparse: true },
  },
  { timestamps: true },
);

groupBuySchema.index({ status: 1, deadline: 1 });

const membershipSchema = new mongoose.Schema(
  {
    campaignId: { type: ObjectId, ref: 'GroupBuy', required: true },
    userId: { type: ObjectId, ref: 'User', required: true, index: true },
    qty: { type: Number, required: true, min: 1 },
    shippingAddress: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },
    status: { type: String, enum: ['committed', 'ordered', 'released', 'withdrawn'], default: 'committed' },
    orderId: { type: ObjectId, ref: 'Order', default: null },
    idempotencyKey: { type: String },
  },
  { timestamps: true },
);

// Mỗi người chỉ có một bản ghi tham gia cho mỗi chiến dịch.
membershipSchema.index({ campaignId: 1, userId: 1 }, { unique: true });

export const GroupBuy = mongoose.model('GroupBuy', groupBuySchema);
export const GroupBuyMembership = mongoose.model('GroupBuyMembership', membershipSchema, 'groupbuymemberships');
