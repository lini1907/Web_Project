import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards';

/**
 * Một Angular app duy nhất, route theo vai trò:
 *  - Buyer/khách: các trang mua sắm (load ngay hoặc lazy theo component)
 *  - Vendor, Admin: lazy-load cả nhóm route (loadChildren) + canMatch theo vai trò
 */
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage), title: 'FarmTable | Nông sản sạch từ nhà vườn' },
  { path: 'home', redirectTo: '', pathMatch: 'full' },

  // Danh mục & sản phẩm (query params: q, category, farm, type, sort, page)
  { path: 'shop', loadComponent: () => import('./features/catalog/shop.page').then((m) => m.ShopPage), title: 'Cửa hàng · FarmTable' },
  { path: 'products/:slug', loadComponent: () => import('./features/catalog/product-detail.page').then((m) => m.ProductDetailPage) },
  { path: 'san-pham/:slug', redirectTo: 'products/:slug' },
  { path: 'farms', loadComponent: () => import('./features/catalog/farms.page').then((m) => m.FarmsPage), title: 'Nông trại · FarmTable' },
  { path: 'farms/:slug', loadComponent: () => import('./features/catalog/farm-detail.page').then((m) => m.FarmDetailPage) },

  // 3 tính năng đặc trưng
  { path: 'rescue', loadComponent: () => import('./features/rescue/rescue.page').then((m) => m.RescuePage), title: 'Giải cứu nông sản · FarmTable' },
  { path: 'mystery-box', loadComponent: () => import('./features/mystery/mystery.page').then((m) => m.MysteryPage), title: 'Mystery Box · FarmTable' },
  { path: 'group-buy', loadComponent: () => import('./features/group-buy/group-buy-list.page').then((m) => m.GroupBuyListPage), title: 'Mua chung · FarmTable' },
  { path: 'group-buy/:id', loadComponent: () => import('./features/group-buy/group-buy-detail.page').then((m) => m.GroupBuyDetailPage) },

  // Giỏ hàng & đơn (buyer)
  { path: 'cart', loadComponent: () => import('./features/cart/cart.page').then((m) => m.CartPage), title: 'Giỏ hàng · FarmTable' },
  { path: 'checkout', canActivate: [authGuard], loadComponent: () => import('./features/cart/checkout.page').then((m) => m.CheckoutPage), title: 'Thanh toán · FarmTable' },
  { path: 'orders', canActivate: [authGuard], loadComponent: () => import('./features/orders/orders.page').then((m) => m.OrdersPage), title: 'Đơn hàng của tôi · FarmTable' },
  { path: 'orders/:id', canActivate: [authGuard], loadComponent: () => import('./features/orders/order-detail.page').then((m) => m.OrderDetailPage), title: 'Theo dõi đơn hàng · FarmTable' },
  { path: 'track-order', redirectTo: 'orders' },

  // Tài khoản
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./features/account/login.page').then((m) => m.LoginPage), title: 'Đăng nhập · FarmTable' },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./features/account/register.page').then((m) => m.RegisterPage), title: 'Đăng ký · FarmTable' },
  { path: 'vendor-login', redirectTo: '/login?as=vendor' },
  { path: 'account', canActivate: [authGuard], loadComponent: () => import('./features/account/account.page').then((m) => m.AccountPage), title: 'Tài khoản · FarmTable' },

  // Khu vực theo vai trò (lazy loading + nested routes + guard)
  { path: 'vendor', canMatch: [roleGuard('vendor')], loadChildren: () => import('./features/vendor/vendor.routes').then((m) => m.VENDOR_ROUTES) },
  { path: 'admin', canMatch: [roleGuard('admin')], loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES) },

  { path: 'forbidden', loadComponent: () => import('./features/misc/not-found.page').then((m) => m.ForbiddenPage), title: 'Không có quyền · FarmTable' },
  { path: '**', loadComponent: () => import('./features/misc/not-found.page').then((m) => m.NotFoundPage), title: 'Không tìm thấy trang · FarmTable' },
];
