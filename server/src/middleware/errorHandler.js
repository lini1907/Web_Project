import mongoose from 'mongoose';
import multer from 'multer';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export function notFoundApi(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', `Không có endpoint ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let error = err;

  if (err instanceof mongoose.Error.CastError) error = new AppError(404, 'NOT_FOUND', 'Không tìm thấy dữ liệu');
  else if (err instanceof mongoose.Error.ValidationError) {
    error = new AppError(
      400,
      'VALIDATION_ERROR',
      'Dữ liệu không hợp lệ',
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    );
  } else if (err?.code === 11000) {
    error = new AppError(409, 'DUPLICATE', 'Dữ liệu đã tồn tại', Object.keys(err.keyValue || {}).map((f) => ({ field: f })));
  } else if (err instanceof multer.MulterError) {
    error = new AppError(400, 'VALIDATION_ERROR', err.code === 'LIMIT_FILE_SIZE' ? 'Ảnh tối đa 2 MB' : err.message);
  } else if (err?.type === 'entity.parse.failed') {
    error = new AppError(400, 'VALIDATION_ERROR', 'JSON không hợp lệ');
  } else if (err?.type === 'entity.too.large') {
    error = new AppError(413, 'PAYLOAD_TOO_LARGE', 'Dữ liệu gửi lên quá lớn');
  }

  if (!(error instanceof AppError)) {
    if (!env.isTest) console.error('[ERROR]', req.method, req.originalUrl, err);
    error = new AppError(500, 'INTERNAL_ERROR', 'Đã có lỗi xảy ra, vui lòng thử lại sau');
  }

  const body = { error: { code: error.code, message: error.message } };
  if (error.details !== undefined) body.error.details = error.details;
  res.status(error.status).json(body);
}
