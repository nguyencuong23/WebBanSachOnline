/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: page.tsx
 * Mục đích của file: Entry point cho trang Quản lý Sách.
 * Các chức năng chính: Render component AdminBooksPage.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Admin Books Route
 * Mục đích của module: Định tuyến cho URL `/admin/books`.
 * Phạm vi xử lý: Server Component.
 * Các thành phần chính trong module: Page.
 * Module liên quan: BooksAdmin.tsx.
 * ============================================================================
 */
import { AdminBooksPage } from "./BooksAdmin";

/**
 * Tên function: Page
 * Mục đích của function: Render trang quản lý sách cho Admin.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Component AdminBooksPage.
 */
export default function Page() {
  return <AdminBooksPage />;
}
