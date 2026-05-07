/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: page.tsx
 * Mục đích của file: Entry point cho trang Quản lý Thể loại sách.
 * Các chức năng chính: Render component AdminCategoriesPage.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Admin Categories Route
 * Mục đích của module: Định tuyến cho URL `/admin/categories`.
 * Phạm vi xử lý: Server Component.
 * Các thành phần chính trong module: Page.
 * Module liên quan: CategoriesAdmin.tsx.
 * ============================================================================
 */
import { AdminCategoriesPage } from "./CategoriesAdmin";

/**
 * Tên function: Page
 * Mục đích của function: Render trang quản lý thể loại cho Admin.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Component AdminCategoriesPage.
 */
export default function Page() {
  return <AdminCategoriesPage />;
}
