/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: avatar.ts
 * Mục đích của file: Quản lý đường dẫn ảnh đại diện của user.
 * Các chức năng chính: Xử lý và format URL hiển thị avatar từ Supabase Storage.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Avatar Utils
 * Mục đích của module: Tiện ích xử lý URL hình ảnh cá nhân.
 * Phạm vi xử lý: Client & Server.
 * Các thành phần chính trong module: getAvatarUrl.
 * Module liên quan: supabase.ts.
 * ============================================================================
 */
import { supabase } from "./supabase";

/**
 * Tên function: getAvatarUrl
 * Mục đích của function: Lấy URL đầy đủ cho ảnh đại diện.
 * Điều kiện xử lý: 
 * - Nếu avatarUrl đã là một URL đầy đủ (http/https/data:), trả về chính nó.
 * - Nếu là tên file, lấy URL từ bucket 'avatars'.
 * Tham số đầu vào: avatarUrl (chuỗi tên file hoặc url đầy đủ).
 * Giá trị trả về: Chuỗi URL public.
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
