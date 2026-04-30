/**
 * cart.ts — Tiện ích giỏ hàng client-side.
 *
 * addToCart / getCart / saveCart: dùng localStorage để "gửi" sản phẩm
 * lên API ngay khi user bấm "Thêm vào giỏ" trên trang sách.
 * CartPage sẽ gọi API /cart trực tiếp để hiển thị đầy đủ.
 */
import { apiFetch } from "./api";

export type CartLine = { book_id: string; quantity: number; title?: string; unit_price?: number };

const KEY = "btllib_cart";

export function getCart(): CartLine[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveCart(lines: CartLine[]) {
  localStorage.setItem(KEY, JSON.stringify(lines));
}

/**
 * Thêm sách vào giỏ hàng qua API (dành cho user đã đăng nhập).
 * Nếu gọi API thất bại (ví dụ chưa login), fallback về localStorage.
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
