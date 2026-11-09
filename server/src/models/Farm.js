import mongoose from 'mongoose';

const farmSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    province: { type: String, default: '' },
    address: { type: String, default: '' },
    story: { type: String, default: '' },
    certifications: { type: [String], default: [] },
    images: { type: [String], default: [] },
    avatarUrl: { type: String, default: '' },
    status: { type: String, enum: ['active', 'hidden'], default: 'active' },
  },
  { timestamps: true },
);

export const Farm = mongoose.model('Farm', farmSchema);
