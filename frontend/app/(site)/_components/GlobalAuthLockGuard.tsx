"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/auth";
import { useSiteSettings } from "../_hooks/useSiteSettings";

export function GlobalAuthLockGuard({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const isInitialCheck = useRef(true);

  const { settings } = useSiteSettings();
  const pathname = usePathname();

  // Đồng bộ title tab trình duyệt — chạy lại mỗi khi đổi route
  // vì Next.js sẽ reset document.title về giá trị mặc định khi navigate
  useEffect(() => {
    if (settings["SiteTitle"]) {
      document.title = settings["SiteTitle"];
    }
  }, [settings["SiteTitle"], pathname]);

  // Đồng bộ favicon — thêm pathname để re-apply mỗi khi navigate
  useEffect(() => {
    if (!settings["FaviconUrl"]) return;
    // Tìm tag icon hiện có (do Next.js tạo) hoặc tạo mới nếu chưa có
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    // Chỉ update href, không xóa element → tránh lỗi removeChild
    link.href = `${settings["FaviconUrl"]}?t=${Date.now()}`;
  }, [settings["FaviconUrl"], pathname]);

  useEffect(() => {
    async function checkLockStatus() {
      if (isInitialCheck.current) {
        setIsChecking(true);
      }
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const p = await getProfile();
          if (p && p.is_active === false) {
            setIsLocked(true);
          } else {
            setIsLocked(false);
          }
        } else {
          setIsLocked(false);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isInitialCheck.current) {
          setIsChecking(false);
          isInitialCheck.current = false;
        }
      }
    }

    checkLockStatus();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      checkLockStatus();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (isChecking) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-white">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang kiểm tra...</span>
        </div>
      </div>
    );
  }

  if (isLocked) {
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
