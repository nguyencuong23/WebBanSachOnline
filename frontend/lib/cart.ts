/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: cart.ts
 * Mục đích của file: Quản lý thao tác giỏ hàng phía Client.
 * Các chức năng chính: Thêm sách vào giỏ (gọi API hoặc lưu LocalStorage), lấy/lưu giỏ hàng LocalStorage (fallback).
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Cart Utils
 * Mục đích của module: Tiện ích giỏ hàng client-side.
 * Phạm vi xử lý: Client-side.
 * Các thành phần chính trong module: addToCart, getCart, saveCart.
 * Module liên quan: api.ts.
 * ============================================================================
 */
import { apiFetch } from "./api";

/**
 * Tên class/interface: CartLine
 * Mục đích của class/interface: Kiểu dữ liệu lưu cấu trúc cơ bản của 1 dòng giỏ hàng trong LocalStorage.
 */
export type CartLine = { book_id: string; quantity: number; title?: string; unit_price?: number };

const KEY = "btllib_cart";

/**
 * Tên function: getCart
 * Mục đích của function: Đọc danh sách giỏ hàng fallback từ LocalStorage.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Mảng CartLine.
 */
export function getCart(): CartLine[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

/**
 * Tên function: saveCart
 * Mục đích của function: Lưu danh sách giỏ hàng fallback vào LocalStorage.
 * Tham số đầu vào: lines (mảng CartLine).
 * Giá trị trả về: Không có.
 */
export function saveCart(lines: CartLine[]) {
  localStorage.setItem(KEY, JSON.stringify(lines));
}

/**
 * Tên function: addToCart
 * Mục đích của function: Thêm sách vào giỏ hàng qua API. Nếu API fail (vd chưa login), fallback lưu vào LocalStorage.
 * Tham số đầu vào: book (thông tin sách), qty (số lượng).
 * Giá trị trả về: Promise<void>.
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
