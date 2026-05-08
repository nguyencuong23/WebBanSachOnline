"use client";

/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      NavLinkNext.tsx
 * Mục đích:      Component điều hướng tùy chỉnh — tự động thêm class "active"
 *                khi route hiện tại khớp với href, thay thế NavLink của React Router
 *                trong môi trường Next.js App Router.
 * Các chức năng chính:
 *   - NavLinkNext : Link với active state tự động dựa trên pathname hiện tại
 *
 * Tên module:    Navigation
 * Module liên quan: app/(site)/_components/MainSiteLayout.tsx
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Props của NavLinkNext.
 * @typedef {object} NavLinkNextProps
 * @property {string}    href            - Đường dẫn điều hướng.
 * @property {boolean}   [end]           - Nếu true, chỉ active khi pathname khớp chính xác (không prefix match).
 * @property {string}    [className]     - Class CSS mặc định.
 * @property {string}    [activeClassName="active"] - Class CSS thêm vào khi đang active.
 * @property {ReactNode} children        - Nội dung bên trong link.
 */
type Props = {
  href: string;
  end?: boolean;
  className?: string;
  activeClassName?: string;
  children: ReactNode;
};

export function NavLinkNext({ href, end, className = "", activeClassName = "active", children }: Props) {
  const pathname = usePathname();
  const isActive = end ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} className={isActive ? `${className} ${activeClassName}`.trim() : className}>
      {children}
    </Link>
  );
}
