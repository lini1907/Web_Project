/**
 * Seed dữ liệu demo từ thư mục FarmTable/XML+Json của bản HTML cũ.
 *   npm run seed            # upsert: chạy lại nhiều lần không nhân bản, không ghi đè tồn kho đang dùng
 *   npm run seed -- --reset # xóa sạch database rồi seed lại từ đầu (dùng trước buổi demo)
 * Mật khẩu mọi tài khoản demo = SEED_DEMO_PASSWORD (xem .env.example). Không dùng mật khẩu thật.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDb } from '../config/db.js';
import { User, Farm, Product, MysteryBox, Order, GroupBuy, GroupBuyMembership, Cart, Event, AuditLog, Counter, Voucher, Review, Shipment, RecommendHistory } from '../models/index.js';
import { hashPassword } from '../modules/auth/auth.service.js';
import { slugify } from '../utils/text.js';
import { rescuePrice, shippingFeeFor } from '../utils/money.js';
import { buildSearchText } from '../modules/products/product.service.js';
import { FARM_META, LEGACY_VENDOR_BY_FARM, EXCLUDED_FARMS, rescueReason } from './farm-meta.js';
import { EXTRA_PRODUCTS, EXTRA_FARM_META } from './extra-products.js';
import { exportCatalog } from './export-catalog.js';

const LEGACY_DIR = path.resolve(env.root, '..', 'FarmTable', 'XML+Json');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(LEGACY_DIR, f), 'utf8'));
// Ảnh bổ sung (Wikimedia Commons, nhóm chọn tay) — key: 'x-...' cho sản phẩm mới, 'legacy:<id>' cho sản phẩm kế thừa.
const IMAGE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'product-images.json');
const EXTRA_IMAGES = fs.existsSync(IMAGE_FILE) ? JSON.parse(fs.readFileSync(IMAGE_FILE, 'utf8')).products : {};
const imagesFor = (key) => EXTRA_IMAGES[key] || [];
const creditsOf = (imgs) => imgs.map(({ url, artist, license, page }) => ({ url, artist, license, page }));
const DAY = 86400000;

// Tồn kho demo xác định (không ngẫu nhiên) để chạy lại cho cùng kết quả.
function demoStock(legacyId) {
  const n = Number(legacyId);
  if ([5, 31].includes(n)) return 4; // vài sản phẩm sắp hết để minh họa KPI "lowStock"
  return 12 + ((n * 37) % 60);
}

/** Cuối ngày (23:59 giờ VN) sau `days` ngày kể từ hôm nay. */
function endOfDayVN(days) {
  const vn = new Date(Date.now() + 7 * 3600 * 1000 + days * DAY);
  return new Date(`${vn.toISOString().slice(0, 10)}T23:59:59.000+07:00`);
}

const counts = { created: 0, updated: 0 };

async function upsert(Model, filter, set, setOnInsert = {}) {
  const res = await Model.findOneAndUpdate(
    filter,
    { $set: set, $setOnInsert: setOnInsert },
    { upsert: true, returnDocument: 'after', includeResultMetadata: true, runValidators: true },
  );
  if (res.lastErrorObject?.updatedExisting) counts.updated += 1;
  else counts.created += 1;
  return res.value;
}

async function seedUsers(passwordHash) {
  const admins = readJson('admin.json');
  for (const a of admins) {
    await upsert(User, { email: a.email }, { name: a.name, phone: a.phone, role: 'admin', legacyId: a.id }, { passwordHash, status: 'active' });
  }
  const buyers = [];
  for (const c of readJson('customers.json')) {
    // Đổi sang tên miền example.com để không dùng địa chỉ email có thể là thật.
    const email = c.email.replace(/@.*$/, '@example.com');
    buyers.push(
      await upsert(
        User,
        { email },
        { name: c.name, phone: c.phone, role: 'buyer', legacyId: c.id, address: { name: c.name, phone: c.phone, address: c.address } },
        { passwordHash, status: 'active' },
      ),
    );
  }
  return buyers;
}

