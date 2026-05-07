/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: GlobalAuthLockGuard.tsx
 * Mục đích của file: Chặn người dùng nếu họ bị khóa tài khoản hoặc đang trong chế độ bảo trì. Đồng bộ title và favicon từ cài đặt.
 * Các chức năng chính: Fetch profile user, kiểm tra MaintenanceMode, khóa truy cập bằng UI tràn màn hình.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Global Security Guard
 * Mục đích của module: Middleware phía Client ngăn chặn người dùng bị ban hoặc hệ thống bảo trì.
 * Phạm vi xử lý: Client Component, bọc RootLayout.
 * Các thành phần chính trong module: GlobalAuthLockGuard, GlobalAuthLockGuardInner.
 * Module liên quan: supabase.ts, auth.ts, useSiteSettings.ts.
 * ============================================================================
 */
"use client";

import { useEffect, useRef, useState, type ReactNode, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, type Profile } from "@/lib/auth";
import { useSiteSettings } from "../_hooks/useSiteSettings";

// Ý nghĩa: Khóa truy cập bỏ qua chế độ bảo trì; Giá trị: Chuỗi từ biến môi trường
const BYPASS_KEY = process.env.NEXT_PUBLIC_MAINTENANCE_BYPASS_KEY ?? "";

/**
 * Tên function: GlobalAuthLockGuardInner
 * Mục đích của function: Xử lý logic load auth, load settings và redirect maintenance.
 * Tham số đầu vào: children (ReactNode)
 * Giá trị trả về: JSX Element hoặc UI Loading / Bị Khóa.
 */
function GlobalAuthLockGuardInner({ children }: { children: ReactNode }) {
  const { settings, isLoading: isSettingsLoading } = useSiteSettings();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Dùng ref để tránh set spinner khi auth change sau lần đầu
  const initialLoadDone = useRef(false);

  // Đồng bộ title
  useEffect(() => {
    if (settings["SiteTitle"]) document.title = settings["SiteTitle"];
  }, [settings["SiteTitle"], pathname]);

  // Đồng bộ favicon
  useEffect(() => {
    if (!settings["FaviconUrl"]) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = `${settings["FaviconUrl"]}?t=${Date.now()}`;
  }, [settings["FaviconUrl"], pathname]);

  // Load session + profile
  useEffect(() => {
    async function load(isFromAuthChange = false) {
      // Chỉ show spinner lần đầu, không show lại khi auth event fire
      if (!isFromAuthChange) setIsSessionLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const p = await getProfile();
          setProfile(p);
        } else {
          setProfile(null);
        }
      } catch {
        setProfile(null);
      } finally {
        if (!isFromAuthChange) {
          setIsSessionLoading(false);
          initialLoadDone.current = true;
        } else if (!initialLoadDone.current) {
          // Auth change xảy ra trước initial load xong (hiếm) → vẫn tắt spinner
          setIsSessionLoading(false);
          initialLoadDone.current = true;
        }
      }
    }

    // Lần đầu load
    load(false);

    // Lắng nghe auth change — chỉ update profile, không show spinner
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!initialLoadDone.current) return; // bỏ qua nếu initial load chưa xong
      if (session) {
        getProfile().then(setProfile).catch(() => setProfile(null));
      } else {
        setProfile(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // ── MAINTENANCE REDIRECT ──────────────────────────────────────────────────
  useEffect(() => {
    if (isSettingsLoading || isSessionLoading) return;

    const isMaintenance = settings["MaintenanceMode"] === "true";
    const isAdmin = profile?.role === "admin";
    const hasValidBypass = pathname === "/auth" && searchParams.get("bypass") === BYPASS_KEY;

    if (isMaintenance) {
      if (pathname.startsWith("/admin")) return;
      if (hasValidBypass) return;
      if (isAdmin) { router.replace("/admin"); return; }
      if (pathname === "/maintenance") return;
      router.replace("/maintenance");
    } else {
      if (pathname === "/maintenance") router.replace("/");
    }
  }, [
    isSettingsLoading,
    isSessionLoading,
    settings,
    profile,
    pathname,
    searchParams,
    router,
  ]);
  // ─────────────────────────────────────────────────────────────────────────

  // Chờ load xong mới render
  if (isSettingsLoading || isSessionLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-white">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  const isMaintenance = settings["MaintenanceMode"] === "true";
  const isAdmin = profile?.role === "admin";
  const hasValidBypass = pathname === "/auth" && searchParams.get("bypass") === BYPASS_KEY;

  // Block render trong khi chờ redirect
  if (isMaintenance) {
    if (pathname.startsWith("/admin")) {
      // ok
    } else if (hasValidBypass) {
      // ok
    } else if (isAdmin) {
      return null;
    } else if (pathname === "/maintenance") {
      // ok
    } else {
      return null;
    }
  }

  // Tài khoản bị khóa
  if (profile?.is_active === false) {
    return (
      <div style={{ position: "fixed", inset: 0, backgroundColor: "#ffffff", zIndex: 999999, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center", padding: "2.5rem", maxWidth: "450px", backgroundColor: "#fff", border: "1px solid #dee2e6", borderRadius: "16px", boxShadow: "0 15px 35px rgba(0,0,0,0.1)" }}>
          <i className="fas fa-user-lock text-danger" style={{ fontSize: "72px", marginBottom: "1.5rem" }}></i>
          <h2 className="fw-bold text-dark mb-3">Tài khoản đã bị khóa</h2>
          <p className="text-muted mb-4" style={{ fontSize: "16px" }}>
            Hệ thống phát hiện tài khoản của bạn đang trong trạng thái bị khóa. Vui lòng liên hệ với ban quản trị viên để được hỗ trợ và biết thêm chi tiết.
          </p>
          <button className="btn btn-primary px-4 py-2 fw-bold" onClick={() => supabase.auth.signOut()}>
            <i className="fas fa-sign-out-alt me-2"></i> Đăng xuất ngay
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Tên function: GlobalAuthLockGuard
 * Mục đích của function: Component bọc Suspense cho Guard bên trong (để dùng useSearchParams an toàn).
 * Tham số đầu vào: children (ReactNode)
 * Giá trị trả về: JSX Element với Suspense.
 */
export function GlobalAuthLockGuard({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="d-flex justify-content-center align-items-center vh-100 bg-white">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      }
    >
      <GlobalAuthLockGuardInner>{children}</GlobalAuthLockGuardInner>
    </Suspense>
  );
}
