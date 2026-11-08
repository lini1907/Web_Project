import { GroupBuy, GroupBuyMembership, Product, User } from '../../models/index.js';
import { withTransaction } from '../../config/db.js';
import { AppError, Errors } from '../../utils/AppError.js';
import { availableStock } from '../products/product.dto.js';
import { createGroupBuyOrder } from '../orders/order.service.js';
import { env } from '../../config/env.js';

const MIN_DEADLINE_MS = 60 * 60 * 1000; // hạn chót phải sau hiện tại ít nhất 1 giờ
const STALE_CLOSING_MS = 5 * 60 * 1000;

function toDto(c, { product, vendor, membership } = {}) {
  const now = Date.now();
  return {
    id: String(c._id),
    title: c.title || product?.name || '',
    product: product
      ? { id: String(product._id), slug: product.slug, name: product.name, unit: product.unit, mainImage: product.mainImage, category: product.category }
      : { id: String(c.productId) },
    vendor: vendor ? { id: String(vendor._id), name: vendor.name } : { id: String(c.vendorId) },
    regularPrice: c.regularPrice,
    groupPrice: c.groupPrice,
    discountRate: Math.round((1 - c.groupPrice / c.regularPrice) * 100),
    targetQty: c.targetQty,
    maxQty: c.maxQty,
    joinedQty: c.joinedQty,
    memberCount: c.memberCount,
    remainingQty: Math.max(0, c.maxQty - c.joinedQty),
    progress: Math.min(100, Math.round((c.joinedQty / c.targetQty) * 100)),
    reachedTarget: c.joinedQty >= c.targetQty,
    deadline: c.deadline,
    status: c.status,
    joinable: c.status === 'open' && new Date(c.deadline).getTime() > now && c.joinedQty < c.maxQty,
    closedAt: c.closedAt || null,
    closeReason: c.closeReason || '',
    createdAt: c.createdAt,
    myMembership: membership
      ? { id: String(membership._id), qty: membership.qty, status: membership.status, orderId: membership.orderId ? String(membership.orderId) : null }
      : null,
    serverTime: new Date(now).toISOString(),
  };
}

async function decorate(campaigns, userId) {
  const products = await Product.find({ _id: { $in: campaigns.map((c) => c.productId) } }).lean();
  const vendors = await User.find({ _id: { $in: campaigns.map((c) => c.vendorId) } }, { name: 1 }).lean();
  const memberships = userId
    ? await GroupBuyMembership.find({ userId, campaignId: { $in: campaigns.map((c) => c._id) } }).lean()
    : [];
  const pm = new Map(products.map((p) => [String(p._id), p]));
  const vm = new Map(vendors.map((x) => [String(x._id), x]));
  const mm = new Map(memberships.map((m) => [String(m.campaignId), m]));
  return campaigns.map((c) =>
    toDto(c, { product: pm.get(String(c.productId)), vendor: vm.get(String(c.vendorId)), membership: mm.get(String(c._id)) }),
  );
}

export async function listPublic({ status = 'open' }, userId) {
  const filter = status === 'all' ? {} : status === 'closed' ? { status: { $in: ['succeeded', 'failed'] } } : { status };
  const approved = await User.find({ role: 'vendor', vendorStatus: 'approved', status: 'active' }, { _id: 1 }).lean();
  filter.vendorId = { $in: approved.map((x) => x._id) };
  const rows = await GroupBuy.find(filter).sort({ status: 1, deadline: 1 }).limit(100).lean();
  return decorate(rows, userId);
}

export async function getPublic(id, userId) {
  const c = await GroupBuy.findById(id).lean();
  if (!c) throw Errors.notFound('Chiến dịch không tồn tại');
  const [dto] = await decorate([c], userId);
  return dto;
}

export async function listForVendor(vendorId) {
  const rows = await GroupBuy.find({ vendorId }).sort({ createdAt: -1 }).lean();
  return decorate(rows);
}

