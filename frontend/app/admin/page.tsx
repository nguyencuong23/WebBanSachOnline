/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: page.tsx
 * Mục đích của file: Entry point cho trang Dashboard Admin.
 * Các chức năng chính: Render component AdminDashboardPage.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Admin Dashboard Route
 * Mục đích của module: Định tuyến cho URL `/admin`.
 * Phạm vi xử lý: Server Component.
 * Các thành phần chính trong module: Page.
 * Module liên quan: AdminDashboard.tsx.
 * ============================================================================
 */
import { AdminDashboardPage } from "./AdminDashboard";

/**
 * Tên function: Page
 * Mục đích của function: Khởi tạo giao diện trang Admin Dashboard.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Component AdminDashboardPage.
 */
export default function Page() {
  return <AdminDashboardPage />;
}
