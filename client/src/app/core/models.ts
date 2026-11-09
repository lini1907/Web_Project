// Kiểu dữ liệu dùng chung, khớp với API contract v1 của server.

export type Role = 'buyer' | 'vendor' | 'admin';
export type VendorStatus = 'pending' | 'approved' | 'rejected' | null;

export interface Address {
  name: string;
  phone: string;
  address: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: Address | null;
  role: Role;
  status: 'active' | 'locked';
  vendorStatus: VendorStatus;
  vendorNote?: string;
  authProvider?: 'local' | 'google';
  googleLinked?: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface Paged<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface FarmRef {
  id: string;
  slug: string;
  name: string;
  province?: string;
}

export interface Rescue {
  originalPrice: number;
  discountRate: number;
  expiresAt: string;
  reason: string;
  expired: boolean;
}

export type Category = 'rau-cu' | 'trai-cay' | 'thit-thuy-san' | 'trung-sua';

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  type: 'regular' | 'rescue' | 'mystery-ingredient';
  price: number;
  unit: string;
  inStock: boolean;
  stockLeft: number;
  farm: FarmRef | null;
  vendorId: string;
  vendor?: { id: string; name: string };
  certifications: string[];
  mainImage: string;
  thumbnailImage?: string;
  photoStatus?: 'illustration' | 'seller-provided' | 'needs-photo';
  isDemo?: boolean;
  packagingNote?: string;
  storageNote?: string;
  deliveryNote?: string;
  galleryImages: string[];
  /** Ghi nguồn ảnh giấy phép mở (Wikimedia Commons); ảnh nhà bán tự tải lên không có mục này. */
  imageCredits?: { url: string; artist: string; license: string; page: string; licenseUrl?: string; modified?: string }[];
  description: string;
  rescue: Rescue | null;
  rating: number;
  reviewCount: number;
  soldCount: number;
  createdAt: string;
}

export interface VendorProduct extends Product {
  stock: number;
  reservedStock: number;
  isActive: boolean;
  hasOrders: boolean;
  farmId: string;
  updatedAt: string;
}

export interface FarmPhoto {
  url: string;
  thumbnail?: string;
  caption: string;
  artist?: string;
  source?: string;
  license?: string;
  licenseUrl?: string;
  kind: 'reference' | 'seller-provided';
}

export interface Farm {
  isDemo?: boolean;
  id: string;
  slug: string;
  name: string;
  province: string;
  address: string;
  story: string;
  certifications: string[];
  images: string[];
  avatarUrl?: string;
  referencePhotos?: FarmPhoto[];
  vendorId: string;
  status?: 'active' | 'hidden';
  productCount?: number;
  vendor?: { id: string; name: string; since: string };
  products?: Product[];
}

export interface MysteryBox {
  isDemo?: boolean;
  id: string;
  slug: string;
  name: string;
  price: number;
  available: number;
  categories: Category[];
  itemCount: number;
  estimatedValue: { min: number; max: number } | null;
  publicNote: string;
  image: string;
  vendor: { id: string; name?: string };
  soldCount: number;
}

export interface VendorMysteryBox extends MysteryBox {
  isActive: boolean;
  components: { productId: string; qty: number; name: string; unit: string; stockLeft: number; price: number }[];
}

export interface CartLine {
  id: string;
  kind: 'product' | 'box';
  productId?: string;
  boxId?: string;
  name: string;
  slug?: string;
  image: string;
  unit: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  available: number;
  isRescue: boolean;
  rescueExpiresAt?: string | null;
  farm?: { name: string; slug: string } | null;
  vendor: { id: string; name: string } | null;
  warning: { code: string; message: string } | null;
}

export interface Cart {
  /** true khi là giỏ tạm của khách (lưu trong session, chưa gắn tài khoản). */
  guest?: boolean;
  items: CartLine[];
  itemCount: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  shippingRule: { fee: number; freeFrom: number };
  hasIssues: boolean;
}

export type PartStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';
export type OrderStatus = PartStatus | 'processing';