async function seedVendorsAndFarms(passwordHash, farmNames) {
  const legacyVendors = readJson('vendors.json');
  const byFarm = new Map();
  const allFarms = [...new Set([...farmNames, ...legacyVendors.map((v) => v.name)])];
  for (const farmName of allFarms) {
    const legacy = legacyVendors.find((v) => v.id === LEGACY_VENDOR_BY_FARM[farmName] || v.name === farmName);
    const meta = FARM_META[farmName] || EXTRA_FARM_META[farmName] || { province: '', certifications: [], story: '' };
    const slug = slugify(farmName);
    const email = legacy?.email || `${slug}@farmtable.vn`;
    const pending = legacy?.status === 'Chờ duyệt';
    const vendor = await upsert(
      User,
      { email },
      { name: farmName, phone: legacy?.phone || '0900000000', role: 'vendor', legacyId: legacy?.id || `farm:${slug}` },
      { passwordHash, status: 'active', vendorStatus: pending ? 'pending' : 'approved' },
    );
    const farm = await upsert(
      Farm,
      { slug },
      {
        vendorId: vendor._id,
        name: farmName,
        province: meta.province,
        address: meta.address || legacy?.address || '',
        story: meta.story,
        certifications: meta.certifications,
      },
      { status: 'active', images: [] },
    );
    byFarm.set(farmName, { vendor, farm });
  }
  return byFarm;
}

async function seedProducts(legacyProducts, byFarm) {
  const productsByLegacy = new Map();
  let rescueIdx = 0;
  for (const lp of legacyProducts) {
    if (EXCLUDED_FARMS.includes(lp.farm) || lp.badge === 'Bí ẩn') continue;
    const { vendor, farm } = byFarm.get(lp.farm);
    const isRescue = lp.badge === 'Giải cứu' && lp.oldPrice;
    const extra = imagesFor(`legacy:${lp.id}`);
    const doc = {
      vendorId: vendor._id,
      farmId: farm._id,
      name: lp.name,
      category: lp.category,
      unit: lp.unit,
      certifications: lp.certifications || [],
      mainImage: lp.mainImage,
      galleryImages: [...(lp.galleryImages || []), ...extra.map((x) => x.url)],
      imageCredits: creditsOf(extra),
      description: lp.description,
      rating: lp.rating,
      reviewCount: lp.reviewCount,
      legacyId: lp.id,
    };
    let rescue = null;
    if (isRescue) {
      const rate = Math.min(50, Math.max(30, Math.round((1 - lp.price / lp.oldPrice) * 100)));
      // Một sản phẩm cố ý hết hạn hôm qua để minh họa "quá hạn thì không đặt được".
      const days = lp.id === '16' ? -1 : 2 + (rescueIdx % 6);
      rescueIdx += 1;
      rescue = { originalPrice: lp.oldPrice, discountRate: rate, expiresAt: endOfDayVN(days), reason: rescueReason(lp.name) };
      doc.type = 'rescue';
      doc.rescue = rescue;
      doc.price = rescuePrice(lp.oldPrice, rate);
    } else {
      doc.type = 'regular';
      doc.rescue = null;
      doc.price = lp.price;
    }
    doc.searchText = buildSearchText(doc, farm.name);
    const p = await upsert(
      Product,
      { legacyId: lp.id },
      doc,
      { slug: slugify(lp.name), stock: demoStock(lp.id), reservedStock: 0, soldCount: lp.soldCount || 0, isActive: true },
    );
    productsByLegacy.set(lp.id, p);
  }
  return productsByLegacy;
}

/** Sản phẩm bổ sung của bản v2 (extra-products.js): hàng thường, mỗi sản phẩm 1 ảnh chính + nhiều ảnh phụ. */
async function seedExtraProducts(byFarm) {
  for (const [i, x] of EXTRA_PRODUCTS.entries()) {
    const { vendor, farm } = byFarm.get(x.farm);
    const imgs = imagesFor(x.key);
    const doc = {
      vendorId: vendor._id,
      farmId: farm._id,
      name: x.name,
      category: x.category,
      type: 'regular',
      rescue: null,
      price: x.price,
      unit: x.unit,
      certifications: x.certifications,
      mainImage: imgs[0]?.url || '',
      galleryImages: imgs.slice(1).map((m) => m.url),
      imageCredits: creditsOf(imgs),
      description: x.description,
      legacyId: x.key,
    };
    doc.searchText = buildSearchText(doc, farm.name);
    // Tồn kho demo xác định theo thứ tự để chạy lại cho cùng kết quả; sản phẩm mới chưa có đánh giá/lượt bán.
    await upsert(Product, { legacyId: x.key }, doc, { slug: slugify(x.name), stock: 15 + ((i * 29) % 70), reservedStock: 0, soldCount: 0, isActive: true });
  }
}

