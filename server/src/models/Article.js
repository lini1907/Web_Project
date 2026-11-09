import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Trang nội dung: công thức nấu ăn (kind = recipe) và bài blog/tin tức (kind = blog).
 * Công thức có danh sách nguyên liệu, có thể gắn với sản phẩm đang bán để "thêm cả công thức vào giỏ".
 */
const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: String, default: '' }, // "300 g", "2 quả"
    productId: { type: ObjectId, ref: 'Product', default: null },
  },
  { _id: false },
);

const articleSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['recipe', 'blog'], required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    summary: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    content: { type: String, default: '' }, // đoạn văn cách nhau bằng dòng trống
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    recipe: {
      type: new mongoose.Schema(
        {
          servings: { type: Number, default: 2 },
          cookMinutes: { type: Number, default: 30 },
          difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
          ingredients: { type: [ingredientSchema], default: [] },
          steps: { type: [String], default: [] },
        },
        { _id: false },
      ),
      default: null,
    },
    authorId: { type: ObjectId, ref: 'User' },
    authorName: { type: String, default: '' },
    publishedAt: { type: Date, default: null },
    views: { type: Number, default: 0 },
    searchText: { type: String, default: '' },
  },
  { timestamps: true },
);
articleSchema.index({ kind: 1, status: 1, publishedAt: -1 });

export const Article = mongoose.model('Article', articleSchema);
