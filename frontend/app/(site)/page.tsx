/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      page.tsx
 * Mục đích:      Route handler cho trang chủ ("/") — render component HomePage.
 *                File này là Next.js page component, chỉ đóng vai trò điều hướng
 *                sang component thực sự (home.tsx) để tách biệt logic và routing.
 *
 * Tên module:    Home Page Route
 * Module liên quan: app/(site)/home.tsx
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { HomePage } from "./home";

/**
 * Trang chủ của ứng dụng.
 *
 * @returns {JSX.Element} Component HomePage.
 */
export default function Page() {
  return <HomePage />;
}
