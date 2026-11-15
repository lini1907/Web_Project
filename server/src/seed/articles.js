import { Article, Product, User } from '../models/index.js';
import { normalizeVi, slugify } from '../utils/text.js';

/** Tìm sản phẩm đang bán khớp từ khóa để gắn vào nguyên liệu (không có thì để trống). */
let catalog = null;
async function productFor(keyword) {
  // Chỉ gắn khi TÊN sản phẩm bắt đầu bằng từ khóa (tránh khớp nhầm phần mô tả, vd "thơm ngon").
  catalog ??= (await Product.find({ type: { $ne: 'mystery-ingredient' }, isActive: true }, { name: 1 }).lean()).map((p) => ({ id: p._id, name: normalizeVi(p.name) }));
  const kw = normalizeVi(keyword);
  return catalog.find((p) => p.name === kw || p.name.startsWith(kw + ' '))?.id || null;
}

const RECIPES = [
  {
    title: 'Canh chua cá lóc miền Tây',
    summary: 'Món canh chua thanh mát với cà chua, thơm, đậu bắp và giá — đúng vị miền Tây.',
    tags: ['canh', 'miền Tây', 'cơm nhà'],
    recipe: {
      servings: 4,
      cookMinutes: 40,
      difficulty: 'medium',
      ingredients: [
        ['Cá lóc', '500 g', 'ca loc'],
        ['Cà chua', '2 quả', 'ca chua'],
        ['Thơm (dứa)', '1/4 quả', 'thom'],
        ['Đậu bắp', '6 trái', 'dau bap'],
        ['Giá đỗ', '100 g', 'gia'],
        ['Me chua', '30 g', null],
        ['Rau om, ngò gai', '1 nắm', 'rau om'],
      ],
      steps: [
        'Cá lóc làm sạch, cắt khúc, ướp chút muối và tiêu 15 phút.',
        'Me ngâm nước ấm, lọc lấy nước chua. Cà chua bổ múi cau, thơm thái lát, đậu bắp cắt xéo.',
        'Đun sôi 1,2 lít nước, cho nước me và thơm vào, nêm đường, nước mắm cho vừa chua ngọt.',
        'Thả cá vào nấu khoảng 7 phút trên lửa vừa, vớt bọt cho nước trong.',
        'Cho cà chua, đậu bắp vào nấu 2 phút, cuối cùng thêm giá, tắt bếp, rắc rau om và ngò gai.',
      ],
    },
    content: 'Canh chua là món quen thuộc trong mâm cơm gia đình Nam Bộ. Bí quyết là cân bằng vị chua của me, ngọt của thơm và mặn của nước mắm.\n\nChọn cá lóc đồng tươi, thịt chắc để khi nấu không bị bở.',
  },
  {
    title: 'Trứng chiên cà chua kiểu nhà làm',
    summary: '15 phút cho món trứng mềm, sốt cà chua đậm đà, hợp với cơm trắng.',
    tags: ['nhanh gọn', 'trứng', 'cơm nhà'],
    recipe: {
      servings: 2,
      cookMinutes: 15,
      difficulty: 'easy',
      ingredients: [
        ['Trứng gà', '4 quả', 'trung ga'],
        ['Cà chua', '3 quả', 'ca chua'],
        ['Hành lá', '2 nhánh', 'hanh la'],
        ['Nước mắm, đường, tiêu', 'vừa đủ', null],
      ],
      steps: [
        'Cà chua bổ múi cau, hành lá cắt khúc, đánh tan trứng với chút nước mắm.',
        'Phi thơm đầu hành, cho cà chua vào xào đến khi mềm, nêm chút đường và nước mắm.',
        'Đổ trứng vào, để yên 30 giây rồi đảo nhẹ cho trứng chín mềm quyện sốt.',
        'Rắc hành lá, tiêu, tắt bếp và dùng nóng.',
      ],
    },
    content: 'Món ăn đơn giản nhưng ngon nhờ cà chua chín đỏ và trứng gà thả vườn có lòng đỏ đậm màu.',
  },
  {
    title: 'Salad rau mầm sốt mè rang',
    summary: 'Đĩa salad giòn mát, giàu chất xơ, sốt mè rang béo nhẹ.',
    tags: ['salad', 'eat clean', 'chay'],
    recipe: {
      servings: 2,
      cookMinutes: 10,
      difficulty: 'easy',
      ingredients: [
        ['Xà lách', '200 g', 'xa lach'],
        ['Cà chua bi', '10 quả', 'ca chua'],
        ['Dưa leo', '1 quả', 'dua leo'],
        ['Bắp cải tím', '100 g', 'bap cai'],
        ['Sốt mè rang', '3 muỗng', null],
      ],
      steps: [
        'Rửa sạch rau, ngâm nước muối loãng 5 phút rồi để ráo.',
        'Xà lách xé miếng vừa ăn, dưa leo thái lát, bắp cải tím thái sợi, cà chua bi bổ đôi.',
        'Trộn đều rau trong tô lớn, rưới sốt mè rang ngay trước khi ăn để rau giữ độ giòn.',
      ],
    },
    content: 'Rau mua trong ngày từ nhà vườn Đà Lạt sẽ giòn và ngọt hơn hẳn. Có thể thêm ức gà luộc để bữa ăn đủ đạm.',
  },
];

