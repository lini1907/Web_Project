export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export const Errors = {
  validation: (details, message = 'Dữ liệu không hợp lệ') => new AppError(400, 'VALIDATION_ERROR', message, details),
  unauthenticated: () => new AppError(401, 'UNAUTHENTICATED', 'Bạn cần đăng nhập'),
  forbidden: (message = 'Bạn không có quyền thực hiện thao tác này') => new AppError(403, 'FORBIDDEN', message),
  notFound: (message = 'Không tìm thấy dữ liệu') => new AppError(404, 'NOT_FOUND', message),
  conflict: (code, message, details) => new AppError(409, code, message, details),
  invalidState: (message = 'Không thể chuyển sang trạng thái này') => new AppError(409, 'INVALID_STATE', message),
};
