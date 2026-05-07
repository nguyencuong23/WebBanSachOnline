/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: page.tsx
 * Mục đích của file: Entry point cho trang Tìm kiếm sách.
 * Các chức năng chính: Render component SearchPage bọc trong Suspense để xử lý searchParams.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Search Route
 * Mục đích của module: Định tuyến cho URL `/search`.
 * Phạm vi xử lý: Server Component.
 * Các thành phần chính trong module: Page.
 * Module liên quan: SearchPage.tsx.
 * ============================================================================
 */
import { Suspense } from "react";
import { SearchPage } from "./SearchPage";

/**
 * Tên function: Page
 * Mục đích của function: Render trang tìm kiếm bọc bằng Suspense do sử dụng hook useSearchParams().
 * Tham số đầu vào: Không có.
 * Giá trị trả về: JSX Element.
 */
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
