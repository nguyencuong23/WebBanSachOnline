/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: page.tsx
 * Mục đích của file: Entry point cho trang Thanh toán.
 * Các chức năng chính: Render component CheckoutPage được bọc trong Suspense.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Checkout Route
 * Mục đích của module: Định tuyến cho URL `/checkout`.
 * Phạm vi xử lý: Server Component.
 * Các thành phần chính trong module: Page.
 * Module liên quan: CheckoutPage.tsx.
 * ============================================================================
 */
import { CheckoutPage } from "./CheckoutPage";
import { Suspense } from "react";

/**
 * Tên function: Page
 * Mục đích của function: Render trang thanh toán với Suspense fallback để xử lý searchParams an toàn.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: JSX Element.
 */
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
