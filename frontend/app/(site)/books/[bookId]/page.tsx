/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      page.tsx (books/[bookId])
 * Mục đích:      Route handler cho trang chi tiết sách tại "/books/[bookId]".
 *                Truyền bookId từ URL params xuống BookDetailPage.
 *
 * Tên module:    Book Detail Route
 * Module liên quan: BookDetailPage.tsx
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { BookDetailPage } from "./BookDetailPage";

export default function Page({ params }: { params: { bookId: string } }) {
  return <BookDetailPage bookId={params.bookId} />;
}
