/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: middleware.js
 * Mục đích của file: Xử lý middleware bắt lỗi (error handler) và các trường hợp route không tồn tại (not found).
 * Các chức năng chính: Xử lý HttpError, ZodError và lỗi hệ thống (500).
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Global Middleware
 * Mục đích của module: Quản lý vòng đời request cuối cùng trong Express.
 * Phạm vi xử lý: Chạy cuối cùng trong luồng Express.
 * Các thành phần chính trong module: notFound, errorHandler.
 * Module liên quan: index.js, errors.js.
 * ============================================================================
 */
import { HttpError } from "./errors.js";
import { ZodError } from "zod";

export function notFound(req, res) {
  res.status(404).json({ error: { code: "not_found", message: "Not found" } });
}

export function errorHandler(err, req, res, next) {
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

  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({
    error: { code: "internal_error", message: "Internal server error" }
  });
}

