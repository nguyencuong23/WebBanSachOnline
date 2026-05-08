/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      layout.tsx
 * Mục đích:      Root layout của toàn bộ ứng dụng Next.js — bao bọc tất cả các trang.
 *                Tải metadata động từ API (title, description, favicon),
 *                nhúng CSS framework và bọc nội dung trong GlobalAuthLockGuard.
 * Các chức năng chính:
 *   - generateMetadata : Fetch cài đặt từ API để tạo metadata động (SEO)
 *   - RootLayout       : Component layout gốc, nhúng Bootstrap, Font Awesome
 *                        và GlobalAuthLockGuard
 *
 * Tên module:    App Root Layout
 * Module liên quan: app/(site)/_components/GlobalAuthLockGuard.tsx
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { GlobalAuthLockGuard } from "./(site)/_components/GlobalAuthLockGuard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL as string;

/**
 * Tạo metadata động cho ứng dụng bằng cách fetch cài đặt từ API.
 * Nếu fetch thất bại, fallback về giá trị mặc định để tránh crash.
 *
 * @async
 * @returns {Promise<Metadata>} Object metadata gồm title, description và favicon.
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      next: { revalidate: 0 }, // Không cache — luôn lấy dữ liệu mới nhất
    });
    if (res.ok) {
      const data = await res.json();
      const items: { key: string; value: string }[] = data.items || [];
      const get = (key: string) => items.find((i) => i.key === key)?.value ?? "";

      const title = get("SiteTitle") || "Bookstore";
      const description = get("SiteDescription") || "Cửa hàng sách trực tuyến";
      const faviconUrl = get("FaviconUrl") || "/favicon.ico";

      return {
        title,
        description,
        icons: { icon: faviconUrl },
      };
    }
  } catch {
    // Fallback bên dưới nếu API không khả dụng
  }

  return {
    title: "Bookstore",
    description: "Cửa hàng sách trực tuyến",
    icons: { icon: "/favicon.ico" },
  };
}

/**
 * Root layout component — bao bọc toàn bộ ứng dụng.
 * Nhúng Bootstrap 5 và Font Awesome 6 qua CDN,
 * bọc children trong GlobalAuthLockGuard để xử lý bảo vệ route và chế độ bảo trì.
 *
 * @param {{ children: ReactNode }} props
 * @returns {JSX.Element} HTML document với head và body đầy đủ.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
          rel="stylesheet"
        />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          rel="stylesheet"
        />
      </head>
      <body className="app-root">
        <GlobalAuthLockGuard>{children}</GlobalAuthLockGuard>
      </body>
    </html>
  );
}
