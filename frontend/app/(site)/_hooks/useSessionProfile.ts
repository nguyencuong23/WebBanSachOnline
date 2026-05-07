/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: useSessionProfile.ts
 * Mục đích của file: Cung cấp custom hook để quản lý trạng thái xác thực và lấy thông tin user profile.
 * Các chức năng chính: Lấy email từ Supabase auth, gọi hàm lấy profile từ DB, xử lý logout.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Session Profile Hook
 * Mục đích của module: Dễ dàng tái sử dụng logic check auth ở bất kỳ Client Component nào.
 * Phạm vi xử lý: Client side.
 * Các thành phần chính trong module: useSessionProfile.
 * Module liên quan: supabase.ts, auth.ts.
 * ============================================================================
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, type Profile } from "@/lib/auth";

/**
 * Tên function: useSessionProfile
 * Mục đích của function: Lấy và đồng bộ trạng thái đăng nhập (Session) và thông tin cá nhân (Profile) của user.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Object chứa email, profile, userLabel, logout, isLoading.
 * Điều kiện xử lý: Lắng nghe sự kiện auth của supabase (onAuthStateChange).
 */
export function useSessionProfile() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setIsLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!email) {
      setProfile(null);
      return;
    }
    getProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [email, isLoading]);

  /**
   * Tên function: logout
   * Mục đích của function: Đăng xuất người dùng ra khỏi Supabase Auth và chuyển về trang Auth.
   */
  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  // Ý nghĩa: Tên hiển thị mặc định nếu không có tên thật; Giá trị: Chuỗi
  const userLabel = profile?.full_name || email || "Khách";

  return { email, profile, userLabel, logout, isLoading };
}
