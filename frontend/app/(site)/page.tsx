/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: page.tsx
 * Mục đích của file: Entry point cho trang chủ (route `/`).
 * Các chức năng chính: Gọi và render component HomePage.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Root Page
 * Mục đích của module: Hiển thị trang chủ ở cấp độ cao nhất.
 * Phạm vi xử lý: Server Component gọi Client Component.
 * Các thành phần chính trong module: Page.
 * Module liên quan: home.tsx.
 * ============================================================================
 */
import { HomePage } from "./home";

/**
 * Tên function: Page
 * Mục đích của function: Component trang chủ Next.js App Router mặc định.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Component HomePage.
 */
export default function Page() {
  return <HomePage />;
}
