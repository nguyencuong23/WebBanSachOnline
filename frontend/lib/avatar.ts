/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      avatar.ts
 * Mục đích:      Cung cấp hàm tiện ích để chuyển đổi tên file ảnh đại diện
 *                thành URL công khai đầy đủ từ Supabase Storage.
 * Các chức năng chính:
 *   - getAvatarUrl : Tạo URL công khai cho ảnh đại diện từ tên file hoặc URL sẵn có
 *
 * Tên module:    Avatar Utilities
 * Module liên quan: lib/supabase.ts, app/admin/_components/AdminLayoutShell.tsx,
 *                   app/admin/users/UsersAdmin.tsx, app/(site)/profile/ProfilePage.tsx
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       Thêm timestamp vào URL để buộc trình duyệt tải lại ảnh mới
 *                khi người dùng đổi ảnh đại diện (tránh cache cũ).
 * ============================================================================
 */

import { supabase } from "./supabase";

/**
 * Lấy URL đầy đủ cho ảnh đại diện.
 * Nếu avatarUrl đã là một URL đầy đủ (http/https/data:), trả về chính nó.
 * Nếu là tên file, lấy URL từ bucket 'avatars'.
 *
 * @param {string | null | undefined} avatarUrl - Tên file ảnh (ví dụ: "uuid.png")
 *                                                hoặc URL đầy đủ hoặc chuỗi Base64.
 * @returns {string} URL công khai đầy đủ của ảnh đại diện, hoặc chuỗi rỗng nếu không có.
 */
export function getAvatarUrl(avatarUrl: string | null | undefined): string {
  if (!avatarUrl) return "";

  // Nếu là base64 thì trả về luôn
  if (avatarUrl.startsWith("data:")) return avatarUrl;

  // Trích xuất tên file (loại bỏ mọi đường dẫn nếu có)
  const fileName = avatarUrl.split("/").pop() || avatarUrl;

  // Lấy URL gốc của Supabase từ biến môi trường
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  
  if (!supabaseUrl) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL");
    return fileName;
  }

  // Loại bỏ dấu gạch chéo cuối cùng nếu có để tránh double slash //
  supabaseUrl = supabaseUrl.replace(/\/$/, "");

  // Tạo URL trực tiếp theo chuẩn Supabase Storage Public URL
  // Thêm timestamp để tránh cache trình duyệt khi đổi ảnh cùng tên file
  const timestamp = new Date().getTime();
  return `${supabaseUrl}/storage/v1/object/public/avatars/${fileName}?t=${timestamp}`;
}