export async function create(vendorId, { productId, groupPrice, targetQty, maxQty, deadline, title }) {
  const product = await Product.findOne({ _id: productId, vendorId, isActive: true });
  if (!product) throw Errors.validation([{ field: 'productId', message: 'Sản phẩm không thuộc gian hàng của bạn hoặc đã ngừng bán' }]);
  if (product.type !== 'regular') throw Errors.validation([{ field: 'productId', message: 'Không mở mua chung cho hàng giải cứu' }]);
  const issues = [];
  if (groupPrice >= product.price) issues.push({ field: 'groupPrice', message: `Giá nhóm phải thấp hơn giá bán lẻ (${product.price}đ)` });
  if (targetQty > maxQty) issues.push({ field: 'targetQty', message: 'Ngưỡng thành công không được lớn hơn số lượng tối đa' });
  if (deadline.getTime() < Date.now() + MIN_DEADLINE_MS) issues.push({ field: 'deadline', message: 'Hạn chót phải sau hiện tại ít nhất 1 giờ' });
  if (maxQty > availableStock(product)) issues.push({ field: 'maxQty', message: `Vượt tồn kho khả dụng (${availableStock(product)})` });
  if (issues.length) throw Errors.validation(issues);
  const c = await GroupBuy.create({
    vendorId,
    productId,
    title: title || `Mua chung ${product.name}`,
    groupPrice,
    regularPrice: product.price,
    targetQty,
    maxQty,
    deadline,
  });
  return (await decorate([c.toObject()]))[0];
}

/**
 * Tham gia = CAM KẾT mua, giữ chỗ tồn kho, CHƯA thu tiền và CHƯA tạo đơn.
 * Chạy trong transaction: tăng joinedQty có điều kiện (không vượt maxQty) + giữ chỗ kho có điều kiện.
 */
export async function join(user, campaignId, { qty, shippingAddress }, idempotencyKey) {
  const existing = await GroupBuyMembership.findOne({ campaignId, userId: user._id }).lean();
  if (existing && idempotencyKey && existing.idempotencyKey === idempotencyKey) {
    return { membership: existing, replayed: true, campaign: await getPublic(campaignId, user._id) };
  }
  let fill = false;
  try {
    await withTransaction(async (session) => {
      const c = await GroupBuy.findById(campaignId).session(session);
      if (!c) throw Errors.notFound('Chiến dịch không tồn tại');
      if (c.status !== 'open' || c.deadline <= new Date()) throw Errors.conflict('CAMPAIGN_CLOSED', 'Chiến dịch đã đóng');
      if (String(c.vendorId) === String(user._id)) throw Errors.forbidden();
      const m = await GroupBuyMembership.findOne({ campaignId, userId: user._id }).session(session);
      if (m && (m.status === 'committed' || m.status === 'ordered')) {
        throw Errors.conflict('ALREADY_JOINED', 'Bạn đã tham gia chiến dịch này');
      }
      const upd = await GroupBuy.updateOne(
        { _id: c._id, status: 'open', $expr: { $lte: [{ $add: ['$joinedQty', qty] }, '$maxQty'] } },
        { $inc: { joinedQty: qty, memberCount: 1 } },
        { session },
      );
      if (upd.modifiedCount !== 1) {
        throw Errors.conflict('CAMPAIGN_FULL', `Chiến dịch chỉ còn ${Math.max(0, c.maxQty - c.joinedQty)} suất`, [
          { remainingQty: Math.max(0, c.maxQty - c.joinedQty) },
        ]);
      }
      const reserve = await Product.updateOne(
        { _id: c.productId, isActive: true, $expr: { $gte: [{ $subtract: ['$stock', '$reservedStock'] }, qty] } },
        { $inc: { reservedStock: qty } },
        { session },
      );
      if (reserve.modifiedCount !== 1) throw Errors.conflict('OUT_OF_STOCK', 'Sản phẩm không còn đủ hàng để giữ chỗ');
      if (m) {
        m.set({ qty, shippingAddress, status: 'committed', orderId: null, idempotencyKey });
        await m.save({ session });
      } else {
        await GroupBuyMembership.create([{ campaignId, userId: user._id, qty, shippingAddress, idempotencyKey }], { session });
      }
      fill = c.joinedQty + qty >= c.maxQty;
    });
  } catch (err) {
    if (err?.code === 11000) throw Errors.conflict('ALREADY_JOINED', 'Bạn đã tham gia chiến dịch này');
    throw err;
  }
  // Đủ số lượng tối đa => đóng chiến dịch ngay (không đợi worker).
  if (fill) await closeCampaign(campaignId).catch((e) => console.error('[group-buy] close after fill failed', e));
  const membership = await GroupBuyMembership.findOne({ campaignId, userId: user._id }).lean();
  return { membership, replayed: false, campaign: await getPublic(campaignId, user._id) };
}

