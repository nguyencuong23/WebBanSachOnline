/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: supabase.ts
 * Mục đích của file: Khởi tạo Supabase client sử dụng thư viện `@supabase/supabase-js`.
 * Các chức năng chính: Xuất (export) đối tượng client Supabase kết nối tới database với cấu hình Auth phù hợp.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Supabase Client
 * Mục đích của module: Cung cấp client chung để tương tác trực tiếp với Supabase (Auth, Storage).
 * Phạm vi xử lý: Client-side.
 * Các thành phần chính trong module: supabase.
 * Module liên quan: api.ts, auth.ts.
 * ============================================================================
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anon, {
  auth: {
    // Tắt detectSessionInUrl để tránh reload khi chuyển tab (do Supabase lắng nghe visibilitychange)
    detectSessionInUrl: false,
    // Vẫn giữ auto refresh token nhưng không re-trigger khi tab focus lại
    persistSession: true,
    autoRefreshToken: true,
  },
});
