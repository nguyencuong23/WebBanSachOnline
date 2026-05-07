/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: page.tsx
 * Mục đích của file: Entry point cho trang Quản lý Đơn hàng.
 * Các chức năng chính: Render component AdminOrdersPage.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Admin Orders Route
 * Mục đích của module: Định tuyến cho URL `/admin/orders`.
 * Phạm vi xử lý: Server Component.
 * Các thành phần chính trong module: Page.
 * Module liên quan: OrdersAdmin.tsx.
 * ============================================================================
 */
import { AdminOrdersPage } from "./OrdersAdmin";

/**
 * Tên function: Page
 * Mục đích của function: Render trang quản lý đơn hàng cho Admin.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Component AdminOrdersPage.
 */
export default function Page() {
  return <AdminOrdersPage />;
}
