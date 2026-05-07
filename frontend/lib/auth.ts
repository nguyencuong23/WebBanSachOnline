/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: auth.ts
 * Mục đích của file: Cung cấp tiện ích liên quan đến xác thực người dùng.
 * Các chức năng chính: Định nghĩa kiểu Profile, hàm lấy Profile hiện tại từ API.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Auth Utils
 * Mục đích của module: Quản lý thông tin user đang đăng nhập.
 * Phạm vi xử lý: Client-side.
 * Các thành phần chính trong module: getProfile, Profile interface.
 * Module liên quan: api.ts, supabase.ts.
 * ============================================================================
 */
import { apiFetch } from "./api";
import { supabase } from "./supabase";

/**
 * Tên class/interface: Profile
 * Mục đích của class/interface: Kiểu dữ liệu chứa thông tin chi tiết của người dùng.
 */
export interface Profile {
  user_id: string;
  username: string;
  full_name: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
  default_address?: string;
  role: 'admin' | 'user';
  loyalty_points: number;
  is_active: boolean;
  customer_note?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Tên function: getProfile
 * Mục đích của function: Lấy profile của người dùng hiện tại từ backend API, chỉ gọi nếu có Supabase session.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Đối tượng Profile hoặc null.
 */
export async function getProfile(): Promise<Profile | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  const res = await apiFetch<{ profile: Profile | null }>("/me");
  return res.profile;
}
