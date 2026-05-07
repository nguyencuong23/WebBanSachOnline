/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: page.tsx
 * Mục đích của file: Entry point cho trang chi tiết sách, nhận route dynamic `[bookId]`.
 * Các chức năng chính: Truyền `bookId` xuống component `BookDetailPage` để fetch dữ liệu.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Book Detail Route
 * Mục đích của module: Định tuyến cho từng cuốn sách cụ thể dựa trên ID.
 * Phạm vi xử lý: Server Component.
 * Các thành phần chính trong module: Page.
 * Module liên quan: BookDetailPage.tsx.
 * ============================================================================
 */
import { BookDetailPage } from "./BookDetailPage";

/**
 * Tên function: Page
 * Mục đích của function: Render trang chi tiết sách.
 * Tham số đầu vào: params (chứa bookId từ URL).
 * Giá trị trả về: Component BookDetailPage.
 */
export default function Page({ params }: { params: { bookId: string } }) {
  return <BookDetailPage bookId={params.bookId} />;
}
