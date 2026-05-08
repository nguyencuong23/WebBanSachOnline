/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      supabase.ts
 * Mục đích:      Khởi tạo và export Supabase client duy nhất dùng cho toàn bộ
 *                frontend — xác thực người dùng, truy vấn database và Storage.
 * Các chức năng chính:
 *   - supabase : Supabase client singleton với cấu hình auth tối ưu cho Next.js
 *
 * Tên module:    Supabase Client
 * Module liên quan: lib/api.ts, lib/auth.ts, lib/avatar.ts, lib/bookImage.ts,
 *                   app/(site)/_components/MainSiteLayout.tsx,
 *                   app/admin/_components/AdminLayoutShell.tsx
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       detectSessionInUrl tắt để tránh reload không mong muốn khi
 *                chuyển tab. persistSession và autoRefreshToken bật để duy trì
 *                phiên đăng nhập qua các lần tải trang.
 * ============================================================================
 */

import { createClient } from "@supabase/supabase-js";

// URL và Anon Key của Supabase project, đọc từ biến môi trường Next.js
const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

/**
 * Supabase client singleton cho toàn bộ frontend.
 * Sử dụng Anon Key — tuân theo Row Level Security (RLS) của Supabase.
 * Mọi thao tác cần quyền cao hơn phải thực hiện qua backend (Service Role Key).
 */
export const supabase = createClient(url, anon, {
  auth: {
    // Tắt detectSessionInUrl để tránh reload khi chuyển tab (do Supabase lắng nghe visibilitychange)
    detectSessionInUrl: false,
    // Vẫn giữ auto refresh token nhưng không re-trigger khi tab focus lại
    persistSession: true,
    autoRefreshToken: true,
  },
});
