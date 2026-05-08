/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      health.js
 * Mục đích:      Cung cấp endpoint kiểm tra trạng thái hoạt động của API server.
 *                Thường được dùng bởi load balancer, Docker health check,
 *                hoặc monitoring tool để xác nhận service còn sống.
 * Các chức năng chính:
 *   - GET /health : Trả về trạng thái OK của service
 *
 * Tên module:    Health Check
 * Module liên quan: index.js
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import express from "express";

export const healthRouter = express.Router();

/**
 * Kiểm tra trạng thái hoạt động của API server.
 *
 * @route   GET /health
 * @access  Public
 * @param {import("express").Request} req - Request object.
 * @param {import("express").Response} res - Response object.
 * @returns {void} JSON `{ ok: true, service: "btllib-api" }`.
 */
healthRouter.get("/health", (req, res) => {
  res.json({ ok: true, service: "btllib-api" });
});
