/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      useSessionProfile.ts
 * Mục đích:      Custom hook quản lý trạng thái phiên đăng nhập và profile
 *                người dùng. Lắng nghe thay đổi auth state từ Supabase và
 *                tự động load profile khi email thay đổi.
 * Các chức năng chính:
 *   - Theo dõi email đăng nhập hiện tại
 *   - Load profile từ API khi đã có email
 *   - Hàm logout: đăng xuất và redirect về /auth
 *   - Trả về userLabel (tên hiển thị) cho header
 *
 * Tên module:    Session Profile Hook
 * Module liên quan: lib/supabase.ts, lib/auth.ts
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, type Profile } from "@/lib/auth";

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

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  const userLabel = profile?.full_name || email || "Khách";

  return { email, profile, userLabel, logout, isLoading };
}
