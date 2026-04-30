"use client";

import { useEffect, useState, type ReactNode, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, type Profile } from "@/lib/auth";
import { useSiteSettings } from "../_hooks/useSiteSettings";

const BYPASS_KEY = process.env.NEXT_PUBLIC_MAINTENANCE_BYPASS_KEY ?? "";

function GlobalAuthLockGuardInner({ children }: { children: ReactNode }) {
  const { settings, isLoading: isSettingsLoading } = useSiteSettings();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

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
    async function load() {
      setIsSessionLoading(true);
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
        setIsSessionLoading(false);
      }
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  // ── MAINTENANCE REDIRECT (dùng useEffect, không gọi router trong render) ──
  useEffect(() => {
    if (isSettingsLoading || isSessionLoading) return;

    const isMaintenance = settings["MaintenanceMode"] === "true";
    const isAdmin = profile?.role === "admin";
    const hasValidBypass = pathname === "/auth" && searchParams.get("bypass") === BYPASS_KEY;

    if (isMaintenance) {
      if (pathname.startsWith("/admin")) return;   // admin pages: ok
      if (hasValidBypass) return;                  // bypass: ok
      if (isAdmin) { router.replace("/admin"); return; }  // admin đã login → vào admin
      if (pathname === "/maintenance") return;     // đang ở maintenance: ok
      router.replace("/maintenance");              // tất cả còn lại → maintenance
    } else {
      // Maintenance tắt nhưng đang ở /maintenance → về trang chủ
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
  // ──────────────────────────────────────────────────────────────────────────

  // Chờ load xong
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
      return null; // đang redirect sang /admin
    } else if (pathname === "/maintenance") {
      // ok
    } else {
      return null; // đang redirect sang /maintenance
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
