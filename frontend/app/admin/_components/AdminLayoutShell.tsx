/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: AdminLayoutShell.tsx
 * Mục đích của file: Thành phần giao diện (Shell) bao bọc toàn bộ trang quản trị Admin.
 * Các chức năng chính: Sidebar menu, Topbar (Avatar/Đăng xuất), bảo vệ route (chỉ cho phép admin).
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Admin Layout Components
 * Mục đích của module: Xây dựng cấu trúc khung cho Admin Dashboard.
 * Phạm vi xử lý: Client Component.
 * Các thành phần chính trong module: AdminLayoutShell.
 * Module liên quan: auth.ts, avatar.ts.
 * ============================================================================
 */
"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NavLinkNext } from "../../(site)/_components/NavLinkNext";
import { getProfile, type Profile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getAvatarUrl } from "@/lib/avatar";

/**
 * Tên function: AdminLayoutShell
 * Mục đích của function: Component gốc bao bọc các nội dung con trong route admin, kiểm tra quyền hạn.
 * Tham số đầu vào: children (ReactNode).
 * Giá trị trả về: JSX Element hoặc điều hướng nếu không có quyền.
 */
export function AdminLayoutShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [done, setDone] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setDone(false);
    getProfile()
      .then((p) => {
        setProfile(p);
        if (p?.role !== "admin") router.replace("/");
      })
      .catch(() => {
        setProfile(null);
        router.replace("/");
      })
      .finally(() => setDone(true));
  }, [email, router]);

  /**
   * Tên function: logout
   * Mục đích của function: Xử lý đăng xuất tài khoản và điều hướng về trang Auth.
   */
  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  const userLabel = profile?.full_name || email || "Khách";

  if (!done) {
    return (
      <div className="p-4 text-center text-muted" style={{ minHeight: "40vh" }}>
        Đang tải…
      </div>
    );
  }

  if (profile?.role !== "admin") {
    return null;
  }

  return (
    <>
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="logo-icon">
            <i className="fas fa-book" />
          </div>
          <div className="logo-text">Trang quản trị</div>
        </div>

        <nav className="sidebar-menu">
          <ul className="nav flex-column">
            <li className="nav-item">
              <NavLinkNext href="/admin" end className="nav-link" activeClassName="active">
                <i className="fas fa-home" />
                <span>Dashboard</span>
              </NavLinkNext>
            </li>
            <li className="nav-item">
              <NavLinkNext href="/admin/orders" className="nav-link" activeClassName="active">
                <i className="fas fa-shopping-bag" />
                <span>Quản lý đơn hàng</span>
              </NavLinkNext>
            </li>
            <li className="nav-item">
              <NavLinkNext href="/admin/carts" className="nav-link" activeClassName="active">
                <i className="fas fa-shopping-basket" />
                <span>Quản lý giỏ hàng</span>
              </NavLinkNext>
            </li>
            <li className="nav-item">
              <NavLinkNext href="/admin/users" className="nav-link" activeClassName="active">
                <i className="fas fa-user-graduate" />
                <span>Quản lý người dùng</span>
              </NavLinkNext>
            </li>
            <li className="nav-item">
              <NavLinkNext href="/admin/books" className="nav-link" activeClassName="active">
                <i className="fas fa-book" />
                <span>Quản lý sách</span>
              </NavLinkNext>
            </li>
            <li className="nav-item">
              <NavLinkNext href="/admin/vouchers" className="nav-link" activeClassName="active">
                <i className="fas fa-ticket-alt" />
                <span>Quản lý voucher</span>
              </NavLinkNext>
            </li>
            <li className="nav-item">
              <NavLinkNext href="/admin/categories" className="nav-link" activeClassName="active">
                <i className="fas fa-tags" />
                <span>Quản lý thể loại sách</span>
              </NavLinkNext>
            </li>
            <li className="nav-item">
              <NavLinkNext href="/admin/notifications" className="nav-link" activeClassName="active">
                <i className="fas fa-bullhorn" />
                <span>Quản lý thông báo</span>
              </NavLinkNext>
            </li>
            <li className="nav-item">
              <NavLinkNext href="/admin/settings" className="nav-link" activeClassName="active">
                <i className="fas fa-cog" />
                <span>Cài đặt hệ thống</span>
              </NavLinkNext>
            </li>
            <li className="nav-item">
              <Link href="/" className="nav-link">
                <i className="fas fa-external-link-alt" />
                <span>Giao diện Client</span>
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      <header className="admin-topbar d-flex justify-content-between align-items-center px-4 py-3 bg-white border-bottom shadow-sm">
        <h1 className="topbar-title h5 m-0 text-primary fw-bold">Quản trị hệ thống</h1>

        <div className="topbar-user position-relative">
          {/* Khu vực bấm để hiện Dropdown */}
          <div
            className="d-flex align-items-center gap-2 user-select-none"
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ cursor: "pointer" }}
          >
            {profile?.avatar_url ? (
              <img
                src={getAvatarUrl(profile.avatar_url)}
                alt="Avatar"
                className="rounded-circle border"
                style={{ width: "36px", height: "36px", objectFit: "cover" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const nextSibling = e.currentTarget.nextElementSibling as HTMLElement;
                  if (nextSibling) nextSibling.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className={`bg-light rounded-circle align-items-center justify-content-center text-primary fw-bold border`}
              style={{ width: "36px", height: "36px", display: profile?.avatar_url ? "none" : "flex" }}
            >
              {profile?.username?.charAt(0).toUpperCase() || "A"}
            </div>
            <span className="fw-medium text-dark">
              {profile?.username || "Admin"}
            </span>
            <i className={`fas fa-chevron-down text-muted transition-transform ${showDropdown ? "rotate-180" : ""}`} style={{ fontSize: "12px", transition: "transform 0.2s" }}></i>
          </div>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div
              className="position-absolute end-0 mt-2 bg-white shadow rounded border overflow-hidden"
              style={{ top: "100%", minWidth: "200px", zIndex: 1050 }}
            >
              <Link
                href="/profile"
                className="d-flex align-items-center gap-2 px-3 py-2 text-dark text-decoration-none admin-dropdown-item"
                onClick={() => setShowDropdown(false)}
              >
                <i className="fas fa-user-circle text-muted" style={{ width: "20px", textAlign: "center" }}></i>
                Thông tin cá nhân
              </Link>

              <div className="border-top my-1"></div>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  logout();
                }}
                className="d-flex align-items-center gap-2 w-100 text-start border-0 bg-transparent text-danger px-3 py-2 admin-dropdown-item"
              >
                <i className="fas fa-sign-out-alt" style={{ width: "20px", textAlign: "center" }}></i>
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="admin-content">{children}</main>
    </>
  );
}
