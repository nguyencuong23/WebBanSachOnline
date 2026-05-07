/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: layout.tsx
 * Mục đích của file: Layout chung cho phần giao diện Client (Site) của khách hàng.
 * Các chức năng chính: Bao bọc các trang client-side bằng MainSiteLayout (có header, footer).
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Site Layout
 * Mục đích của module: Định nghĩa khung giao diện cho phần hiển thị của người mua hàng.
 * Phạm vi xử lý: Server Component cho thư mục (site).
 * Các thành phần chính trong module: SiteLayout.
 * Module liên quan: MainSiteLayout, client-layout.css.
 * ============================================================================
 */
import type { ReactNode } from "react";
import { MainSiteLayout } from "./_components/MainSiteLayout";
import "./client-layout.css";

/**
 * Tên function: SiteLayout
 * Mục đích của function: Component bọc toàn bộ nội dung trong thư mục (site) với giao diện chuẩn (Header/Footer).
 * Tham số đầu vào: children (ReactNode)
 * Giá trị trả về: JSX Element.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <MainSiteLayout>{children}</MainSiteLayout>;
}
