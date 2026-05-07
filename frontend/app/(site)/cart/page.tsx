/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: page.tsx
 * Mục đích của file: Entry point cho trang Giỏ hàng.
 * Các chức năng chính: Render component CartPage.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Cart Route
 * Mục đích của module: Định tuyến cho URL `/cart`.
 * Phạm vi xử lý: Server Component.
 * Các thành phần chính trong module: Page.
 * Module liên quan: CartPage.tsx.
 * ============================================================================
 */
import { CartPage } from "./CartPage";

/**
 * Tên function: Page
 * Mục đích của function: Khởi tạo giao diện trang Giỏ hàng.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Component CartPage.
 */
export default function Page() {
  return <CartPage />;
}
