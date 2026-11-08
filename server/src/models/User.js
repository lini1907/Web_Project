import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  { name: String, phone: String, address: String },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    address: { type: addressSchema, default: null },
    role: { type: String, enum: ['buyer', 'vendor', 'admin'], default: 'buyer', index: true },
    status: { type: String, enum: ['active', 'locked'], default: 'active' },
    vendorStatus: { type: String, enum: ['pending', 'approved', 'rejected', null], default: null },
    vendorNote: { type: String, default: '' },
    lastLoginAt: Date,
    legacyId: { type: String, index: true, sparse: true },
  },
  { timestamps: true },
);

/** DTO: không bao giờ trả passwordHash. */
userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    phone: this.phone,
    address: this.address || null,
    role: this.role,
    status: this.status,
    vendorStatus: this.role === 'vendor' ? this.vendorStatus : null,
    vendorNote: this.role === 'vendor' ? this.vendorNote || '' : undefined,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
