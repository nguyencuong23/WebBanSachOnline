import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { GlobalAuthLockGuard } from "./(site)/_components/GlobalAuthLockGuard";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL as string;

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