async function seedMysteryBoxes(legacyProducts, byFarm, productsByLegacy) {
  // Nguyên liệu nội bộ cho hộp trái cây của kho liên kết (không hiện ở shop).
  const lienKet = byFarm.get('Các nông trại liên kết');
  const ingredients = [
    ['ing-xoai', 'Xoài cát Hòa Lộc (nguyên liệu hộp)', 'trai-cay', 'kg', 70000, 30],
    ['ing-thanhlong', 'Thanh long ruột đỏ (nguyên liệu hộp)', 'trai-cay', 'kg', 45000, 40],
    ['ing-oi', 'Ổi lê Đài Loan (nguyên liệu hộp)', 'trai-cay', 'kg', 35000, 36],
    ['ing-quyt', 'Quýt đường Lai Vung (nguyên liệu hộp)', 'trai-cay', 'kg', 50000, 24],
  ];
  const ing = {};
  for (const [key, name, category, unit, price, stock] of ingredients) {
    const doc = { vendorId: lienKet.vendor._id, farmId: lienKet.farm._id, name, category, unit, price, type: 'mystery-ingredient', legacyId: key, description: 'Nguyên liệu dùng để đóng Mystery Box.' };
    doc.searchText = buildSearchText(doc, lienKet.farm.name);
    ing[key] = await upsert(Product, { legacyId: key }, doc, { slug: slugify(name), stock, reservedStock: 0, isActive: true });
  }
  const legacyBox = legacyProducts.find((p) => p.badge === 'Bí ẩn');
  await upsert(
    MysteryBox,
    { legacyId: legacyBox.id },
    {
      vendorId: lienKet.vendor._id,
      name: legacyBox.name,
      price: legacyBox.price,
      components: [
        { productId: ing['ing-xoai']._id, qty: 1 },
        { productId: ing['ing-thanhlong']._id, qty: 1 },
        { productId: ing['ing-oi']._id, qty: 1 },
        { productId: ing['ing-quyt']._id, qty: 1 },
      ],
      publicNote: 'Khoảng 4 kg, 3–4 loại trái cây đang vào mùa. Thành phần chỉ được biết khi mở hộp!',
      image: legacyBox.mainImage,
    },
    { slug: slugify(legacyBox.name), isActive: true },
  );
  // Hộp rau củ của Nông trại Đà Lạt Xanh dùng chung tồn kho với hàng bán lẻ của chính nông trại.
  const dalat = byFarm.get('Nông trại Đà Lạt Xanh');
  const rauCai = { vendorId: dalat.vendor._id, farmId: dalat.farm._id, name: 'Rau cải ngọt Đà Lạt (nguyên liệu hộp)', category: 'rau-cu', unit: 'kg', price: 30000, type: 'mystery-ingredient', legacyId: 'ing-caingot', description: 'Nguyên liệu dùng để đóng Mystery Box.' };
  rauCai.searchText = buildSearchText(rauCai, dalat.farm.name);
  const cai = await upsert(Product, { legacyId: 'ing-caingot' }, rauCai, { slug: slugify(rauCai.name), stock: 20, reservedStock: 0, isActive: true });
  await upsert(
    MysteryBox,
    { legacyId: 'box-rau-dalat' },
    {
      vendorId: dalat.vendor._id,
      name: 'Mystery Box Rau Củ Đà Lạt',
      price: 99000,
      components: [
        { productId: productsByLegacy.get('1')._id, qty: 1 },
        { productId: productsByLegacy.get('27')._id, qty: 1 },
        { productId: cai._id, qty: 1 },
      ],
      publicNote: 'Khoảng 3 kg rau củ quả hữu cơ thu hoạch trong tuần.',
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800',
    },
    { slug: 'mystery-box-rau-cu-da-lat', isActive: true },
  );
}

