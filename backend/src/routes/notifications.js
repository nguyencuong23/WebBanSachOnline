/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: notifications.js
 * Mục đích của file: Quản lý các endpoint liên quan đến thông báo (notifications) của người dùng.
 * Các chức năng chính: Lấy danh sách thông báo, đánh dấu một thông báo đã đọc, đánh dấu tất cả đã đọc.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Notifications API Route
 * Mục đích của module: Xử lý logic lấy và cập nhật trạng thái thông báo từ client.
 * Phạm vi xử lý: Yêu cầu đăng nhập. Thao tác trên bảng notifications dựa vào user_id.
 * Các thành phần chính trong module: Express Router, Supabase query.
 * Module liên quan: auth/verify.js (Xác thực user), supabase.js (DB client).
 * ============================================================================
 */
import { Router } from "express";
import { requireUser } from "../auth/verify.js";
import { createSupabaseUser } from "../supabase.js";

export const notificationsRouter = Router(); // Ý nghĩa: Router chứa các endpoint quản lý thông báo; Giá trị: Express Router instance

/**
 * Tên function: GET /notifications
 * Mục đích của function: Lấy danh sách 50 thông báo mới nhất của người dùng hiện tại.
 * Tham số đầu vào: req, res
 * Giá trị trả về: JSON `{ items: Array }`
 * Điều kiện xử lý: Yêu cầu đăng nhập. Lọc theo `user_id`.
 * Lỗi có thể phát sinh: Lỗi 500 nếu Supabase query thất bại.
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
 * Tên function: PATCH /notifications/:id/read
 * Mục đích của function: Đánh dấu một thông báo cụ thể là "đã đọc".
 * Tham số đầu vào: req (params: `id`), res
 * Giá trị trả về: JSON `{ item: Object }`
 * Điều kiện xử lý: Cập nhật trường `is_read` = true. Kiểm tra `user_id` để đảm bảo quyền.
 * Lỗi có thể phát sinh: Lỗi 500 nếu thao tác DB thất bại.
 */
notificationsRouter.patch("/notifications/:id/read", requireUser, async (req, res) => {
  const supabase = createSupabaseUser(req.auth.jwt);
  const { id } = req.params;

  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", req.profile.user_id)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);

  res.json({ item: data });
});

/**
 * Tên function: POST /notifications/read-all
 * Mục đích của function: Đánh dấu tất cả thông báo chưa đọc của user thành "đã đọc".
 * Tham số đầu vào: req, res
 * Giá trị trả về: JSON `{ ok: true }`
 * Điều kiện xử lý: Cập nhật toàn bộ row có `is_read` = false của user hiện tại.
 * Lỗi có thể phát sinh: Lỗi 500 nếu update thất bại.
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
