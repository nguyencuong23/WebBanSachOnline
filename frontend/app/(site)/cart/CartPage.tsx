"use client";

/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      CartPage.tsx
 * Mục đích:      Trang giỏ hàng — hiển thị danh sách sản phẩm đã thêm vào giỏ,
 *                cho phép cập nhật số lượng, xóa từng sản phẩm hoặc xóa toàn bộ,
 *                và hiển thị tóm tắt đơn hàng trước khi thanh toán.
 * Các chức năng chính:
 *   - Hiển thị danh sách cart items với ảnh, tên, giá, số lượng
 *   - Cập nhật số lượng (kiểm tra tồn kho)
 *   - Xóa từng sản phẩm hoặc xóa toàn bộ giỏ
 *   - Tóm tắt: tạm tính, ghi chú phí ship, nút checkout
 *
 * Tên module:    Cart Page
 * Module liên quan: lib/api.ts, lib/bookImage.ts
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Phạm Thị Hồng Chúc
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getBookImageUrl } from "@/lib/bookImage";
import { useLoading } from "../_components/LoadingContext";
import Link from "next/link";
import "./cart.css";

interface BookInfo {
  book_id: string;
  title: string;
  author: string;
  price: number;
  sale_price: number | null;
  is_on_sale: boolean;
  image_url: string | null;
  category_id: string;
  quantity: number; // tồn kho
}

interface CartItem {
  id: string;
  user_id: string;
  book_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  books: BookInfo;
}

