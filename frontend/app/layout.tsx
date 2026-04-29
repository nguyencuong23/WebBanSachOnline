import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { GlobalAuthLockGuard } from "./(site)/_components/GlobalAuthLockGuard";

export const metadata: Metadata = {
  title: "Bookstore",
  description: "Cửa hàng sách trực tuyến"
};

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
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="app-root">
        <GlobalAuthLockGuard>{children}</GlobalAuthLockGuard>
      </body>
    </html>
  );
}
