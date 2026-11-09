import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../api';

export interface StorefrontInfo { shippingFee: number; freeShippingFrom: number; paymentMethod: 'COD'; deliveryEstimate: string | null; }

@Injectable({ providedIn: 'root' })
export class StorefrontService {
  readonly info = signal<StorefrontInfo | null>(null);
  constructor() { inject(HttpClient).get<StorefrontInfo>(`${API}/storefront-info`).subscribe({next:r=>this.info.set(r),error:()=>this.info.set(null)}); }
}
