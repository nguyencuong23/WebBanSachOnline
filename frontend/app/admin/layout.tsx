/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: layout.tsx
 * Mục đích của file: Layout chính bọc quanh toàn bộ giao diện quản trị (Admin).
 * Các chức năng chính: Render Shell giao diện admin bao gồm sidebar và nội dung chính.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Admin Layout Route
 * Mục đích của module: Định hình bộ khung (shell) cho tất cả các trang con trong `/admin`.
 * Phạm vi xử lý: Server Component.
 * Các thành phần chính trong module: AdminRootLayout.
 * Module liên quan: _components/AdminLayoutShell.tsx.
 * ============================================================================
 */
import type { ReactNode } from "react";
import { AdminLayoutShell } from "./_components/AdminLayoutShell";
import "./admin.css";
import "./crud.css";

/**
 * Tên function: AdminRootLayout
 * Mục đích của function: Render bộ khung layout chung cho admin.
 * Tham số đầu vào: children (ReactNode).
 * Giá trị trả về: JSX Element bọc bởi AdminLayoutShell.
 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
