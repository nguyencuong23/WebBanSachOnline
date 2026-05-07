/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: NavLinkNext.tsx
 * Mục đích của file: Component Link tùy chỉnh hỗ trợ nhận diện trạng thái active (đang chọn).
 * Các chức năng chính: So sánh đường dẫn hiện tại để thêm class active.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: NavLink
 * Mục đích của module: Hỗ trợ tạo các menu điều hướng có trạng thái highlight.
 * Phạm vi xử lý: Client Component.
 * Các thành phần chính trong module: NavLinkNext.
 * Module liên quan: Không có.
 * ============================================================================
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Tên class/interface: Props
 * Mục đích của class/interface: Kiểu dữ liệu tham số cho component NavLinkNext.
 */
type Props = {
  href: string;
  end?: boolean;
  className?: string;
  activeClassName?: string;
  children: ReactNode;
};

/**
 * Tên function: NavLinkNext
 * Mục đích của function: Render thẻ <a> bọc qua next/link và tự động thêm activeClassName.
 * Tham số đầu vào: href, end, className, activeClassName, children
 * Giá trị trả về: JSX Element
 * Điều kiện xử lý: Nếu end=true, so sánh chính xác tuyệt đối URL. Ngược lại chỉ cần bắt đầu với URL.
 */
export function NavLinkNext({ href, end, className = "", activeClassName = "active", children }: Props) {
  const pathname = usePathname();
  const isActive = end ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} className={isActive ? `${className} ${activeClassName}`.trim() : className}>
      {children}
    </Link>
  );
}
