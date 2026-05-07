/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: page.tsx
 * Mục đích của file: Entry point cho trang danh sách Đơn hàng của tôi.
 * Các chức năng chính: Render component OrdersPage.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Orders Route
 * Mục đích của module: Định tuyến cho URL `/user/orders`.
 * Phạm vi xử lý: Server Component.
 * Các thành phần chính trong module: Page.
 * Module liên quan: OrdersPage.tsx.
 * ============================================================================
 */
import { OrdersPage } from "./OrdersPage";

/**
 * Tên function: Page
 * Mục đích của function: Khởi tạo giao diện trang danh sách đơn hàng.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Component OrdersPage.
 */
export default function Page() {
  return <OrdersPage />;
}