export function CartPage() {
  const router = useRouter();
  const { setIsPageLoading } = useLoading();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      setIsPageLoading(true);
      setError(null);
      const res = await apiFetch<{ items: CartItem[] }>("/cart");
      setItems(res.items || []);
    } catch (e: unknown) {
      setError((e as Error).message || "Không thể tải giỏ hàng.");
    } finally {
      setLoading(false);
      setIsPageLoading(false);
    }
  }, [setIsPageLoading]);

  useEffect(() => {
    fetchCart();
    return () => {
      setIsPageLoading(false);
    };
  }, [fetchCart, setIsPageLoading]);

  const unitPrice = (item: CartItem) =>
    item.books?.is_on_sale && item.books?.sale_price
      ? Number(item.books.sale_price)
      : Number(item.books?.price || 0);

  const subtotal = items.reduce((s, x) => s + unitPrice(x) * x.quantity, 0);

  async function updateQty(item: CartItem, newQty: number) {
    if (newQty < 1) return;
    const stock = item.books?.quantity ?? 0;
    if (newQty > stock) return;
    setUpdatingId(item.book_id);
    try {
      await apiFetch(`/cart/${item.book_id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: newQty }),
      });
      setItems((prev) =>
        prev.map((x) => (x.book_id === item.book_id ? { ...x, quantity: newQty } : x))
      );
    } catch (e: unknown) {
      alert((e as Error).message || "Lỗi cập nhật số lượng.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeItem(bookId: string) {
    setUpdatingId(bookId);
    try {
      await apiFetch(`/cart/${bookId}`, { method: "DELETE" });
      setItems((prev) => prev.filter((x) => x.book_id !== bookId));
    } catch (e: unknown) {
      alert((e as Error).message || "Lỗi xóa sản phẩm.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function clearCart() {
    if (!confirm("Bạn có chắc muốn xóa toàn bộ giỏ hàng?")) return;
    setClearingAll(true);
    try {
      await apiFetch("/cart", { method: "DELETE" });
      setItems([]);
    } catch (e: unknown) {
      alert((e as Error).message || "Lỗi xóa giỏ hàng.");
    } finally {
      setClearingAll(false);
    }
  }

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <div className="cart-page">
        <div className="cart-container">
          <div className="cart-error">
            <i className="fas fa-exclamation-circle" />
            <p>{error}</p>
            <button className="btn-retry" onClick={fetchCart}>Thử lại</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-container">
        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">
              <i className="fas fa-shopping-basket" />
            </div>
            <h2>Giỏ hàng trống</h2>
            <p>Hãy khám phá và thêm những cuốn sách yêu thích vào giỏ hàng!</p>
            <Link href="/search" className="btn-shop-now">
              <i className="fas fa-search me-2" />
              Tìm kiếm sách
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            {/* Danh sách sản phẩm */}
            <div className="cart-items-section">
              <div className="cart-items-header">
                <span className="cart-items-title">Sản phẩm đã chọn</span>
                <button
                  className="btn-clear-all"
                  onClick={clearCart}
                  disabled={clearingAll}
                >
                  {clearingAll ? (
                    <><i className="fas fa-spinner fa-spin me-1" />Đang xóa...</>
                  ) : (
                    <><i className="fas fa-trash me-1" />Xóa tất cả</>
                  )}
                </button>
              </div>

              <div className="cart-items-list">
                {items.map((item) => {
                  const price = unitPrice(item);
                  const originalPrice = Number(item.books?.price || 0);
                  const isOnSale = item.books?.is_on_sale && item.books?.sale_price;
                  const imageUrl = getBookImageUrl(item.books?.image_url, item.books?.category_id);
                  const isUpdating = updatingId === item.book_id;
                  const stock = item.books?.quantity ?? 0;

                  return (
                    <div key={item.book_id} className={`cart-item ${isUpdating ? "cart-item--updating" : ""}`}>
                      {/* Ảnh sách */}
                      <div className="cart-item-image">
                        {imageUrl ? (
                          <img src={imageUrl} alt={item.books?.title} />
                        ) : (
                          <div className="cart-item-image-placeholder">
                            <i className="fas fa-book" />
                          </div>
                        )}
                        {isOnSale && <span className="sale-badge">Sale</span>}
                      </div>

                      {/* Thông tin */}
                      <div className="cart-item-info">
                        <Link href={`/search?q=${encodeURIComponent(item.books?.title || "")}`} className="cart-item-title">
                          {item.books?.title || item.book_id}
                        </Link>
                        <p className="cart-item-author">
                          <i className="fas fa-user-pen me-1" />
                          {item.books?.author || "—"}
                        </p>
                        <div className="cart-item-price-row">
                          <span className="cart-item-price">{price.toLocaleString("vi-VN")}đ</span>
                          {isOnSale && (
                            <span className="cart-item-original-price">{originalPrice.toLocaleString("vi-VN")}đ</span>
                          )}
                        </div>
                        {stock <= 5 && stock > 0 && (
                          <p className="cart-item-stock-warn">
                            <i className="fas fa-exclamation-triangle me-1" />
                            Chỉ còn {stock} sản phẩm
                          </p>
                        )}
                      </div>

                      {/* Điều chỉnh số lượng + xóa */}
                      <div className="cart-item-actions">
                        <div className="qty-control">
                          <button
                            className="qty-btn"
                            onClick={() => updateQty(item, item.quantity - 1)}
                            disabled={isUpdating || item.quantity <= 1}
                            aria-label="Giảm số lượng"
                          >
                            <i className="fas fa-minus" />
                          </button>
                          <input
                            className="qty-input"
                            type="number"
                            min={1}
                            max={stock}
                            value={item.quantity}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!isNaN(v)) updateQty(item, v);
                            }}
                            disabled={isUpdating}
                          />
                          <button
                            className="qty-btn"
                            onClick={() => updateQty(item, item.quantity + 1)}
                            disabled={isUpdating || item.quantity >= stock}
                            aria-label="Tăng số lượng"
                          >
                            <i className="fas fa-plus" />
                          </button>
                        </div>

                        <div className="cart-item-subtotal">
                          {(price * item.quantity).toLocaleString("vi-VN")}đ
                        </div>

                        <button
                          className="btn-remove"
                          onClick={() => removeItem(item.book_id)}
                          disabled={isUpdating}
                          aria-label="Xóa sản phẩm"
                        >
                          {isUpdating ? (
                            <i className="fas fa-spinner fa-spin" />
                          ) : (
                            <i className="fas fa-times" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tóm tắt đơn hàng */}
            <div className="cart-summary">
              <div className="cart-summary-card">
                <h3 className="cart-summary-title">
                  <i className="fas fa-receipt me-2" />
                  Tóm tắt đơn hàng
                </h3>

                <div className="cart-summary-rows">
                  <div className="summary-row">
                    <span>Tạm tính ({items.length} sản phẩm)</span>
                    <span>{subtotal.toLocaleString("vi-VN")}đ</span>
                  </div>
                  <div className="summary-row summary-row--note">
                    <span><i className="fas fa-truck me-1" />Phí vận chuyển</span>
                    <span className="text-muted">Tính ở bước thanh toán</span>
                  </div>
                </div>

                <div className="summary-divider" />

                <div className="summary-total">
                  <span>Tổng cộng</span>
                  <span className="summary-total-amount">{subtotal.toLocaleString("vi-VN")}đ</span>
                </div>

                <button
                  className="btn-checkout"
                  onClick={() => router.push("/checkout")}
                >
                  <i className="fas fa-credit-card me-2" />
                  Tiến hành thanh toán
                </button>

                <Link href="/search" className="btn-continue-shopping">
                  <i className="fas fa-arrow-left me-2" />
                  Tiếp tục mua sắm
                </Link>
              </div>

              <div className="cart-trust-badges">
                <div className="trust-badge">
                  <i className="fas fa-shield-alt" />
                  <span>Thanh toán bảo mật</span>
                </div>
                <div className="trust-badge">
                  <i className="fas fa-undo" />
                  <span>Đổi trả dễ dàng</span>
                </div>
                <div className="trust-badge">
                  <i className="fas fa-headset" />
                  <span>Hỗ trợ 24/7</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
