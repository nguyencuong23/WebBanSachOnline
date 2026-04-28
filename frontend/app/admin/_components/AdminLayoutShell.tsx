"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NavLinkNext } from "../../(site)/_components/NavLinkNext";
import { getProfile, type Profile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export function AdminLayoutShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [done, setDone] = useState(false);

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
              <NavLinkNext href="/admin/users" className="nav-link" activeClassName="active">
                <i className="fas fa-user-graduate" />
                <span>Sinh viên/Độc giả</span>
              </NavLinkNext>
            </li>
            <li className="nav-item">
              <NavLinkNext href="/admin/books" className="nav-link" activeClassName="active">
                <i className="fas fa-book" />
                <span>Quản lý sách</span>
              </NavLinkNext>
            </li>
            <li className="nav-item">
              <NavLinkNext href="/admin/categories" className="nav-link" activeClassName="active">
                <i className="fas fa-tags" />
                <span>Thể loại sách</span>
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

      <header className="admin-topbar">
        <h1 className="topbar-title">Quản trị hệ thống</h1>
        <div className="topbar-user">
          <div className="d-flex align-items-center gap-3">
            <span>{userLabel}</span>
            <button onClick={logout}>Đăng xuất</button>
          </div>
        </div>
      </header>

      <main className="admin-content">{children}</main>
    </>
  );
}