export interface OrderItem {
  id: string;
  kind: 'product' | 'box' | 'group-buy';
  productId: string | null;
  boxId: string | null;
  name: string;
  unit: string;
  image: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  isRescue?: boolean;
  contents?: { productId: string; name: string; qty: number }[];
}

export interface StatusEvent {
  status: PartStatus;
  at: string;
  by: 'buyer' | 'vendor' | 'system' | 'admin';
}

export interface OrderPart {
  id: string;
  vendor: { id: string; name: string };
  status: PartStatus;
  items: OrderItem[];
  subtotal: number;
  cod: { status: 'unpaid' | 'collected'; collectedAt: string | null };
  history: StatusEvent[];
  shipment: Shipment | null;
}

export type PaymentMethod = 'cod' | 'vnpay' | 'momo';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refund_pending';
export type DeliveryWindow = 'morning' | 'afternoon' | 'evening';
export interface DeliverySlot {
  date: string;
  window: DeliveryWindow;
}

export type ShipmentStatus = 'picked' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';
export type Carrier = 'self' | 'ghn' | 'ghtk' | 'viettel-post' | 'other';
export interface Shipment {
  id: string;
  trackingCode: string;
  carrier: Carrier;
  carrierLabel: string;
  status: ShipmentStatus;
  estimatedDelivery: string | null;
  events: { status: ShipmentStatus; note: string; location: string; at: string }[];
}

