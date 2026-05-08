/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      page.tsx (admin/notifications)
 * Mục đích:      Route handler cho trang quản lý thông báo tại "/admin/notifications".
 *
 * Tên module:    Admin Notifications Route
 * Module liên quan: NotificationsAdmin.tsx
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { NotificationsAdmin } from "./NotificationsAdmin";

export const metadata = {
  title: "Quản lý Thông báo - Admin",
};

export default function AdminNotificationsPage() {
  return <NotificationsAdmin />;
}
