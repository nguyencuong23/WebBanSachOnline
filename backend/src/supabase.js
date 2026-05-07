/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: supabase.js
 * Mục đích của file: Khởi tạo các instance Supabase Client (Admin, Anon, User).
 * Các chức năng chính: Trả về client với quyền admin, quyền ẩn danh, hoặc quyền người dùng có JWT.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Supabase Client Factory
 * Mục đích của module: Quản lý kết nối tới Supabase Database.
 * Phạm vi xử lý: Global, cung cấp client cho các request xử lý database.
 * Các thành phần chính trong module: createSupabaseAdmin, createSupabaseAnon, createSupabaseUser.
 * Module liên quan: env.js, tất cả các API route dùng DB.
 * ============================================================================
 */
import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export function createSupabaseAdmin() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function createSupabaseAnon() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

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

