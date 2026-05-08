/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      verify.js
 * Mục đích:      Cung cấp các middleware xác thực và phân quyền cho Express.
 *                Kiểm tra JWT trong Authorization header, load profile người dùng
 *                và gắn vào request object để các route handler sử dụng.
 * Các chức năng chính:
 *   - requireUser  : Middleware xác thực JWT, gắn req.auth và req.profile
 *   - requireAdmin : Middleware kiểm tra quyền admin (dùng sau requireUser)
 *
 * Tên module:    Authentication & Authorization
 * Module liên quan: supabase.js, http/errors.js
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { assert } from "../http/errors.js";
import { createSupabaseAdmin } from "../supabase.js";
import { createSupabaseUser } from "../supabase.js";

/**
 * Middleware xác thực người dùng qua Bearer JWT token.
 * Sau khi xác thực thành công, gắn thêm vào request:
 *   - `req.auth.jwt`  : JWT token gốc
 *   - `req.auth.user` : Object user từ Supabase Auth
 *   - `req.profile`   : Object profile từ bảng `profiles` (hoặc null)
 *
 * @async
 * @param {import("express").Request} req - Request object.
 * @param {import("express").Response} res - Response object.
 * @param {import("express").NextFunction} next - Hàm next để chuyển sang middleware tiếp theo.
 * @returns {Promise<void>}
 * @throws {HttpError} 401 nếu thiếu token hoặc token không hợp lệ.
 * @throws {HttpError} 500 nếu không thể load profile từ database.
 */
export async function requireUser(req, res, next) {
  const auth = req.header("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  assert(m, 401, "Missing Bearer token", "unauthorized");

  const jwt = m[1];
  const sbAdmin = createSupabaseAdmin();

  // Xác minh JWT với Supabase Auth — dùng admin client để bỏ qua RLS
  const { data, error } = await sbAdmin.auth.getUser(jwt);
  assert(!error, 401, "Invalid token", "unauthorized", error?.message);

  req.auth = { jwt, user: data.user };

  // Load profile từ bảng profiles — dùng user client để RLS kiểm tra quyền đọc
  const sbUser = createSupabaseUser(jwt);
  const { data: profile, error: pErr } = await sbUser
    .from("profiles")
    .select("*")
    .eq("user_id", data.user.id)
    .maybeSingle();
  assert(!pErr, 500, "Failed to load profile", "profile_load_failed", pErr?.message);
  req.profile = profile || null;

  next();
}

/**
 * Middleware kiểm tra quyền admin.
 * Phải được dùng SAU `requireUser` vì cần `req.profile` đã được gắn sẵn.
 *
 * @param {import("express").Request} req - Request object, cần có `req.profile.role`.
 * @param {import("express").Response} res - Response object.
 * @param {import("express").NextFunction} next - Hàm next để chuyển sang middleware tiếp theo.
 * @returns {void}
 * @throws {HttpError} 403 nếu người dùng không có role "admin".
 */
export function requireAdmin(req, res, next) {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  next();
}
