/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: page.tsx
 * Mục đích của file: Entry point cho trang Hồ sơ cá nhân (Profile).
 * Các chức năng chính: Render component ProfilePage.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Profile Route
 * Mục đích của module: Định tuyến cho URL `/profile`.
 * Phạm vi xử lý: Server Component.
 * Các thành phần chính trong module: Page.
 * Module liên quan: ProfilePage.tsx.
 * ============================================================================
 */
import { ProfilePage } from "./ProfilePage";

/**
 * Tên function: Page
 * Mục đích của function: Khởi tạo giao diện trang Profile.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Component ProfilePage.
 */
export default function Page() {
  return <ProfilePage />;
}
