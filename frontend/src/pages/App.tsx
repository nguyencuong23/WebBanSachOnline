import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { HomePage } from "./HomePage";
import { LoginPage } from "./LoginPage";
import { ProfilePage } from "./ProfilePage";
import { OrdersPage } from "./OrdersPage";
import { SearchPage } from "./SearchPage";
import { CartPage } from "./CartPage";
import { CheckoutPage } from "./CheckoutPage";
import { OrderDetailsPage } from "./OrderDetailsPage";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { ResetPasswordPage } from "./ResetPasswordPage";
import { AdminDashboardPage } from "./admin/AdminDashboardPage";
import { AdminOrdersPage } from "./admin/AdminOrdersPage";
import { AdminUsersPage } from "./admin/AdminUsersPage";
import { AdminBooksPage } from "./admin/AdminBooksPage";
import { AdminCategoriesPage } from "./admin/AdminCategoriesPage";
import { AdminSettingsPage } from "./admin/AdminSettingsPage";
import { getProfile, type Profile } from "../auth";

export function App() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const nav = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [email]);

  async function logout() {
    await supabase.auth.signOut();
    nav("/login");
  }

  const userLabel = profile?.full_name || email || "Khách";

  const appRoutes = (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/orders/:id" element={<OrderDetailsPage />} />

      <Route path="/admin" element={profile?.role === "admin" ? <AdminDashboardPage /> : <Navigate to="/" />} />
      <Route path="/admin/orders" element={profile?.role === "admin" ? <AdminOrdersPage /> : <Navigate to="/" />} />
      <Route path="/admin/users" element={profile?.role === "admin" ? <AdminUsersPage /> : <Navigate to="/" />} />
      <Route path="/admin/books" element={profile?.role === "admin" ? <AdminBooksPage /> : <Navigate to="/" />} />
      <Route
        path="/admin/categories"
        element={profile?.role === "admin" ? <AdminCategoriesPage /> : <Navigate to="/" />}
      />
      <Route
        path="/admin/settings"
        element={profile?.role === "admin" ? <AdminSettingsPage /> : <Navigate to="/" />}
      />
    </Routes>
  );

  if (isAdminRoute && profile?.role === "admin") {
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
                <NavLink to="/admin" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                  <i className="fas fa-home" />
                  <span>Dashboard</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/admin/orders" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                  <i className="fas fa-shopping-bag" />
                  <span>Quản lý đơn hàng</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/admin/users" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                  <i className="fas fa-user-graduate" />
                  <span>Sinh viên/Độc giả</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/admin/books" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                  <i className="fas fa-book" />
                  <span>Quản lý sách</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/admin/categories" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                  <i className="fas fa-tags" />
                  <span>Thể loại sách</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/admin/settings" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                  <i className="fas fa-cog" />
                  <span>Cài đặt hệ thống</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/" className="nav-link">
                  <i className="fas fa-external-link-alt" />
                  <span>Giao diện Client</span>
                </NavLink>
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

        <main className="admin-content">{appRoutes}</main>
      </>
    );
  }

  return (
    <>
      <header>
        <div className="container-fluid px-5 py-3 d-flex justify-content-between align-items-center">
          <div className="fw-bold fs-5">THƯ VIỆN ĐẠI HỌC ĐẠI NAM</div>

          <nav className="d-flex align-items-center gap-3">
            <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-active" : "")}>
              Trang chủ
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => (isActive ? "nav-active" : "")}>
              Tra cứu
            </NavLink>
            <NavLink to="/orders" className={({ isActive }) => (isActive ? "nav-active" : "")}>
              Đơn hàng
            </NavLink>
            <NavLink to="/cart" className={({ isActive }) => (isActive ? "nav-active" : "")}>
              Giỏ hàng
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => (isActive ? "nav-active" : "")}>
              Thông tin cá nhân
            </NavLink>
            {profile?.role === "admin" && (
              <NavLink to="/admin" className="text-danger fw-bold">
                Trang quản trị
              </NavLink>
            )}

            <div className="ms-auto d-flex align-items-center gap-2">
              {!email ? <Link to="/login">Đăng nhập</Link> : <button onClick={logout}>Đăng xuất</button>}
              <span>{userLabel}</span>
            </div>
          </nav>
        </div>
      </header>

      <main id="pageContent" className="container-fluid px-0">
        {appRoutes}
      </main>

      <footer className="pt-5 mt-4">
        <div className="container">
          <div className="row">
            <div className="col-md-4 mb-3">
              <h6 className="fw-bold text-white">Đại học Đại Nam</h6>
              <p>Thư viện & Trung tâm tri thức</p>
            </div>
            <div className="col-md-4 mb-3">
              <h6 className="text-white">Liên hệ</h6>
              <p>
                <i className="fas fa-map-marker-alt me-2" />
                Hà Đông, Hà Nội
              </p>
              <p>
                <i className="fas fa-envelope me-2" />
                thuvien@dainam.edu.vn
              </p>
              <p>
                <i className="fas fa-phone me-2" />
                0243.123.4567
              </p>
            </div>
            <div className="col-md-4 mb-3">
              <h6 className="text-white">Kết nối</h6>
              <a href="#">
                <i className="fab fa-facebook" />
              </a>
              <a href="#">
                <i className="fab fa-youtube" />
              </a>
              <a href="#">
                <i className="fab fa-tiktok" />
              </a>
            </div>
          </div>
          <hr className="border-secondary" />
          <div className="text-center pb-3">© Đại học Đại Nam</div>
        </div>
      </footer>
    </>
  );
}

