/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      page.tsx (search)
 * Mục đích:      Route handler cho trang tìm kiếm tại "/search".
 *                Bọc SearchPage trong Suspense vì dùng useSearchParams.
 *
 * Tên module:    Search Route
 * Module liên quan: SearchPage.tsx
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { Suspense } from "react";
import { SearchPage } from "./SearchPage";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    }>
      <SearchPage />
    </Suspense>
  );
}
