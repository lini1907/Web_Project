import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { ApiErrorBody } from './models';

/** Base URL của API. Dev: proxy.conf.json chuyển /api sang localhost:3000 (cùng origin => cookie session hoạt động). */
export const API = '/api/v1';

/** Chuẩn hóa mọi lỗi HTTP về dạng { code, message, details } theo API contract. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }

  static from(err: unknown): ApiError {
    if (err instanceof ApiError) return err;
    if (err instanceof HttpErrorResponse) {
      const body = err.error?.error as ApiErrorBody | undefined;
      if (body?.code) return new ApiError(err.status, body.code, body.message, body.details);
      if (err.status === 0) return new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được máy chủ. Kiểm tra mạng hoặc thử lại sau.');
      return new ApiError(err.status, 'HTTP_' + err.status, 'Đã có lỗi xảy ra, vui lòng thử lại.');
    }
    return new ApiError(0, 'UNKNOWN', (err as Error)?.message || 'Đã có lỗi xảy ra');
  }

  /** Lỗi theo từng field (VALIDATION_ERROR) => map field -> message để hiển thị dưới ô nhập. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    if (Array.isArray(this.details)) {
      for (const d of this.details as { field?: string; message?: string }[]) {
        if (d.field && d.message && !out[d.field]) out[d.field] = d.message;
      }
    }
    return out;
  }
}

/** Tạo HttpParams, bỏ qua giá trị rỗng. */
export function toParams(obj: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
  }
  return p;
}

/** Khóa chống gửi trùng cho mỗi lần bấm "Đặt hàng"/"Tham gia". */
export function newIdempotencyKey(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}
