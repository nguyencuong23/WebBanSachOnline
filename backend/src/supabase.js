/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      supabase.js
 * Mục đích:      Cung cấp các factory function để tạo Supabase client
 *                với các mức quyền khác nhau tùy theo ngữ cảnh sử dụng.
 * Các chức năng chính:
 *   - createSupabaseAdmin  : Client với Service Role Key — bỏ qua RLS, dùng cho tác vụ admin
 *   - createSupabaseAnon   : Client với Anon Key — tuân theo RLS, dùng cho dữ liệu công khai
 *   - createSupabaseUser   : Client với JWT của user — tuân theo RLS với quyền của user đó
 *
 * Tên module:    Database Client
 * Module liên quan: env.js, auth/verify.js, tất cả các file trong routes/
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       persistSession và autoRefreshToken đều tắt vì đây là môi trường
 *                server-side — không cần lưu session hay tự refresh token.
 * ============================================================================
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

/**
 * Tạo Supabase client với quyền Service Role (admin).
 * Client này bỏ qua hoàn toàn Row Level Security (RLS),
 * dùng cho các tác vụ quản trị như tạo/xóa user, đọc dữ liệu nhạy cảm.
 *
 * @returns {import("@supabase/supabase-js").SupabaseClient} Supabase admin client.
 */
export function createSupabaseAdmin() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

/**
 * Tạo Supabase client với quyền Anonymous (khách).
 * Client này tuân theo RLS với quyền của người dùng chưa đăng nhập,
 * dùng để truy vấn dữ liệu công khai như danh sách sách, thể loại, voucher.
 *
 * @returns {import("@supabase/supabase-js").SupabaseClient} Supabase anon client.
 */
export function createSupabaseAnon() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

/**
 * Tạo Supabase client được xác thực bằng JWT của người dùng cụ thể.
 * Client này tuân theo RLS với đúng quyền của user đó,
 * đảm bảo user chỉ đọc/ghi được dữ liệu của chính mình.
 *
 * @param {string} jwt - JWT access token của người dùng, lấy từ Authorization header.
 * @returns {import("@supabase/supabase-js").SupabaseClient} Supabase user client.
 */
export function createSupabaseUser(jwt) {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
