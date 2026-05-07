/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: page.tsx
 * Mục đích của file: Entry point cho trang chi tiết đơn hàng.
 * Các chức năng chính: Render component OrderDetailsPage.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Order Details Route
 * Mục đích của module: Định tuyến cho URL `/user/orders/[code]`.
 * Phạm vi xử lý: Server Component.
 * Các thành phần chính trong module: Page.
 * Module liên quan: OrderDetailsPage.tsx.
 * ============================================================================
 */
import { OrderDetailsPage } from "./OrderDetailsPage";

/**
 * Tên function: Page
 * Mục đích của function: Khởi tạo giao diện trang chi tiết đơn hàng.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Component OrderDetailsPage.
 */
export default function Page() {
  return <OrderDetailsPage />;
}
