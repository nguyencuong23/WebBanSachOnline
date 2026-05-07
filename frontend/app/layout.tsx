/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: layout.tsx
 * Mục đích của file: Root Layout, định nghĩa cấu trúc HTML cơ bản và Metadata chung cho toàn bộ ứng dụng.
 * Các chức năng chính: Fetch cài đặt từ API để tạo SEO Metadata, nạp CSS globals, font chữ, bảo vệ route bằng GlobalAuthLockGuard.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Root Layout
 * Mục đích của module: Bọc toàn bộ ứng dụng Next.js.
 * Phạm vi xử lý: Server Component (app dir).
 * Các thành phần chính trong module: generateMetadata, RootLayout.
 * Module liên quan: GlobalAuthLockGuard.
 * ============================================================================
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { GlobalAuthLockGuard } from "./(site)/_components/GlobalAuthLockGuard";

// Ý nghĩa: URL cơ sở của API backend; Giá trị: chuỗi từ biến môi trường
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL as string;

/**
 * Tên function: generateMetadata
 * Mục đích của function: Tự động tạo thẻ meta (Title, Description, Icon) dựa trên cài đặt hệ thống.
 * Tham số đầu vào: Không có
 * Giá trị trả về: Promise<Metadata> (Cấu hình SEO cho Next.js).
 * Điều kiện xử lý: Gọi API `/settings`. Nếu lỗi sẽ trả về dữ liệu mặc định.
 * Lỗi có thể phát sinh: Lỗi fetch API sẽ bị catch và dùng fallback.
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      next: { revalidate: 0 },
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
    // fallback bên dưới
  }

  return {
    title: "Bookstore",
    description: "Cửa hàng sách trực tuyến",
    icons: { icon: "/favicon.ico" },
  };
}

/**
 * Tên function: RootLayout
 * Mục đích của function: Component gốc bao bọc tất cả các trang, chứa thẻ <html> và <body>.
 * Tham số đầu vào: children (ReactNode - nội dung của các trang con).
 * Giá trị trả về: JSX Element.
 * Điều kiện xử lý: Tải thư viện CSS ngoài (Bootstrap, FontAwesome) và bọc children bằng Guard.
 * Lỗi có thể phát sinh: Không có.
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