export interface Order {
  id: string;
  code: string;
  source: 'checkout' | 'group-buy';
  groupBuyId: string | null;
  parts: OrderPart[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  voucher: { code: string; type: VoucherType } | null;
  total: number;
  paymentMethod: PaymentMethod;
  payment: { status: PaymentStatus; transactionId: string | null; paidAt: string | null; message: string };
  deliverySlot: DeliverySlot | null;
  status: OrderStatus;
  canCancel: boolean;
  canPay: boolean;
  shippingAddress: Address;
  note: string;
  createdAt: string;
}

export interface VendorOrderPart {
  orderId: string;
  partId: string;
  code: string;
  source: 'checkout' | 'group-buy';
  createdAt: string;
  buyer: Address;
  note: string;
  items: OrderItem[];
  subtotal: number;
  status: PartStatus;
  nextStatuses: PartStatus[];
  cod: { status: 'unpaid' | 'collected'; collectedAt: string | null };
  history: StatusEvent[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  awaitingPayment: boolean;
  deliverySlot: DeliverySlot | null;
  shipment: Shipment | null;
}

export interface GroupBuy {
  id: string;
  title: string;
  product: { id: string; slug?: string; name?: string; unit?: string; mainImage?: string; category?: Category };
  vendor: { id: string; name?: string };
  regularPrice: number;
  groupPrice: number;
  discountRate: number;
  targetQty: number;
  maxQty: number;
  joinedQty: number;
  memberCount: number;
  remainingQty: number;
  progress: number;
  reachedTarget: boolean;
  deadline: string;
  status: 'open' | 'closing' | 'succeeded' | 'failed' | 'cancelled';
  joinable: boolean;
  closedAt: string | null;
  closeReason: string;
  createdAt: string;
  myMembership: { id: string; qty: number; status: 'committed' | 'ordered' | 'released' | 'withdrawn'; orderId: string | null } | null;
  serverTime: string;
}

export interface MyGroupBuy {
  id: string;
  qty: number;
  status: 'committed' | 'ordered' | 'released' | 'withdrawn';
  orderId: string | null;
  joinedAt: string;
  shippingAddress: Address;
  campaign: GroupBuy;
}

export interface Recommendation {
  source: 'model' | 'fallback';
  reason?: string;
  modelVersion: string | null;
  latencyMs: number;
  items: { product: Product; score: number | null; reason?: string }[];
}

export interface RecHistoryEntry {
  id: string;
  kind: 'for-me' | 'similar';
  source: 'model' | 'fallback';
  reason: string;
  modelVersion: string | null;
  context: RecBrief | null;
  items: { product: RecBrief; score: number | null; reason: string }[];
  at: string;
}
export interface RecBrief {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
}

export interface Kpi {
  from: string;
  to: string;
  orderCount: number;
  cancelledCount: number;
  pendingCount: number;
  deliveredCount: number;
  deliveredValue: number;
  openValue: number;
  codCollected: number;
  byStatus: Record<string, number>;
  daily: { date: string; orders: number; value: number }[];
  topProducts: { name: string; qty: number; value: number }[];
  lowStock: { id: string; name: string; stock: number; reservedStock: number; stockLeft: number; unit: string }[];
  productCount?: number;
  openCampaigns?: number;
  byVendor?: { vendorId: string; vendorName: string; orderCount: number; deliveredValue: number; codCollected: number; cancelledCount: number }[];
  users?: Record<string, number>;
  pendingVendors?: number;
  checkoutOrders?: number;
}

export interface AdminVendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'locked';
  vendorStatus: VendorStatus;
  vendorNote: string;
  createdAt: string;
  farms: { id: string; name: string; province: string }[];
  productCount: number;
  activeProductCount: number;
}

export interface AuditLog {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reason: string;
  at: string;
}

export interface Health {
  api: string;
  db: string;
  ml: string;
  modelVersion: string | null;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  'rau-cu': 'Rau củ',
  'trai-cay': 'Trái cây',
  'thit-thuy-san': 'Thịt & thủy sản',
  'trung-sua': 'Trứng & sữa',
};

export const CATEGORY_ICONS: Record<Category, string> = {
  'rau-cu': '🥬',
  'trai-cay': '🍊',
  'thit-thuy-san': '🐟',
  'trung-sua': '🥚',
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  open: 'Đang mở',
  closing: 'Đang chốt',
  succeeded: 'Thành công',
  failed: 'Không đạt',
  committed: 'Đã cam kết',
  ordered: 'Đã tạo đơn',
  released: 'Đã hoàn giữ chỗ',
  withdrawn: 'Đã rút',
  unpaid: 'Chưa thu tiền',
  collected: 'Đã thu tiền',
  approved: 'Đã duyệt',
  rejected: 'Bị từ chối',
  active: 'Hoạt động',
  locked: 'Đã khóa',
};

// ---------- Mã giảm giá ----------
export type VoucherType = 'percent' | 'fixed' | 'freeship';

export interface PublicVoucher {
  code: string;
  description: string;
  type: VoucherType;
  value: number;
  maxDiscount: number;
  minOrderValue: number;
  expiresAt: string | null;
}

export interface AdminVoucher extends PublicVoucher {
  id: string;
  maxUses: number;
  usedCount: number;
  startsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherInput {
  code: string;
  description?: string;
  type: VoucherType;
  value?: number;
  maxDiscount?: number;
  minOrderValue?: number;
  maxUses?: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
}

export interface VoucherPreview {
  voucher: PublicVoucher;
  discount: number;
  total: number;
}

// ---------- Đánh giá ----------
export interface Review {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  status: 'visible' | 'hidden';
  mine: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewPage extends Paged<Review> {
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface AdminReview extends Review {
  product: { name: string; slug: string };
}

/** Sự kiện real-time (SSE) server đẩy xuống. */
export interface RealtimeEvent {
  type: 'order.created' | 'order.updated' | 'payment.updated';
  orderId: string;
  partId?: string;
  code: string;
  status?: string;
  shipmentStatus?: string;
  message: string;
  at: string;
}

export const DELIVERY_WINDOW_LABELS: Record<DeliveryWindow, string> = { morning: 'Sáng 8:00–12:00', afternoon: 'Chiều 13:00–17:00', evening: 'Tối 18:00–21:00' };
export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  picked: 'Đã lấy hàng',
  in_transit: 'Đang trung chuyển',
  out_for_delivery: 'Đang đi giao',
  delivered: 'Đã giao',
  failed: 'Giao không thành công',
};
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Chưa thanh toán',
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thanh toán thất bại',
  refund_pending: 'Chờ hoàn tiền',
};
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = { cod: 'Thanh toán khi nhận hàng (COD)', vnpay: 'VNPay', momo: 'Ví MoMo' };
