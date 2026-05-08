/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      layout.tsx (admin)
 * Mục đích:      Layout cho toàn bộ nhóm route "/admin" — bọc tất cả các trang
 *                quản trị trong AdminLayoutShell (sidebar + topbar).
 *                Tự động kiểm tra quyền admin và redirect nếu không đủ quyền.
 *
 * Tên module:    Admin Layout
 * Module liên quan: app/admin/_components/AdminLayoutShell.tsx
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import type { ReactNode } from "react";
import { AdminLayoutShell } from "./_components/AdminLayoutShell";
import "./admin.css";
import "./crud.css";

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
