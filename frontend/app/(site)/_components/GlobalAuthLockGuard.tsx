"use client";

/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      GlobalAuthLockGuard.tsx
 * Mục đích:      Component bảo vệ toàn cục — xử lý 3 tình huống đặc biệt:
 *                1. Chế độ bảo trì (MaintenanceMode): redirect về /maintenance
 *                2. Tài khoản bị khóa (is_active = false): hiển thị màn hình khóa
 *                3. Đồng bộ title và favicon động từ cài đặt hệ thống
 *                Bọc toàn bộ ứng dụng trong RootLayout để áp dụng cho mọi trang.
 * Các chức năng chính:
 *   - GlobalAuthLockGuardInner : Logic chính (cần Suspense vì dùng useSearchParams)
 *   - GlobalAuthLockGuard      : Wrapper bọc Inner trong Suspense
 *
 * Tên module:    Auth Guard
 * Module liên quan: _hooks/useSiteSettings.ts, lib/supabase.ts, lib/auth.ts
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       BYPASS_KEY cho phép admin truy cập /auth khi đang bảo trì
 *                bằng cách thêm ?bypass=<key> vào URL.
 * ============================================================================
 */

import { useEffect, useRef, useState, type ReactNode, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, type Profile } from "@/lib/auth";
import { useSiteSettings } from "../_hooks/useSiteSettings";
import { useLoading } from "./LoadingContext";

const PremiumLoadingOverlay = () => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(15, 23, 42, 0.85)", // dark slate with transparency
      backdropFilter: "blur(12px)", // glassmorphism
      WebkitBackdropFilter: "blur(12px)",
      zIndex: 999999,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      transition: "all 0.3s ease-in-out"
    }}
  >
    <div className="text-center">
      {/* Animated Book Icon */}
      <div className="mb-4 position-relative" style={{ display: "inline-block" }}>
        <i
          className="fas fa-book-open text-warning"
          style={{
            fontSize: "4.5rem",
            color: "#fbbf24", // elegant gold
            filter: "drop-shadow(0 0 15px rgba(251, 191, 36, 0.6))",
            animation: "book-pulse 2s infinite ease-in-out"
          }}
        />
        {/* Subtle spinning glow/border */}
        <div
          style={{
            position: "absolute",
            inset: "-15px",
            border: "2px solid transparent",
            borderTopColor: "#fbbf24",
            borderBottomColor: "#fbbf24",
            borderRadius: "50%",
            animation: "spin-slow 1.5s linear infinite"
          }}
        />
      </div>
      <h3
        className="fw-bold text-white mb-2"
        style={{
          fontFamily: "'Outfit', 'Inter', sans-serif",
          letterSpacing: "1px",
          textShadow: "0 2px 4px rgba(0,0,0,0.5)",
          fontSize: "1.5rem"
        }}
      >
        ĐANG TẢI DỮ LIỆU
      </h3>
      <p className="small mb-0" style={{ color: "#94a3b8", letterSpacing: "0.5px" }}>
        Vui lòng chờ trong giây lát...
      </p>
    </div>
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes book-pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 0.9;
        }
        50% {
          transform: scale(1.1) translateY(-5px);
          opacity: 1;
        }
      }
      @keyframes spin-slow {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}} />
  </div>
);

const BYPASS_KEY = process.env.NEXT_PUBLIC_MAINTENANCE_BYPASS_KEY ?? "";

function GlobalAuthLockGuardInner({ children }: { children: ReactNode }) {
  const { settings, isLoading: isSettingsLoading } = useSiteSettings();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isPageLoading } = useLoading();

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
    return <PremiumLoadingOverlay />;
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

  return (
    <>
      {children}
      {isPageLoading && <PremiumLoadingOverlay />}
    </>
  );
}

export function GlobalAuthLockGuard({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PremiumLoadingOverlay />}>
      <GlobalAuthLockGuardInner>{children}</GlobalAuthLockGuardInner>
    </Suspense>
  );
}
