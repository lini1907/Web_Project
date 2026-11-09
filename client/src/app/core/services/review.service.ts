import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API, toParams } from '../api';
import { AdminReview, Paged, Review, ReviewPage } from '../models';

/** Đánh giá sản phẩm: CRUD cho người mua + kiểm duyệt cho admin. */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private http = inject(HttpClient);

  list(productId: string, page = 1): Observable<ReviewPage> {
    return this.http.get<ReviewPage>(`${API}/products/${productId}/reviews`, { params: toParams({ page }) });
  }
  mine(productId: string): Observable<{ review: Review | null; canReview: boolean }> {
    return this.http.get<{ review: Review | null; canReview: boolean }>(`${API}/products/${productId}/reviews/mine`);
  }
  create(productId: string, body: { rating: number; comment?: string }): Observable<Review> {
    return this.http.post<Review>(`${API}/products/${productId}/reviews`, body);
  }
  update(id: string, body: { rating?: number; comment?: string }): Observable<Review> {
    return this.http.patch<Review>(`${API}/reviews/${id}`, body);
  }
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/reviews/${id}`);
  }

  // ----- Admin -----
  adminList(params: { q?: string; status?: string; rating?: number | string; page?: number }): Observable<Paged<AdminReview>> {
    return this.http.get<Paged<AdminReview>>(`${API}/admin/reviews`, { params: toParams(params) });
  }
  setStatus(id: string, status: 'visible' | 'hidden', reason?: string): Observable<Review> {
    return this.http.patch<Review>(`${API}/admin/reviews/${id}`, { status, reason });
  }
}
