import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  kind: { type: String, enum: ['product', 'box'], required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  boxId: { type: mongoose.Schema.Types.ObjectId, ref: 'MysteryBox' },
  qty: { type: Number, required: true, min: 1, max: 99 },
  addedAt: { type: Date, default: Date.now },
});

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

export const Cart = mongoose.model('Cart', cartSchema);
