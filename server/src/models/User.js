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
    // Đăng nhập bằng Google: lưu "sub" (ID tài khoản Google). Tài khoản tạo qua Google có mật khẩu ngẫu nhiên.
    googleId: { type: String, default: undefined, index: { unique: true, sparse: true } },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    // Quên mật khẩu: chỉ lưu HASH của mã OTP, hết hạn sau vài phút, giới hạn số lần nhập sai.
    resetOtpHash: { type: String, select: false, default: null },
    resetOtpExpires: { type: Date, select: false, default: null },
    resetOtpAttempts: { type: Number, select: false, default: 0 },
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
    authProvider: this.authProvider || 'local',
    googleLinked: !!this.googleId,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