export async function withdraw(user, campaignId) {
  await withTransaction(async (session) => {
    const c = await GroupBuy.findById(campaignId).session(session);
    if (!c) throw Errors.notFound('Chiến dịch không tồn tại');
    if (c.status !== 'open') throw Errors.conflict('CAMPAIGN_CLOSED', 'Chiến dịch đã đóng, không thể rút cam kết');
    const m = await GroupBuyMembership.findOneAndUpdate(
      { campaignId, userId: user._id, status: 'committed' },
      { $set: { status: 'withdrawn' } },
      { session, returnDocument: 'before' },
    );
    if (!m) throw Errors.notFound('Bạn chưa tham gia chiến dịch này');
    await GroupBuy.updateOne({ _id: c._id }, { $inc: { joinedQty: -m.qty, memberCount: -1 } }, { session });
    await Product.updateOne({ _id: c.productId }, { $inc: { reservedStock: -m.qty } }, { session });
  });
  return getPublic(campaignId, user._id);
}

export async function myMemberships(userId) {
  const ms = await GroupBuyMembership.find({ userId }).sort({ createdAt: -1 }).lean();
  const campaigns = await GroupBuy.find({ _id: { $in: ms.map((m) => m.campaignId) } }).lean();
  const decorated = await decorate(campaigns, userId);
  const map = new Map(decorated.map((d) => [d.id, d]));
  return ms
    .map((m) => ({
      id: String(m._id),
      qty: m.qty,
      status: m.status,
      orderId: m.orderId ? String(m.orderId) : null,
      joinedAt: m.createdAt,
      shippingAddress: m.shippingAddress,
      campaign: map.get(String(m.campaignId)) || null,
    }))
    .filter((x) => x.campaign);
}

/** Trả toàn bộ giữ chỗ (khi chiến dịch thất bại hoặc vendor hủy). */
async function releaseAll(campaign, finalStatus, reason) {
  await withTransaction(async (session) => {
    const ms = await GroupBuyMembership.find({ campaignId: campaign._id, status: 'committed' }).session(session);
    const total = ms.reduce((s, m) => s + m.qty, 0);
    if (total > 0) {
      await Product.updateOne({ _id: campaign.productId }, { $inc: { reservedStock: -total } }, { session });
      await GroupBuyMembership.updateMany({ campaignId: campaign._id, status: 'committed' }, { $set: { status: 'released' } }, { session });
    }
    await GroupBuy.updateOne(
      { _id: campaign._id },
      { $set: { status: finalStatus, closedAt: new Date(), closeReason: reason } },
      { session },
    );
  });
}

/**
 * Đóng một chiến dịch (idempotent). Chỉ một tiến trình giành được chuyển open -> closing.
 * Đạt ngưỡng: mỗi membership chưa có orderId được sinh MỘT đơn COD trong transaction riêng
 * (lỗi giữa chừng thì lần chạy sau làm tiếp các membership còn lại, không sinh trùng).
 * Không đạt: trả lại toàn bộ giữ chỗ.
 */
