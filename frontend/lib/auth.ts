/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      auth.ts
 * Mục đích:      Định nghĩa kiểu dữ liệu Profile và cung cấp hàm tiện ích
 *                để lấy thông tin profile của người dùng đang đăng nhập.
 * Các chức năng chính:
 *   - Profile    : Interface mô tả cấu trúc dữ liệu profile người dùng
 *   - getProfile : Lấy profile từ API /me nếu có phiên đăng nhập hợp lệ
 *
 * Tên module:    Authentication
 * Module liên quan: lib/api.ts, lib/supabase.ts, app/(site)/_hooks/useSessionProfile.ts
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { apiFetch } from "./api";
import { supabase } from "./supabase";

/**
 * @interface Profile
 * @description Cấu trúc dữ liệu profile người dùng, ánh xạ từ bảng `profiles` trong Supabase.
 *              Được dùng xuyên suốt frontend để kiểm tra quyền, hiển thị thông tin cá nhân.
 */
export interface Profile {
  /** UUID của người dùng, khớp với auth.users.id trong Supabase */
  user_id: string;
  username: string;
  full_name: string;
  email?: string;
  phone_number?: string;
  /** Tên file ảnh đại diện trong Supabase Storage bucket "avatars" */
  avatar_url?: string;
  default_address?: string;
  /** Vai trò: "admin" có toàn quyền, "user" chỉ truy cập tính năng thông thường */
  role: 'admin' | 'user';
  /** Điểm tích lũy của khách hàng */
  loyalty_points: number;
  /** false = tài khoản bị khóa, không thể đăng nhập */
  is_active: boolean;
  /** Ghi chú nội bộ của admin về khách hàng này */
  customer_note?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Lấy thông tin profile của người dùng đang đăng nhập.
 * Kiểm tra phiên đăng nhập trước — trả về null ngay nếu chưa đăng nhập
 * để tránh gọi API không cần thiết.
 *
 * @async
 * @returns {Promise<Profile | null>} Profile của user hiện tại, hoặc null nếu chưa đăng nhập.
 */
export async function getProfile(): Promise<Profile | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  const res = await apiFetch<{ profile: Profile | null }>("/me");
  return res.profile;
}
