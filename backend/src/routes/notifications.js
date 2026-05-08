/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      notifications.js
 * Mục đích:      Định tuyến các API quản lý thông báo của người dùng đã đăng nhập.
 *                Thông báo được tạo tự động bởi hệ thống (ví dụ: khi đơn hàng
 *                thay đổi trạng thái) và người dùng có thể đánh dấu đã đọc.
 * Các chức năng chính:
 *   - GET   /notifications          : Lấy 50 thông báo mới nhất của user
 *   - PATCH /notifications/:id/read : Đánh dấu một thông báo là đã đọc
 *   - POST  /notifications/read-all : Đánh dấu tất cả thông báo là đã đọc
 *
 * Tên module:    Notification Management
 * Module liên quan: supabase.js, auth/verify.js, routes/admin.js (tạo thông báo)
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       Tất cả các route đều yêu cầu xác thực (requireUser).
 * ============================================================================
 */

import { Router } from "express";
import { requireUser } from "../auth/verify.js";
import { createSupabaseUser } from "../supabase.js";

export const notificationsRouter = Router();

/**
 * Lấy danh sách 50 thông báo mới nhất của người dùng hiện tại.
 * Sắp xếp theo thời gian tạo mới nhất trước.
 *
 * @route   GET /notifications
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Request object, chứa `req.profile.user_id`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ items: Notification[] }`.
 * @throws {Error} Ném lỗi nếu truy vấn database thất bại.
 */
notificationsRouter.get("/notifications", requireUser, async (req, res) => {
  const supabase = createSupabaseUser(req.auth.jwt);
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", req.profile.user_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  res.json({ items: data || [] });
});

/**
 * Đánh dấu một thông báo cụ thể là đã đọc.
 * Chỉ cập nhật thông báo thuộc về người dùng hiện tại (bảo vệ quyền sở hữu).
 *
 * @route   PATCH /notifications/:id/read
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Route param: `id` (notification ID).
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ item: Notification }` với trạng thái đã cập nhật.
 * @throws {Error} Ném lỗi nếu truy vấn database thất bại.
 */
notificationsRouter.patch("/notifications/:id/read", requireUser, async (req, res) => {
  const supabase = createSupabaseUser(req.auth.jwt);
  const { id } = req.params;

  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    // Điều kiện user_id đảm bảo user không thể đánh dấu thông báo của người khác
    .eq("user_id", req.profile.user_id)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);

  res.json({ item: data });
});

/**
 * Đánh dấu tất cả thông báo chưa đọc của người dùng là đã đọc.
 * Chỉ cập nhật các thông báo có is_read = false để tránh query không cần thiết.
 *
 * @route   POST /notifications/read-all
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Request object, chứa `req.profile.user_id`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ ok: true }`.
 * @throws {Error} Ném lỗi nếu truy vấn database thất bại.
 */
notificationsRouter.post("/notifications/read-all", requireUser, async (req, res) => {
  const supabase = createSupabaseUser(req.auth.jwt);

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", req.profile.user_id)
    .eq("is_read", false);

  if (error) throw new Error(error.message);

  res.json({ ok: true });
});
