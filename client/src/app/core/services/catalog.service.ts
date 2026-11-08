import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API, toParams } from '../api';
import { Category, Farm, GroupBuy, MysteryBox, Paged, Product, Recommendation } from '../models';

export interface ProductQuery {
  q?: string;
  category?: string;
  farm?: string;
  type?: string;
  sort?: string;
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

/** Service đọc dữ liệu công khai: sản phẩm, nông trại, Rescue, Mystery Box, mua chung, gợi ý. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private http = inject(HttpClient);

  products(q: ProductQuery): Observable<Paged<Product>> {
    return this.http.get<Paged<Product>>(`${API}/products`, { params: toParams({ ...q }) });
  }
  product(idOrSlug: string): Observable<Product> {
    return this.http.get<Product>(`${API}/products/${encodeURIComponent(idOrSlug)}`);
  }
  categories(): Observable<{ slug: Category; count: number }[]> {
    return this.http.get<{ slug: Category; count: number }[]>(`${API}/categories`);
  }
  rescue(page = 1, limit = 24): Observable<Paged<Product>> {
    return this.http.get<Paged<Product>>(`${API}/rescue`, { params: toParams({ page, limit }) });
  }
  farms(q?: string): Observable<Farm[]> {
    return this.http.get<Farm[]>(`${API}/farms`, { params: toParams({ q }) });
  }
  farm(slug: string): Observable<Farm> {
    return this.http.get<Farm>(`${API}/farms/${encodeURIComponent(slug)}`, { params: toParams({ limit: 12 }) });
  }
  mysteryBoxes(): Observable<MysteryBox[]> {
    return this.http.get<MysteryBox[]>(`${API}/mystery-boxes`);
  }
  groupBuys(status = 'open'): Observable<GroupBuy[]> {
    return this.http.get<GroupBuy[]>(`${API}/group-buys`, { params: toParams({ status }) });
  }
  groupBuy(id: string): Observable<GroupBuy> {
    return this.http.get<GroupBuy>(`${API}/group-buys/${id}`);
  }
  similar(productId: string, limit = 5): Observable<Recommendation> {
    return this.http.get<Recommendation>(`${API}/recommendations/similar/${productId}`, { params: toParams({ limit }) });
  }
  forMe(limit = 8): Observable<Recommendation> {
    return this.http.get<Recommendation>(`${API}/recommendations/for-me`, { params: toParams({ limit }) });
  }
  /** Ghi sự kiện hành vi cho mô hình gợi ý (lỗi thì bỏ qua, không ảnh hưởng trải nghiệm). */
  track(type: 'view' | 'add_to_cart', productId: string): void {
    this.http.post(`${API}/events`, { type, productId }).subscribe({ error: () => undefined });
  }
}