async function seedGroupBuys(byFarm, productsByLegacy, buyers) {
  const campaigns = [
    // [key, legacyProductId, groupPrice, target, max, deadlineOffsetMs, members [[buyerIdx, qty]]]
    ['gb-tom-su', '30', 230000, 10, 20, 3 * DAY, [[0, 3], [1, 2]]],
    ['gb-ga-ta', '31', 110000, 8, 12, 1 * DAY, [[2, 3]]],
    ['gb-cam-cai-be', '26', 32000, 30, 60, 5 * DAY, []],
    // Đã quá hạn và đạt ngưỡng: worker sẽ tự đóng và sinh đơn COD khi server khởi động (minh họa luồng thành công).
    ['gb-dau-tay', '28', 52000, 5, 15, -10 * 60000, [[3, 3], [4, 2]]],
    // Đã quá hạn nhưng chưa đạt ngưỡng: worker sẽ trả lại giữ chỗ (minh họa luồng thất bại).
    ['gb-bap-cai', '24', 32000, 20, 40, -5 * 60000, [[5, 2]]],
  ];
  for (const [key, legacyId, groupPrice, targetQty, maxQty, offset, members] of campaigns) {
    const product = productsByLegacy.get(legacyId);
    if (await GroupBuy.exists({ seedKey: key })) continue; // đã seed => chạy lại không nhân bản
    const joinedQty = members.reduce((s, [, q]) => s + q, 0);
    const c = await GroupBuy.create({
      vendorId: product.vendorId,
      productId: product._id,
      title: `Mua chung ${product.name}`,
      seedKey: key,
      groupPrice,
      regularPrice: product.price,
      targetQty,
      maxQty,
      joinedQty,
      memberCount: members.length,
      deadline: new Date(Date.now() + offset),
    });
    for (const [bi, qty] of members) {
      const b = buyers[bi];
      await GroupBuyMembership.create({ campaignId: c._id, userId: b._id, qty, shippingAddress: b.address, idempotencyKey: `seed-${key}-${bi}` });
    }
    if (joinedQty) await Product.updateOne({ _id: product._id }, { $inc: { reservedStock: joinedQty } });
    counts.created += 1;
  }
}

async function seedOrders(byLegacyProduct, buyers) {
  const legacyOrders = readJson('orders.json');
  const statusMap = { done: 'delivered', delivered: 'delivered', shipping: 'shipping', pending: 'pending', processing: 'confirmed', confirmed: 'confirmed', cancelled: 'cancelled' };
  const vendorNames = new Map((await User.find({ role: 'vendor' }, { name: 1 }).lean()).map((u) => [String(u._id), u.name]));
  for (const [idx, lo] of legacyOrders.entries()) {
    if (await Order.exists({ code: lo.id })) continue;
    const buyer = buyers.find((b) => b.legacyId === lo.customerId) || buyers[0];
    const items = lo.items
      .map((it) => ({ it, p: byLegacyProduct.get(String(it.productId)) }))
      .filter((x) => x.p);
    if (!items.length) continue;
    const status = statusMap[lo.status] || 'pending';
    const createdAt = new Date(Date.now() - (idx * 4 + 1) * DAY);
    const byVendor = new Map();
    for (const { it, p } of items) {
      const k = String(p.vendorId);
      if (!byVendor.has(k)) byVendor.set(k, []);
      byVendor.get(k).push({
        kind: 'product',
        productId: p._id,
        name: p.name,
        unit: p.unit,
        image: p.mainImage,
        unitPrice: it.price,
        qty: it.quantity,
        lineTotal: it.price * it.quantity,
        stockMoves: [{ productId: p._id, qty: it.quantity }],
      });
    }
    const flow = ['pending', 'confirmed', 'shipping', 'delivered'];
    const parts = [...byVendor.entries()].map(([vendorId, list]) => {
      const history = status === 'cancelled'
        ? [{ status: 'pending', by: 'buyer', at: createdAt }, { status: 'cancelled', by: 'buyer', at: new Date(createdAt.getTime() + 3600000) }]
        : flow.slice(0, flow.indexOf(status) + 1).map((s, i) => ({ status: s, by: i === 0 ? 'buyer' : 'vendor', at: new Date(createdAt.getTime() + i * 6 * 3600000) }));
      return {
        vendorId,
        vendorName: vendorNames.get(vendorId),
        items: list,
        subtotal: list.reduce((s, x) => s + x.lineTotal, 0),
        status,
        history,
        cod: status === 'delivered' ? { status: 'collected', collectedAt: new Date(createdAt.getTime() + 2 * DAY) } : { status: 'unpaid' },
        stockRestored: status === 'cancelled',
      };
    });
    const subtotal = parts.reduce((s, p) => s + p.subtotal, 0);
    const shippingFee = shippingFeeFor(subtotal);
    await Order.create({
      code: lo.id,
      buyerId: buyer._id,
      source: 'checkout',
      parts,
      subtotal,
      shippingFee,
      total: subtotal + shippingFee,
      shippingAddress: buyer.address,
      note: 'Đơn demo chuyển từ orders.json',
      createdAt,
      updatedAt: createdAt,
    });
    await Product.updateMany({ _id: { $in: items.map((x) => x.p._id) } }, { $set: { hasOrders: true } });
    counts.created += 1;
  }
}

