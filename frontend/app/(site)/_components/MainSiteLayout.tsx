"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NavLinkNext } from "./NavLinkNext";
import { useSessionProfile } from "../_hooks/useSessionProfile";
import { useSiteSettings } from "../_hooks/useSiteSettings";
import { NotificationBell } from "./NotificationBell";

export function MainSiteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Xóa userLabel vì chúng ta không dùng chữ "Khách" nữa
  const { email, profile, logout, isLoading } = useSessionProfile(); 
  const isLoggedIn = !!email;
  const isAuthPage = pathname === "/auth";

  // Fetch cài đặt hệ thống (liên hệ, mạng xã hội, ...)
  const { settings } = useSiteSettings();

  // State quản lý việc hiển thị dropdown khi hover
  const [showDropdown, setShowDropdown] = useState(false);

  // --- LOGIC BẢO VỆ ROUTE ---
  // Nếu chưa đăng nhập mà cố tình vào các trang này, đẩy về /auth
  useEffect(() => {
    if (isLoading) return;
    
    const protectedRoutes = ["/user/orders", "/cart", "/profile"];
    const isTryingToAccessProtected = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (!isLoggedIn && isTryingToAccessProtected) {
      router.push(`/auth?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isLoggedIn, pathname, router]);

  return (
    <>
      <header className="site-header">
        <div className="container-fluid px-5 py-3 d-flex justify-content-between align-items-center">
          <div className="fw-bold fs-5">Cửa hàng sách</div>

          <nav className="d-flex align-items-center gap-3">
            <NavLinkNext href="/" end className="" activeClassName="nav-active">
              Trang chủ
            </NavLinkNext>
            <NavLinkNext href="/search" className="" activeClassName="nav-active">
              Tra cứu
            </NavLinkNext>

            {/* CHỈ HIỂN THỊ KHI ĐÃ ĐĂNG NHẬP */}
            {isLoggedIn && (
              <>
                <NavLinkNext href="/user/orders" className="" activeClassName="nav-active">
                  Đơn hàng
                </NavLinkNext>
                <NavLinkNext href="/cart" className="" activeClassName="nav-active">
                  Giỏ hàng
                </NavLinkNext>
              </>
            )}

            {/* LINK TRANG QUẢN TRỊ*/}
            {profile?.role === "admin" && (
              <NavLinkNext 
                href="/admin" 
                className="text-danger fw-bold" 
                activeClassName="nav-active"
              >
                Trang quản trị
              </NavLinkNext>
            )}

            {/* KHU VỰC USER (BÊN PHẢI) */}
            <div className="ms-auto d-flex align-items-center gap-2">
              {!isLoggedIn ? (
                <NavLinkNext 
                  href="/auth" 
                  className="text-warning fw-bold text-decoration-none" 
                  activeClassName="nav-active"
                >
                  Đăng nhập
                </NavLinkNext>
              ) : (
                <div className="d-flex align-items-center gap-2">
                  <NotificationBell />
                  <div 
                    className="position-relative"
                    onMouseEnter={() => setShowDropdown(true)}
                    onMouseLeave={() => setShowDropdown(false)}
                  >
                    <div className="py-2 px-2" style={{ cursor: "pointer", color: "white" }}>
                      Xin chào, <strong>{profile?.username || profile?.full_name || "Bạn"}</strong>
                    </div>
                    
                    {/* DROPDOWN MENU - Đã tinh chỉnh lại giao diện */}
                    {showDropdown && (
                      <div 
                        className="position-absolute end-0 pt-2" 
                        style={{ top: "100%", minWidth: "220px", zIndex: 1050 }}
                      >
                        <div className="bg-white shadow-lg rounded border overflow-hidden">
                          <Link 
                            href="/profile" 
                            className="d-flex align-items-center gap-2 px-3 py-2 text-dark text-decoration-none dropdown-item-hover m-0"
                          >
                            <i className="fas fa-user-circle text-primary" style={{ width: "20px", textAlign: "center" }}></i> 
                            <span>Thông tin cá nhân</span>
                          </Link>
                          
                          <div className="border-top my-0"></div>
                          
                          <button 
                            onClick={logout} 
                            className="d-flex align-items-center gap-2 w-100 text-start border-0 bg-transparent text-danger px-3 py-2 dropdown-item-hover m-0"
                          >
                            <i className="fas fa-sign-out-alt" style={{ width: "20px", textAlign: "center" }}></i> 
                            <span>Đăng xuất</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main id="pageContent" className={`container-fluid px-0 ${isAuthPage ? "main-auth-page" : ""}`}>
        {children}
      </main>

      <footer className={`pt-5 ${isAuthPage ? "footer-auth-page" : "mt-4"}`}>
        <div className="container">
          <div className="row">
            {/* Cột 1: Thông tin cửa hàng */}
            <div className="col-md-4 mb-3">
              <h6 className="fw-bold text-white">
                {settings["SiteTitle"] || "Cửa hàng sách"}
              </h6>
              <p className="small" style={{ opacity: 0.8 }}>
                {settings["SiteDescription"] || "Cửa hàng sách & Trung tâm tri thức"}
              </p>
              {settings["WorkingHours"] && (
                <p className="small mb-1" style={{ opacity: 0.75 }}>
                  <i className="fas fa-clock me-2" />
                  {settings["WorkingHours"]}
                </p>
              )}
            </div>

            {/* Cột 2: Liên hệ */}
            <div className="col-md-4 mb-3">
              <h6 className="text-white">Liên hệ</h6>
              {settings["StoreAddress"] && (
                <p className="mb-1">
                  <i className="fas fa-map-marker-alt me-2" />
                  {settings["StoreAddress"]}
                </p>
              )}
              {settings["SupportEmail"] && (
                <p className="mb-1">
                  <i className="fas fa-envelope me-2" />
                  {settings["SupportEmail"]}
                </p>
              )}
              {settings["Hotline"] && (
                <p className="mb-1">
                  <i className="fas fa-phone me-2" />
                  {settings["Hotline"]}
                </p>
              )}
            </div>

            {/* Cột 3: Mạng xã hội */}
            <div className="col-md-4 mb-3">
              <h6 className="text-white">Kết nối</h6>
              <div className="d-flex gap-3 fs-5">
                {settings["FacebookLink"] ? (
                  <a
                    href={settings["FacebookLink"]}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Facebook"
                    style={{ color: "inherit" }}
                  >
                    <i className="fab fa-facebook" />
                  </a>
                ) : (
                  <span style={{ opacity: 0.35 }}><i className="fab fa-facebook" /></span>
                )}
                {settings["YoutubeLink"] ? (
                  <a
                    href={settings["YoutubeLink"]}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="YouTube"
                    style={{ color: "inherit" }}
                  >
                    <i className="fab fa-youtube" />
                  </a>
                ) : (
                  <span style={{ opacity: 0.35 }}><i className="fab fa-youtube" /></span>
                )}
                {settings["TiktokLink"] ? (
                  <a
                    href={settings["TiktokLink"]}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="TikTok"
                    style={{ color: "inherit" }}
                  >
                    <i className="fab fa-tiktok" />
                  </a>
                ) : (
                  <span style={{ opacity: 0.35 }}><i className="fab fa-tiktok" /></span>
                )}
              </div>
            </div>
          </div>
          <hr className="border-secondary" />
          <div className="text-center pb-3">
            © {new Date().getFullYear()} {settings["SiteTitle"] || "Bookstore"}
          </div>
        </div>
      </footer>
    </>
  );
}
