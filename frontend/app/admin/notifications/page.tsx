/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: page.tsx
 * Mục đích của file: Entry point cho trang Quản lý Thông báo.
 * Các chức năng chính: Cấu hình metadata và render component NotificationsAdmin.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Admin Notifications Route
 * Mục đích của module: Định tuyến cho URL `/admin/notifications`.
 * Phạm vi xử lý: Server Component.
 * Các thành phần chính trong module: AdminNotificationsPage.
 * Module liên quan: NotificationsAdmin.tsx.
 * ============================================================================
 */
import { NotificationsAdmin } from "./NotificationsAdmin";

export const metadata = {
  title: "Quản lý Thông báo - Admin",
};

/**
 * Tên function: AdminNotificationsPage
 * Mục đích của function: Render trang quản lý thông báo cho Admin.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Component NotificationsAdmin.
 */
export default function AdminNotificationsPage() {
  return <NotificationsAdmin />;
}
