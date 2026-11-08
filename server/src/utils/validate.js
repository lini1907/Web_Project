import mongoose from 'mongoose';
import { Errors } from './AppError.js';

/**
 * Bộ kiểm tra dữ liệu đầu vào gọn nhẹ (không phụ thuộc thư viện ngoài).
 * Mỗi rule là hàm (value, path) => giá trị đã chuẩn hóa; sai thì ném Issue.
 * Dùng: const body = parse({ name: v.string(), price: v.int({ min: 1 }) }, req.body)
 * parse() chỉ giữ các field được khai báo nên field lạ (vd "role", "$where") bị loại.
 */
class Issue extends Error {
  constructor(field, message) {
    super(message);
    this.field = field;
  }
}

const isMissing = (val) => val === undefined || val === null || val === '';

function wrap(check, { optional = false, nullable = false, def } = {}) {
  const rule = (value, path) => {
    if (isMissing(value)) {
      if (def !== undefined) return typeof def === 'function' ? def() : def;
      if (value === null && nullable) return null;
      if (optional || nullable) return undefined;
      throw new Issue(path, 'Bắt buộc nhập');
    }
    return check(value, path);
  };
  rule.optional = () => wrap(check, { optional: true, nullable, def });
  rule.nullable = () => wrap(check, { optional: true, nullable: true, def });
  rule.default = (d) => wrap(check, { optional, nullable, def: d });
  return rule;
}

export const v = {
  string: ({ min = 1, max = 2000, pattern, message } = {}) =>
    wrap((value, path) => {
      if (typeof value !== 'string') throw new Issue(path, 'Phải là chuỗi');
      const s = value.trim();
      if (s.length < min) throw new Issue(path, `Tối thiểu ${min} ký tự`);
      if (s.length > max) throw new Issue(path, `Tối đa ${max} ký tự`);
      if (pattern && !pattern.test(s)) throw new Issue(path, message || 'Sai định dạng');
      return s;
    }),
  email: () =>
    wrap((value, path) => {
      if (typeof value !== 'string') throw new Issue(path, 'Phải là chuỗi');
      const s = value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) || s.length > 120) throw new Issue(path, 'Email không hợp lệ');
      return s;
    }),
  phone: () =>
    wrap((value, path) => {
      if (typeof value !== 'string' && typeof value !== 'number') throw new Issue(path, 'Phải là chuỗi');
      const s = String(value).replace(/[\s.-]/g, '');
      if (!/^(\+84|0)\d{9,10}$/.test(s)) throw new Issue(path, 'Số điện thoại không hợp lệ');
      return s;
    }),
  password: () =>
    wrap((value, path) => {
      if (typeof value !== 'string') throw new Issue(path, 'Phải là chuỗi');
      if (value.length < 8 || value.length > 72) throw new Issue(path, 'Mật khẩu dài 8–72 ký tự');
      if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) throw new Issue(path, 'Mật khẩu phải có cả chữ và số');
      return value;
    }),
  int: ({ min = -Infinity, max = Infinity } = {}) =>
    wrap((value, path) => {
      const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
      if (typeof n !== 'number' || !Number.isInteger(n)) throw new Issue(path, 'Phải là số nguyên');
      if (n < min) throw new Issue(path, `Phải lớn hơn hoặc bằng ${min}`);
      if (n > max) throw new Issue(path, `Phải nhỏ hơn hoặc bằng ${max}`);
      return n;
    }),
  bool: () =>
    wrap((value, path) => {
      if (value === true || value === 'true') return true;
      if (value === false || value === 'false') return false;
      throw new Issue(path, 'Phải là true/false');
    }),
  enum: (values) =>
    wrap((value, path) => {
      if (!values.includes(value)) throw new Issue(path, `Chỉ nhận: ${values.join(', ')}`);
      return value;
    }),
  id: () =>
    wrap((value, path) => {
      if (typeof value !== 'string' || value.length !== 24 || !mongoose.isValidObjectId(value))
        throw new Issue(path, 'ID không hợp lệ');
      return value;
    }),
  date: () =>
    wrap((value, path) => {
      if (typeof value !== 'string' && !(value instanceof Date)) throw new Issue(path, 'Phải là ngày ISO 8601');
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) throw new Issue(path, 'Ngày không hợp lệ');
      return d;
    }),
  url: () =>
    wrap((value, path) => {
      if (typeof value !== 'string') throw new Issue(path, 'Phải là chuỗi');
      const s = value.trim();
      if (!/^(https?:\/\/|\/uploads\/)\S+$/.test(s) || s.length > 1000) throw new Issue(path, 'URL ảnh không hợp lệ');
      return s;
    }),
  array: (item, { min = 0, max = 100 } = {}) =>
    wrap((value, path) => {
      if (!Array.isArray(value)) throw new Issue(path, 'Phải là danh sách');
      if (value.length < min) throw new Issue(path, `Cần ít nhất ${min} phần tử`);
      if (value.length > max) throw new Issue(path, `Tối đa ${max} phần tử`);
      return value.map((x, i) => item(x, `${path}[${i}]`));
    }),
  object: (shape) =>
    wrap((value, path) => {
      if (typeof value !== 'object' || Array.isArray(value)) throw new Issue(path, 'Phải là object');
      return runShape(shape, value, path);
    }),
};

function runShape(shape, input, prefix = '') {
  const out = {};
  const issues = [];
  for (const [key, rule] of Object.entries(shape)) {
    const path = prefix ? `${prefix}.${key}` : key;
    try {
      const val = rule(input?.[key], path);
      if (val !== undefined) out[key] = val;
    } catch (e) {
      if (e instanceof Issue) issues.push({ field: e.field, message: e.message });
      else if (Array.isArray(e.details)) issues.push(...e.details);
      else throw e;
    }
  }
  if (issues.length) throw Errors.validation(issues);
  return out;
}

/** Kiểm tra input theo shape; trả object đã chuẩn hóa hoặc ném 400 VALIDATION_ERROR. */
export function parse(shape, input) {
  return runShape(shape, input && typeof input === 'object' ? input : {});
}

export function pageParams(query, { defLimit = 12, maxLimit = 50 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function paged(data, total, { page, limit }) {
  return { data, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/** ID sai định dạng được coi như không tồn tại (404), tránh lộ lỗi CastError. */
export function assertId(id, message) {
  if (typeof id !== 'string' || id.length !== 24 || !mongoose.isValidObjectId(id)) throw Errors.notFound(message);
  return id;
}

/** Lấy giá trị chuỗi đơn từ query (chặn ?q[$ne]=x hoặc ?q=a&q=b). */
export function qstr(value, max = 100) {
  if (typeof value !== 'string') return undefined;
  const s = value.trim();
  return s ? s.slice(0, max) : undefined;
}
