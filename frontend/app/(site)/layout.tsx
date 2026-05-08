/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      layout.tsx
 * Mục đích:      Layout cho nhóm route "(site)" — bao bọc tất cả các trang
 *                dành cho người dùng (trang chủ, tìm kiếm, giỏ hàng, v.v.)
 *                trong MainSiteLayout (header + footer + chat widget).
 *
 * Tên module:    Site Layout
 * Module liên quan: app/(site)/_components/MainSiteLayout.tsx
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import type { ReactNode } from "react";
import { MainSiteLayout } from "./_components/MainSiteLayout";
import "./client-layout.css";

/**
 * Layout cho toàn bộ nhóm route "(site)".
 * Bọc children trong MainSiteLayout để có header, footer và chat widget.
 *
 * @param {{ children: ReactNode }} props
 * @returns {JSX.Element}
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <MainSiteLayout>{children}</MainSiteLayout>;
}
