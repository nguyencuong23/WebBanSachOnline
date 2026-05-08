/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      page.tsx (checkout)
 * Mục đích:      Route handler cho trang thanh toán tại "/checkout".
 *                Bọc CheckoutPage trong Suspense vì dùng useSearchParams.
 *
 * Tên module:    Checkout Route
 * Module liên quan: CheckoutPage.tsx
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { CheckoutPage } from "./CheckoutPage";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    }>
      <CheckoutPage />
    </Suspense>
  );
}
