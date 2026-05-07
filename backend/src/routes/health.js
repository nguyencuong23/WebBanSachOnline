/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: health.js
 * Mục đích của file: Cung cấp endpoint kiểm tra trạng thái hoạt động của server.
 * Các chức năng chính: Endpoint /health trả về status OK.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Health Check Route
 * Mục đích của module: Dùng cho các hệ thống monitor kiểm tra sức khỏe của API.
 * Phạm vi xử lý: Public (Không cần xác thực).
 * ============================================================================
 */
import express from "express";

export const healthRouter = express.Router(); // Ý nghĩa: Router chứa các endpoint kiểm tra sức khỏe hệ thống; Giá trị: Express Router instance

/**
 * Tên function: GET /health
 * Mục đích của function: Kiểm tra API server có đang hoạt động hay không.
 * Tham số đầu vào: req, res
 * Giá trị trả về: JSON `{ ok: true, service: "btllib-api" }`
 * Điều kiện xử lý: Không có.
 * Lỗi có thể phát sinh: Không có.
 */
healthRouter.get("/health", (req, res) => {
  res.json({ ok: true, service: "btllib-api" });
});

