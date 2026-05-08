/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      page.tsx (admin/carts)
 * Mục đích:      Route handler cho trang quản lý giỏ hàng tại "/admin/carts".
 *
 * Tên module:    Admin Carts Route
 * Module liên quan: CartsAdmin.tsx
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { CartsAdmin } from "./CartsAdmin";

export const metadata = {
  title: "Quản lý Giỏ hàng - Admin",
};

export default function CartsAdminPage() {
  return <CartsAdmin />;
}
