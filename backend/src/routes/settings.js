/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      settings.js
 * Mục đích:      Định tuyến các API quản lý cài đặt hệ thống — các cặp key/value
 *                cấu hình toàn cục như tên site, phí ship, logo, thông tin liên hệ.
 * Các chức năng chính:
 *   - GET /settings                        : Lấy tất cả cài đặt (công khai)
 *   - PUT /admin/settings                  : Cập nhật hàng loạt cài đặt (admin, upsert)
 *   - POST /admin/settings/upload-image    : Upload ảnh lên Storage và trả về URL (admin)
 *
 * Tên module:    System Settings
 * Module liên quan: supabase.js, auth/verify.js, http/errors.js
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       GET /settings là public vì frontend cần đọc cài đặt (logo, tên site)
 *                ngay cả khi chưa đăng nhập. Dùng admin client để đọc để bỏ qua RLS.
 * ============================================================================
 */

import express from "express";
import { requireUser, requireAdmin } from "../auth/verify.js";
import { createSupabaseAnon, createSupabaseUser, createSupabaseAdmin } from "../supabase.js";
import { assert } from "../http/errors.js";
import { z } from "zod";

export const settingsRouter = express.Router();

/**
 * Lấy tất cả cài đặt hệ thống, sắp xếp theo key.
 * Endpoint này là public để frontend có thể đọc cấu hình (logo, tên site, v.v.)
 * mà không cần đăng nhập.
 *
 * @route   GET /settings
 * @access  Public
 * @async
 * @param {import("express").Request} req - Request object.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ items: Setting[] }` — mỗi item có `key` và `value`.
 * @throws {HttpError} 400 nếu truy vấn database thất bại.
 */
settingsRouter.get("/settings", async (req, res) => {
  // Dùng admin client để đọc settings vì RLS có thể chặn anon client
  const sb = createSupabaseAdmin();
  const { data, error } = await sb.from("settings").select("*").order("key");
  assert(!error, 400, "Failed to fetch settings", "settings_fetch_failed", error?.message);
  res.json({ items: data });
});

/**
 * Cập nhật hàng loạt cài đặt hệ thống bằng upsert (chỉ admin).
 * Nếu key đã tồn tại thì cập nhật, nếu chưa thì tạo mới.
 *
 * @route   PUT /admin/settings
 * @access  Private (admin)
 * @async
 * @param {import("express").Request} req - Request body: `{ items: Array<{key: string, value: string}> }`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ items: Setting[] }` với dữ liệu đã cập nhật.
 * @throws {HttpError} 400 nếu thiếu items hoặc lỗi DB.
 */
settingsRouter.put("/admin/settings", requireUser, requireAdmin, async (req, res) => {
  const sb = createSupabaseAdmin();
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  assert(items.length > 0, 400, "Missing items", "invalid_request");

  // Chuẩn hóa payload: ép kiểu về string và thêm updated_at
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
 * Upload ảnh lên Supabase Storage bucket "web-images" và trả về URL công khai.
 * Dùng để cập nhật logo, favicon hoặc các ảnh cài đặt khác.
 *
 * @route   POST /admin/settings/upload-image
 * @access  Private (admin)
 * @async
 * @param {import("express").Request} req - Request body:
 *   @param {string} req.body.base64       - Chuỗi Base64 của ảnh (có thể kèm Data URL prefix).
 *   @param {string} req.body.contentType  - MIME type của ảnh (ví dụ: "image/png").
 *   @param {string} req.body.key          - Key cài đặt liên quan (dùng để đặt tên file).
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ url: string }` — URL công khai của ảnh vừa upload.
 * @throws {HttpError} 400 nếu thiếu dữ liệu hoặc lỗi upload.
 */
settingsRouter.post("/admin/settings/upload-image", requireUser, requireAdmin, async (req, res) => {
  const schema = z.object({
    base64: z.string().min(1, "Thiếu dữ liệu ảnh"),
    contentType: z.string().min(1, "Thiếu định dạng ảnh"),
    key: z.string().min(1, "Thiếu key cài đặt")
  });
  const body = schema.parse(req.body ?? {});

  const sb = createSupabaseAdmin();
  // Xóa Data URL prefix nếu có (ví dụ: "data:image/png;base64,")
  const base64Data = body.base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const ext = body.contentType.split("/")[1] || "jpg";
  // Đặt tên file theo key + timestamp để tránh cache cũ
  const fileName = `${body.key}_${Date.now()}.${ext}`;

  const { error } = await sb.storage
    .from("web-images")
    .upload(fileName, buffer, { contentType: body.contentType, upsert: true });

  assert(!error, 400, "Lỗi upload ảnh", "upload_failed", error?.message);

  const { data: publicUrlData } = sb.storage.from("web-images").getPublicUrl(fileName);
  res.json({ url: publicUrlData.publicUrl });
});