export async function closeCampaign(campaignId, { force = false } = {}) {
  const now = new Date();
  const due = force ? {} : { $or: [{ deadline: { $lte: now } }, { $expr: { $gte: ['$joinedQty', '$maxQty'] } }] };
  const c = await GroupBuy.findOneAndUpdate(
    {
      _id: campaignId,
      $and: [
        { $or: [{ status: 'open' }, { status: 'closing', closingAt: { $lte: new Date(now.getTime() - STALE_CLOSING_MS) } }] },
        due,
      ],
    },
    { $set: { status: 'closing', closingAt: now } },
    { returnDocument: 'after' },
  );
  if (!c) return null; // tiến trình khác đang đóng, hoặc chưa đến hạn

  try {
    if (c.joinedQty >= c.targetQty) {
      const product = await Product.findById(c.productId).lean();
      const vendor = await User.findById(c.vendorId, { name: 1 }).lean();
      const pending = await GroupBuyMembership.find({ campaignId: c._id, status: 'committed', orderId: null }).lean();
      for (const m of pending) {
        await withTransaction(async (session) => {
          // Giành membership trong transaction: chỉ membership còn committed và chưa có orderId mới sinh đơn.
          const fresh = await GroupBuyMembership.findOne({ _id: m._id, status: 'committed', orderId: null }).session(session);
          if (!fresh) return;
          const order = await createGroupBuyOrder({ campaign: c, membership: fresh, product, vendorName: vendor?.name || '' }, session);
          fresh.status = 'ordered';
          fresh.orderId = order._id;
          await fresh.save({ session });
        });
      }
      await GroupBuy.updateOne(
        { _id: c._id, status: 'closing' },
        { $set: { status: 'succeeded', closedAt: new Date(), closeReason: c.joinedQty >= c.maxQty ? 'Đã đủ số lượng tối đa' : 'Đạt ngưỡng khi hết hạn' } },
      );
      return 'succeeded';
    }
    await releaseAll(c, 'failed', 'Không đạt ngưỡng khi hết hạn');
    return 'failed';
  } catch (err) {
    // Trả về open để lần chạy sau thử lại (các membership đã có orderId sẽ được bỏ qua).
    await GroupBuy.updateOne({ _id: c._id, status: 'closing' }, { $set: { status: 'open' } });
    throw err;
  }
}

export async function cancelByVendor(vendorId, campaignId) {
  const c = await GroupBuy.findOneAndUpdate(
    { _id: campaignId, vendorId, status: 'open' },
    { $set: { status: 'closing', closingAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!c) {
    const exists = await GroupBuy.exists({ _id: campaignId, vendorId });
    if (!exists) throw Errors.notFound('Chiến dịch không tồn tại');
    throw Errors.invalidState('Chỉ hủy được chiến dịch đang mở');
  }
  await releaseAll(c, 'cancelled', 'Nhà bán hủy chiến dịch');
  return (await decorate([await GroupBuy.findById(c._id).lean()]))[0];
}

/** Worker: quét các chiến dịch đến hạn / đã đầy / bị kẹt ở closing rồi đóng. */
export async function runWorkerOnce() {
  const now = new Date();
  const due = await GroupBuy.find(
    {
      $or: [
        { status: 'open', $or: [{ deadline: { $lte: now } }, { $expr: { $gte: ['$joinedQty', '$maxQty'] } }] },
        { status: 'closing', closingAt: { $lte: new Date(now.getTime() - STALE_CLOSING_MS) } },
      ],
    },
    { _id: 1 },
  ).lean();
  const results = [];
  for (const { _id } of due) {
    try {
      results.push({ id: String(_id), result: await closeCampaign(_id) });
    } catch (err) {
      results.push({ id: String(_id), error: err.message });
    }
  }
  return results;
}

let timer = null;
export function startWorker() {
  if (timer || env.groupBuyWorkerMs <= 0) return;
  const tick = async () => {
    try {
      const r = await runWorkerOnce();
      if (r.length && !env.isTest) console.log('[group-buy worker]', JSON.stringify(r));
    } catch (e) {
      console.error('[group-buy worker] error', e.message);
    }
  };
  timer = setInterval(tick, env.groupBuyWorkerMs);
  timer.unref();
  setTimeout(tick, 2000).unref();
}
export function stopWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}

export { AppError };
