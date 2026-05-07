/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: page.tsx
 * Mục đích của file: Entry point cho trang Quản lý Giỏ hàng.
 * Các chức năng chính: Cấu hình metadata và render component CartsAdmin.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Admin Carts Route
 * Mục đích của module: Định tuyến cho URL `/admin/carts`.
 * Phạm vi xử lý: Server Component.
 * Các thành phần chính trong module: CartsAdminPage.
 * Module liên quan: CartsAdmin.tsx.
 * ============================================================================
 */
import { CartsAdmin } from "./CartsAdmin";

export const metadata = {
  title: "Quản lý Giỏ hàng - Admin",
};

/**
 * Tên function: CartsAdminPage
 * Mục đích của function: Render trang quản lý giỏ hàng.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Component CartsAdmin.
 */
export default function CartsAdminPage() {
  return <CartsAdmin />;
}