const BLOGS = [
  {
    title: 'Mẹo chọn và bảo quản rau củ tươi lâu trong tủ lạnh',
    summary: 'Rau ăn lá, củ quả và trái cây cần cách bảo quản khác nhau. Áp dụng vài mẹo nhỏ để rau tươi thêm 3-5 ngày.',
    tags: ['mẹo bếp', 'bảo quản'],
    content:
      'Rau ăn lá nên để ráo nước, bọc giấy thấm rồi cho vào hộp kín ở ngăn mát. Không rửa trước khi cất vì độ ẩm làm lá nhanh úng.\n\nCà chua, bơ, chuối chưa chín nên để ở nhiệt độ phòng; chỉ cho vào tủ lạnh khi đã chín để giữ hương vị.\n\nCác loại củ như khoai, hành tỏi cần nơi khô thoáng, tránh ánh nắng và không để chung với nhau.',
  },
  {
    title: 'Nông sản "giải cứu" là gì và vì sao nên mua?',
    summary: 'Hàng giải cứu trên FarmTable là nông sản ngon nhưng dư thừa hoặc xấu mã, được bán giảm 30-50% để không bị bỏ phí.',
    tags: ['FarmTable', 'giải cứu', 'bền vững'],
    content:
      'Mỗi mùa thu hoạch, nhà vườn thường dư một lượng hàng không kịp tiêu thụ hoặc không đạt chuẩn hình thức của siêu thị dù chất lượng vẫn tốt.\n\nFarmTable cho phép nhà vườn đăng bán nhanh các lô này với mức giảm 30-50% trong thời gian ngắn. Người mua được giá tốt, nhà vườn giảm thất thoát, và ít thực phẩm bị bỏ đi hơn.\n\nHãy theo dõi mục Giải cứu để không bỏ lỡ những đợt hàng giá tốt.',
  },
];

/** Tạo bài viết mẫu (bỏ qua bài đã có cùng slug để chạy seed nhiều lần không lỗi). */
export async function seedArticles() {
  catalog = null;
  const admin = await User.findOne({ role: 'admin' }, { _id: 1, name: 1 }).lean();
  const base = Date.now() - 10 * 86400e3;
  const all = [...RECIPES.map((r) => ({ ...r, kind: 'recipe' })), ...BLOGS.map((b) => ({ ...b, kind: 'blog', recipe: null }))];
  for (const [i, a] of all.entries()) {
    const slug = slugify(a.title);
    if (await Article.exists({ slug })) continue;
    const recipe = a.recipe
      ? {
          ...a.recipe,
          ingredients: await Promise.all(a.recipe.ingredients.map(async ([name, amount, kw]) => ({ name, amount, productId: kw ? await productFor(kw) : null }))),
        }
      : null;
    await Article.create({
      ...a,
      slug,
      recipe,
      status: 'published',
      publishedAt: new Date(base + i * 86400e3),
      authorId: admin?._id,
      authorName: admin?.name || 'FarmTable',
      searchText: normalizeVi([a.title, a.summary, a.tags.join(' '), (recipe?.ingredients || []).map((x) => x.name).join(' ')].join(' ')),
    });
  }
}
