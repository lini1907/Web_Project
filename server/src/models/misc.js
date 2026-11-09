import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/** Sự kiện hành vi dùng cho gợi ý. Không lưu mật khẩu/PII, chỉ id người dùng và id phiên đã băm. */
const eventSchema = new mongoose.Schema({
  userId: { type: ObjectId, ref: 'User', default: null, index: true },
  sessionKey: { type: String, default: '' },
  type: { type: String, enum: ['view', 'add_to_cart', 'purchase'], required: true },
  productId: { type: ObjectId, ref: 'Product', required: true, index: true },
  at: { type: Date, default: Date.now, index: true },
});

const auditLogSchema = new mongoose.Schema({
  actorId: { type: ObjectId, ref: 'User' },
  actorEmail: String,
  action: { type: String, required: true },
  targetType: String,
  targetId: String,
  targetLabel: String,
  before: mongoose.Schema.Types.Mixed,
  after: mongoose.Schema.Types.Mixed,
  reason: String,
  at: { type: Date, default: Date.now, index: true },
});

/** Bộ đếm tuần tự (sinh mã đơn FTyyMMdd0001). */
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});

export const Event = mongoose.model('Event', eventSchema);
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export const Counter = mongoose.model('Counter', counterSchema);
