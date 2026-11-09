import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API, toParams } from '../api';
import { Carrier, Farm, GroupBuy, Kpi, Paged, PartStatus, VendorMysteryBox, VendorOrderPart, VendorProduct } from '../models';

export interface ProductInput {
  farmId: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  stock: number;
  description?: string;
  packagingNote?: string;
  storageNote?: string;
  deliveryNote?: string;
  certifications?: string[];
  mainImage?: string;
  galleryImages?: string[];
  isActive?: boolean;
  type?: 'regular' | 'mystery-ingredient';
}

/** Các API dành cho nhà bán (vendor). Quyền sở hữu luôn được kiểm tra ở server. */
export interface ShipmentInput {
  carrier?: Carrier;
  trackingCode?: string;
  estimatedDelivery?: string | null;
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class VendorService {
  private http = inject(HttpClient);
  private base = `${API}/vendor`;

  kpi(from?: string, to?: string): Observable<Kpi> {
    return this.http.get<Kpi>(`${this.base}/kpi`, { params: toParams({ from, to }) });
  }
  products(q?: string, status?: string): Observable<VendorProduct[]> {
    return this.http.get<VendorProduct[]>(`${this.base}/products`, { params: toParams({ q, status }) });
  }
  product(id: string): Observable<VendorProduct> {
    return this.http.get<VendorProduct>(`${this.base}/products/${id}`);
  }
  createProduct(body: ProductInput): Observable<VendorProduct> {
    return this.http.post<VendorProduct>(`${this.base}/products`, body);
  }
  updateProduct(id: string, body: Partial<ProductInput>): Observable<VendorProduct> {
    return this.http.patch<VendorProduct>(`${this.base}/products/${id}`, body);
  }
  deleteProduct(id: string): Observable<{ deleted: boolean; softDeleted: boolean }> {
    return this.http.delete<{ deleted: boolean; softDeleted: boolean }>(`${this.base}/products/${id}`);
  }
  setRescue(id: string, body: { originalPrice: number; discountRate: number; expiresAt: string; reason?: string }): Observable<VendorProduct> {
    return this.http.put<VendorProduct>(`${this.base}/products/${id}/rescue`, body);
  }
  clearRescue(id: string): Observable<VendorProduct> {
    return this.http.delete<VendorProduct>(`${this.base}/products/${id}/rescue`);
  }
  upload(file: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string }>(`${this.base}/uploads`, fd);
  }

  farms(): Observable<Farm[]> {
    return this.http.get<Farm[]>(`${this.base}/farms`);
  }
  createFarm(body: Partial<Farm>): Observable<Farm> {
    return this.http.post<Farm>(`${this.base}/farms`, body);
  }
  updateFarm(id: string, body: Partial<Farm>): Observable<Farm> {
    return this.http.patch<Farm>(`${this.base}/farms/${id}`, body);
  }

  orders(page = 1, status?: string): Observable<Paged<VendorOrderPart>> {
    return this.http.get<Paged<VendorOrderPart>>(`${this.base}/orders`, { params: toParams({ page, status }) });
  }
  /** Đổi trạng thái phần đơn; khi chuyển sang "shipping" có thể kèm thông tin vận đơn. */
  setPartStatus(orderId: string, partId: string, status: PartStatus, shipment?: ShipmentInput): Observable<VendorOrderPart> {
    return this.http.patch<VendorOrderPart>(`${this.base}/orders/${orderId}/parts/${partId}`, { status, ...(shipment || {}) });
  }
  updateShipment(orderId: string, partId: string, body: ShipmentInput): Observable<VendorOrderPart> {
    return this.http.patch<VendorOrderPart>(`${this.base}/orders/${orderId}/parts/${partId}/shipment`, body);
  }
  addShipmentEvent(orderId: string, partId: string, body: { status: 'in_transit' | 'out_for_delivery' | 'failed'; note?: string; location?: string }): Observable<VendorOrderPart> {
    return this.http.post<VendorOrderPart>(`${this.base}/orders/${orderId}/parts/${partId}/shipment/events`, body);
  }
  collectCod(orderId: string, partId: string): Observable<VendorOrderPart> {
    return this.http.patch<VendorOrderPart>(`${this.base}/orders/${orderId}/parts/${partId}/cod`, { status: 'collected' });
  }

  boxes(): Observable<VendorMysteryBox[]> {
    return this.http.get<VendorMysteryBox[]>(`${this.base}/mystery-boxes`);
  }
  createBox(body: unknown): Observable<VendorMysteryBox> {
    return this.http.post<VendorMysteryBox>(`${this.base}/mystery-boxes`, body);
  }
  updateBox(id: string, body: unknown): Observable<VendorMysteryBox> {
    return this.http.patch<VendorMysteryBox>(`${this.base}/mystery-boxes/${id}`, body);
  }

  groupBuys(): Observable<GroupBuy[]> {
    return this.http.get<GroupBuy[]>(`${this.base}/group-buys`);
  }
  createGroupBuy(body: { productId: string; title?: string; groupPrice: number; targetQty: number; maxQty: number; deadline: string }): Observable<GroupBuy> {
    return this.http.post<GroupBuy>(`${this.base}/group-buys`, body);
  }
  cancelGroupBuy(id: string): Observable<GroupBuy> {
    return this.http.post<GroupBuy>(`${this.base}/group-buys/${id}/cancel`, {});
  }
}
