/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: verify.js
 * Mục đích của file: Middleware xác thực và phân quyền.
 * Các chức năng chính: Kiểm tra JWT, lấy profile user, kiểm tra quyền Admin.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Authentication Middleware
 * Mục đích của module: Bảo vệ các API riêng tư, giới hạn quyền truy cập.
 * Phạm vi xử lý: Middleware layer.
 * Các thành phần chính trong module: requireUser, requireAdmin.
 * Module liên quan: errors.js, supabase.js, các router cần xác thực.
 * ============================================================================
 */
import { assert } from "../http/errors.js";
import { createSupabaseAdmin } from "../supabase.js";
import { createSupabaseUser } from "../supabase.js";

export async function requireUser(req, res, next) {
  const auth = req.header("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  assert(m, 401, "Missing Bearer token", "unauthorized");

  const jwt = m[1];
  const sbAdmin = createSupabaseAdmin();
  const { data, error } = await sbAdmin.auth.getUser(jwt);
  assert(!error, 401, "Invalid token", "unauthorized", error?.message);

  req.auth = { jwt, user: data.user };

  // Load profile (RLS: user can read own profile)
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

export function requireAdmin(req, res, next) {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  next();
}

