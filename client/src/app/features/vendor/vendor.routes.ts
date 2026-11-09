import { Routes } from '@angular/router';
import { VendorLayout } from './vendor-layout.component';

/** Khu vực nhà bán — lazy-load toàn bộ nhóm route, layout riêng với route con (nested routes). */
export const VENDOR_ROUTES: Routes = [
  {
    path: '',
    component: VendorLayout,
    children: [
      { path: '', loadComponent: () => import('./vendor-dashboard.page').then((m) => m.VendorDashboardPage), title: 'Tổng quan · Kênh nhà bán' },
      { path: 'products', loadComponent: () => import('./vendor-products.page').then((m) => m.VendorProductsPage), title: 'Sản phẩm · Kênh nhà bán' },
      { path: 'products/new', loadComponent: () => import('./vendor-product-form.page').then((m) => m.VendorProductFormPage), title: 'Thêm sản phẩm · Kênh nhà bán' },
      { path: 'products/:id', loadComponent: () => import('./vendor-product-form.page').then((m) => m.VendorProductFormPage), title: 'Sửa sản phẩm · Kênh nhà bán' },
      { path: 'orders', loadComponent: () => import('./vendor-orders.page').then((m) => m.VendorOrdersPage), title: 'Đơn hàng · Kênh nhà bán' },
      { path: 'farm', loadComponent: () => import('./vendor-farm.page').then((m) => m.VendorFarmPage), title: 'Nông trại · Kênh nhà bán' },
      { path: 'mystery-boxes', loadComponent: () => import('./vendor-mystery.page').then((m) => m.VendorMysteryPage), title: 'Mystery Box · Kênh nhà bán' },
      { path: 'group-buys', loadComponent: () => import('./vendor-group-buys.page').then((m) => m.VendorGroupBuysPage), title: 'Mua chung · Kênh nhà bán' },
    ],
  },
];
