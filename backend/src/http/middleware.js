/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      middleware.js
 * Mục đích:      Cung cấp các middleware xử lý lỗi toàn cục cho Express app.
 *                Đảm bảo mọi lỗi đều được trả về dưới dạng JSON có cấu trúc
 *                nhất quán thay vì HTML mặc định của Express.
 * Các chức năng chính:
 *   - notFound     : Xử lý các route không tồn tại (404)
 *   - errorHandler : Xử lý tất cả các lỗi được ném ra trong ứng dụng
 *                    (HttpError, ZodError, lỗi không xác định)
 *
 * Tên module:    HTTP Middleware
 * Module liên quan: http/errors.js, index.js
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { HttpError } from "./errors.js";
import { ZodError } from "zod";

/**
 * Middleware xử lý route không tồn tại (404 Not Found).
 * Phải được đăng ký SAU tất cả các router trong index.js.
 *
 * @param {import("express").Request} req - Request object.
 * @param {import("express").Response} res - Response object.
 * @returns {void} Trả về JSON `{ error: { code, message } }` với status 404.
 */
export function notFound(req, res) {
  res.status(404).json({ error: { code: "not_found", message: "Not found" } });
}

/**
 * Middleware xử lý lỗi toàn cục của Express (error-handling middleware).
 * Phân loại và xử lý 3 loại lỗi chính:
 *   1. HttpError  : Lỗi có cấu trúc từ ứng dụng — trả về status và message tương ứng.
 *   2. ZodError   : Lỗi validation từ Zod — trả về 400 với danh sách lỗi.
 *   3. Lỗi khác   : Lỗi không xác định — trả về 500 Internal Server Error.
 *
 * @param {Error} err - Lỗi được ném ra từ route handler hoặc middleware.
 * @param {import("express").Request} req - Request object.
 * @param {import("express").Response} res - Response object.
 * @param {import("express").NextFunction} next - Hàm next (bắt buộc có để Express nhận diện đây là error handler).
 * @returns {void}
 */
export function errorHandler(err, req, res, next) {
  // Nếu response đã được gửi một phần, chuyển lỗi cho Express xử lý mặc định
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    console.error(`[HTTP ${err.status}] ${req.method} ${req.path} →`, err.message, err.details ?? "");
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
    return;
  }

  // Lỗi validation từ Zod — gộp tất cả message thành một chuỗi
  if (err instanceof ZodError) {
    const messages = err.errors.map(e => e.message).join(", ");
    res.status(400).json({
      error: {
        code: "validation_error",
        message: messages,
        details: err.errors
      }
    });
    return;
  }

  // Lỗi không xác định — log đầy đủ để debug, trả về 500 cho client
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({
    error: { code: "internal_error", message: "Internal server error" }
  });
}
