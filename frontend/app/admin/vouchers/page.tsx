/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: page.tsx
 * Mục đích của file: Entry point cho trang Quản lý Voucher.
 * Các chức năng chính: Render component AdminVouchersPage.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Admin Vouchers Route
 * Mục đích của module: Định tuyến cho URL `/admin/vouchers`.
 * Phạm vi xử lý: Server Component.
 * Các thành phần chính trong module: Page.
 * Module liên quan: VouchersAdmin.tsx.
 * ============================================================================
 */
import { AdminVouchersPage } from "./VouchersAdmin";

/**
 * Tên function: Page
 * Mục đích của function: Render trang quản lý Voucher cho Admin.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Component AdminVouchersPage.
 */
export default function Page() {
  return <AdminVouchersPage />;
}
