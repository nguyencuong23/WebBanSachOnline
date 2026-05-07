/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: errors.js
 * Mục đích của file: Xử lý lỗi tuỳ chỉnh và helper hàm assert.
 * Các chức năng chính: Định nghĩa HttpError, hàm assert văng lỗi nhanh gọn.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: HTTP Error Utils
 * Mục đích của module: Chuẩn hóa phản hồi lỗi cho API.
 * Phạm vi xử lý: Global error throwing.
 * Các thành phần chính trong module: HttpError, assert.
 * Module liên quan: middleware.js (Error Handler).
 * ============================================================================
 */
export class HttpError extends Error {
  constructor(status, message, code = "error", details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function assert(condition, status, message, code, details) {
  if (!condition) throw new HttpError(status, message, code, details);
}

