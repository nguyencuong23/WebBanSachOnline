/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      cart.ts
 * Mục đích:      Cung cấp các hàm tiện ích quản lý giỏ hàng phía client.
 *                Ưu tiên gọi API server-side khi đã đăng nhập, fallback về
 *                localStorage khi chưa đăng nhập.
 * Các chức năng chính:
 *   - CartLine   : Type mô tả một dòng sản phẩm trong giỏ hàng
 *   - getCart    : Đọc giỏ hàng từ localStorage
 *   - saveCart   : Lưu giỏ hàng vào localStorage
 *   - addToCart  : Thêm sách vào giỏ qua API (fallback localStorage nếu chưa login)
 *
 * Tên module:    Cart Utilities
 * Module liên quan: lib/api.ts, app/(site)/cart/CartPage.tsx,
 *                   app/(site)/books/[bookId]/BookDetailPage.tsx
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       CartPage hiển thị giỏ hàng bằng cách gọi API /cart trực tiếp,
 *                không đọc từ localStorage. localStorage chỉ dùng làm fallback
 *                tạm thời khi user chưa đăng nhập.
 * ============================================================================
 */
import { apiFetch } from "./api";

/** Một dòng sản phẩm trong giỏ hàng */
export type CartLine = { book_id: string; quantity: number; title?: string; unit_price?: number };

// Key lưu giỏ hàng trong localStorage
const KEY = "btllib_cart";

/**
 * Đọc giỏ hàng hiện tại từ localStorage.
 * Trả về mảng rỗng nếu chưa có dữ liệu hoặc dữ liệu bị lỗi.
 *
 * @returns {CartLine[]} Danh sách sản phẩm trong giỏ hàng.
 */
export function getCart(): CartLine[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

/**
 * Lưu giỏ hàng vào localStorage.
 *
 * @param {CartLine[]} lines - Danh sách sản phẩm cần lưu.
 */
export function saveCart(lines: CartLine[]) {
  localStorage.setItem(KEY, JSON.stringify(lines));
}

/**
 * Thêm sách vào giỏ hàng qua API (dành cho user đã đăng nhập).
 * Nếu gọi API thất bại (ví dụ chưa login), fallback về localStorage.
 *
 * @async
 * @param {{ book_id: string; title: string; price: number; sale_price?: number | null; is_on_sale?: boolean }} book
 *   Thông tin sách cần thêm vào giỏ.
 * @param {number} [qty=1] - Số lượng cần thêm (mặc định là 1).
 * @returns {Promise<void>}
 */
export async function addToCart(
  book: { book_id: string; title: string; price: number; sale_price?: number | null; is_on_sale?: boolean },
  qty = 1
): Promise<void> {
  try {
    await apiFetch("/cart", {
      method: "POST",
      body: JSON.stringify({ book_id: book.book_id, quantity: qty }),
    });
  } catch {
    // Fallback: lưu vào localStorage nếu chưa đăng nhập
    const lines = getCart();
    const idx = lines.findIndex((x) => x.book_id === book.book_id);
    const unit = book.is_on_sale && book.sale_price ? Number(book.sale_price) : Number(book.price);
    if (idx >= 0) lines[idx].quantity += qty;
    else lines.push({ book_id: book.book_id, quantity: qty, title: book.title, unit_price: unit });
    saveCart(lines);
  }
}
