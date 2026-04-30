import { supabase } from "./supabase";

/**
 * Lấy URL đầy đủ cho ảnh đại diện.
 * Nếu avatarUrl đã là một URL đầy đủ (http/https/data:), trả về chính nó.
 * Nếu là tên file, lấy URL từ bucket 'avatars'.
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