/** Mã giảm giá mẫu (bỏ qua mã đã có để chạy seed nhiều lần không lỗi). */
async function seedVouchers() {
  const in30d = new Date(Date.now() + 30 * 24 * 3600e3);
  const list = [
    { code: 'CHAOBANMOI', description: 'Giảm 10% cho đơn đầu tiên, tối đa 30.000đ', type: 'percent', value: 10, maxDiscount: 30000, minOrderValue: 100000, expiresAt: in30d },
    { code: 'FREESHIP', description: 'Miễn phí giao hàng cho đơn từ 100.000đ', type: 'freeship', minOrderValue: 100000, maxUses: 500, expiresAt: in30d },
    { code: 'GIAM20K', description: 'Giảm 20.000đ cho đơn từ 150.000đ', type: 'fixed', value: 20000, minOrderValue: 150000, maxUses: 200, expiresAt: in30d },
  ];
  for (const x of list) await Voucher.updateOne({ code: x.code }, { $setOnInsert: x }, { upsert: true });
}

export async function runSeed({ reset = false, writeCatalog = !env.isTest } = {}) {
  if (reset) {
    const collections = [User, Farm, Product, MysteryBox, Order, GroupBuy, GroupBuyMembership, Cart, Event, AuditLog, Counter, Voucher, Review, Shipment, RecommendHistory];
    for (const M of collections) await M.deleteMany({});
    await mongoose.connection.collection('sessions').deleteMany({}).catch(() => {});
    console.log('Đã xóa dữ liệu cũ.');
  }
  for (const M of [User, Farm, Product, MysteryBox, Order, GroupBuy, GroupBuyMembership, Cart, Event, AuditLog, Voucher, Review, Shipment, RecommendHistory]) await M.syncIndexes();

  const passwordHash = await hashPassword(env.seedPassword);
  const legacyProducts = readJson('products.json');
  const farmNames = [...new Set([...legacyProducts.map((p) => p.farm), ...EXTRA_PRODUCTS.map((p) => p.farm)])].filter((f) => !EXCLUDED_FARMS.includes(f));

  const buyers = await seedUsers(passwordHash);
  const byFarm = await seedVendorsAndFarms(passwordHash, farmNames);
  const productsByLegacy = await seedProducts(legacyProducts, byFarm);
  await seedExtraProducts(byFarm);
  await seedMysteryBoxes(legacyProducts, byFarm, productsByLegacy);
  await seedGroupBuys(byFarm, productsByLegacy, buyers);
  await seedOrders(productsByLegacy, buyers);
  await seedVouchers();
  const catalogPath = writeCatalog ? await exportCatalog() : null;

  const summary = {
    users: await User.countDocuments(),
    vendors: await User.countDocuments({ role: 'vendor' }),
    farms: await Farm.countDocuments(),
    products: await Product.countDocuments({ type: { $ne: 'mystery-ingredient' } }),
    ingredients: await Product.countDocuments({ type: 'mystery-ingredient' }),
    mysteryBoxes: await MysteryBox.countDocuments(),
    groupBuys: await GroupBuy.countDocuments(),
    orders: await Order.countDocuments(),
    vouchers: await Voucher.countDocuments(),
    legacyProducts: legacyProducts.length,
    excluded: legacyProducts.filter((p) => EXCLUDED_FARMS.includes(p.farm)).map((p) => p.name),
    ...counts,
    catalogPath,
  };
  return summary;
}

// Chạy trực tiếp: node src/seed/seed.js [--reset]
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const reset = process.argv.includes('--reset');
  connectDb()
    .then(() => runSeed({ reset }))
    .then((s) => {
      console.log('Seed xong:', JSON.stringify(s, null, 2));
      console.log(`Tài khoản demo: admin@farmtable.vn, dalatxanh@farmtable.vn, bich.tran@example.com — mật khẩu SEED_DEMO_PASSWORD trong .env`);
      return mongoose.disconnect();
    })
    .catch((e) => {
      console.error('Seed lỗi:', e);
      process.exit(1);
    });
}
