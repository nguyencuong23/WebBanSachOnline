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

export function addToCart(book: { book_id: string; title: string; price: number; sale_price?: number | null }, qty = 1) {
  const lines = getCart();
  const idx = lines.findIndex((x) => x.book_id === book.book_id);
  const unit = Number(book.sale_price ?? book.price);
  if (idx >= 0) lines[idx].quantity += qty;
  else lines.push({ book_id: book.book_id, quantity: qty, title: book.title, unit_price: unit });
  saveCart(lines);
}

