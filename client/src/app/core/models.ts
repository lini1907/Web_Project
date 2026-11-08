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
  galleryImages: string[];
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

export interface Farm {
  id: string;
  slug: string;
  name: string;
  province: string;
  address: string;
  story: string;
  certifications: string[];
  images: string[];
  vendorId: string;
  status?: 'active' | 'hidden';
  productCount?: number;
  vendor?: { id: string; name: string; since: string };
  products?: Product[];
}

export interface MysteryBox {
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
}

export interface Order {
  id: string;
  code: string;
  source: 'checkout' | 'group-buy';
  groupBuyId: string | null;
  parts: OrderPart[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: 'cod';
  status: OrderStatus;
  canCancel: boolean;
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
  items: { product: Product; score: number | null }[];
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
