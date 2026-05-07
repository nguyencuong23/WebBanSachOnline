/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: settings.js
 * Mục đích của file: Quản lý các cấu hình (settings) của hệ thống/cửa hàng.
 * Các chức năng chính: Lấy danh sách cấu hình (Public), cập nhật cấu hình, upload ảnh logo/banner (Admin).
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Settings API Route
 * Mục đích của module: API cho các thông số cài đặt web hiển thị phía Client.
 * Phạm vi xử lý: Đọc setting không cần xác thực. Ghi setting yêu cầu quyền Admin.
 * Các thành phần chính trong module: Express Router, Zod validation, Supabase Storage/DB.
 * Module liên quan: auth/verify.js, supabase.js.
 * ============================================================================
 */
import express from "express";
import { requireUser, requireAdmin } from "../auth/verify.js";
import { createSupabaseAnon, createSupabaseUser, createSupabaseAdmin } from "../supabase.js";
import { assert } from "../http/errors.js";
import { z } from "zod";

export const settingsRouter = express.Router(); // Ý nghĩa: Router chứa các endpoint quản lý settings; Giá trị: Express Router instance

/**
 * Tên function: GET /settings
 * Mục đích của function: Lấy danh sách toàn bộ các cấu hình hệ thống (Public).
 * Tham số đầu vào: req, res
 * Giá trị trả về: JSON `{ items: Array }`
 * Điều kiện xử lý: Bypass RLS bằng Admin Client vì settings là công khai.
 * Lỗi có thể phát sinh: 400 nếu lỗi fetch từ DB.
 */
settingsRouter.get("/settings", async (req, res) => {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb.from("settings").select("*").order("key");
  assert(!error, 400, "Failed to fetch settings", "settings_fetch_failed", error?.message);
  res.json({ items: data });
});

/**
 * Tên function: PUT /admin/settings
 * Mục đích của function: Cập nhật một hoặc nhiều cấu hình hệ thống.
 * Tham số đầu vào: req (body: `items`), res
 * Giá trị trả về: JSON `{ items: Array }`
 * Điều kiện xử lý: Yêu cầu quyền admin. Sử dụng lệnh upsert.
 * Lỗi có thể phát sinh: 403 (Không có quyền), 400 (Thiếu dữ liệu, lỗi update).
 */
settingsRouter.put("/admin/settings", requireUser, requireAdmin, async (req, res) => {
  const sb = createSupabaseAdmin();
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  assert(items.length > 0, 400, "Missing items", "invalid_request");

  const payload = items.map((x) => ({
    key: String(x.key),
    value: String(x.value),
    updated_at: new Date().toISOString()
  }));

  const { data, error } = await sb.from("settings").upsert(payload).select("*");
  assert(!error, 400, "Failed to update settings", "settings_update_failed", error?.message);
  res.json({ items: data });
});

/**
 * Tên function: POST /admin/settings/upload-image
 * Mục đích của function: Tải lên hình ảnh dùng cho các cấu hình (như Logo, Banner).
 * Tham số đầu vào: req (body: `base64`, `contentType`, `key`), res
 * Giá trị trả về: JSON `{ url: string }`
 * Điều kiện xử lý: Decode base64, lưu vào bucket 'web-images', cấp quyền public URL. Yêu cầu admin.
 * Lỗi có thể phát sinh: 400 (Lỗi định dạng, lỗi upload), 403 (Không có quyền).
 */
settingsRouter.post("/admin/settings/upload-image", requireUser, requireAdmin, async (req, res) => {
  const schema = z.object({
    base64: z.string().min(1, "Thiếu dữ liệu ảnh"),
    contentType: z.string().min(1, "Thiếu định dạng ảnh"),
    key: z.string().min(1, "Thiếu key cài đặt")
  });
  const body = schema.parse(req.body ?? {});

  const sb = createSupabaseAdmin();
  const base64Data = body.base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const ext = body.contentType.split("/")[1] || "jpg";
  const fileName = `${body.key}_${Date.now()}.${ext}`;

  const { error } = await sb.storage
    .from("web-images")
    .upload(fileName, buffer, { contentType: body.contentType, upsert: true });

  assert(!error, 400, "Lỗi upload ảnh", "upload_failed", error?.message);

  const { data: publicUrlData } = sb.storage.from("web-images").getPublicUrl(fileName);
  res.json({ url: publicUrlData.publicUrl });
});

