/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: CartPage.tsx
 * Mục đích của file: Hiển thị giao diện trang Giỏ hàng và xử lý các thao tác với giỏ hàng.
 * Các chức năng chính: Hiển thị danh sách sản phẩm trong giỏ, thay đổi số lượng, xóa sản phẩm, xóa toàn bộ giỏ hàng, chuyển hướng đến thanh toán.
 * Phiên bản: 1.0.0
 * Tác giả: Phạm Thị Hồng Chúc
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Cart (Giỏ hàng)
 * Mục đích của module: Quản lý giỏ hàng của người dùng trên giao diện.
 * Phạm vi xử lý: Client-side rendering, giao tiếp với API backend "/cart".
 * Các thành phần chính trong module: CartPage component, danh sách CartItem, tổng kết đơn hàng (Summary).
 * Module liên quan: Checkout (Thanh toán), Search (Tìm kiếm sản phẩm), Book Detail (Chi tiết sách).
 * ============================================================================
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getBookImageUrl } from "@/lib/bookImage";
import Link from "next/link";
import "./cart.css";

/**
 * Tên class/interface: BookInfo
 * Mục đích của class/interface: Kiểu dữ liệu mô tả thông tin chi tiết của sách trong giỏ hàng.
 * Vai trò trong hệ thống: Interface Type.
 */
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

/**
 * Tên class/interface: CartItem
 * Mục đích của class/interface: Kiểu dữ liệu mô tả một mục sản phẩm trong giỏ hàng.
 * Vai trò trong hệ thống: Interface Type.
 */
interface CartItem {
  id: string;
  user_id: string;
  book_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  books: BookInfo;
}

/**
 * Tên function: CartPage
 * Mục đích của function: React component chính để hiển thị trang giỏ hàng.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: JSX Element (Giao diện trang giỏ hàng).
 * Điều kiện xử lý: Component chỉ chạy trên client-side (use client).
 * Lỗi có thể phát sinh: Lỗi gọi API lấy giỏ hàng, lỗi cập nhật/xóa sản phẩm (được xử lý và hiển thị thông báo).
 */
export function CartPage() {
  const router = useRouter(); // Ý nghĩa: Hook điều hướng của Next.js; Giá trị: router object; Lý do: Cần để chuyển trang sang checkout
  const [items, setItems] = useState<CartItem[]>([]); // Ý nghĩa: Danh sách sản phẩm trong giỏ; Giá trị: mảng các CartItem; Lý do: Lưu trữ trạng thái giỏ hàng hiện tại
  const [loading, setLoading] = useState(true); // Ý nghĩa: Trạng thái đang tải dữ liệu; Giá trị: boolean; Lý do: Hiển thị loading spinner khi fetch data
  const [error, setError] = useState<string | null>(null); // Ý nghĩa: Thông báo lỗi nếu có; Giá trị: chuỗi lỗi hoặc null; Lý do: Hiển thị lỗi cho người dùng
  const [updatingId, setUpdatingId] = useState<string | null>(null); // Ý nghĩa: ID của sản phẩm đang được cập nhật/xóa; Giá trị: chuỗi ID hoặc null; Lý do: Disable các nút hành động khi đang gọi API
  const [clearingAll, setClearingAll] = useState(false); // Ý nghĩa: Trạng thái đang xóa toàn bộ giỏ; Giá trị: boolean; Lý do: Disable nút "Xóa tất cả" khi đang thực thi

  /**
   * Tên function: fetchCart
   * Mục đích của function: Gọi API để lấy danh sách sản phẩm trong giỏ hàng hiện tại của người dùng.
   * Tham số đầu vào: Không có.
   * Giá trị trả về: Promise<void> (cập nhật state `items`, `loading`, `error`).
   * Điều kiện xử lý: Được gọi khi component mount hoặc cần tải lại giỏ hàng.
   * Lỗi có thể phát sinh: Lỗi mạng, lỗi backend trả về (cập nhật vào state `error`).
   */
  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<{ items: CartItem[] }>("/cart");
      setItems(res.items || []);
    } catch (e: unknown) {
      setError((e as Error).message || "Không thể tải giỏ hàng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  /**
   * Tên function: unitPrice
   * Mục đích của function: Tính toán đơn giá thực tế của một sản phẩm trong giỏ (ưu tiên giá khuyến mãi nếu có).
   * Tham số đầu vào: item (CartItem) - Thông tin sản phẩm trong giỏ hàng.
   * Giá trị trả về: number - Đơn giá áp dụng.
   * Điều kiện xử lý: Kiểm tra cờ `is_on_sale` và `sale_price` hợp lệ.
   * Lỗi có thể phát sinh: Không có.
   */
  const unitPrice = (item: CartItem) =>
    item.books?.is_on_sale && item.books?.sale_price
      ? Number(item.books.sale_price)
      : Number(item.books?.price || 0);

  const subtotal = items.reduce((s, x) => s + unitPrice(x) * x.quantity, 0); // Ý nghĩa: Tổng tiền tạm tính của giỏ hàng; Giá trị: tổng số tiền các sản phẩm; Đơn vị: VNĐ; Lý do: Hiển thị phần tóm tắt đơn hàng

  /**
   * Tên function: updateQty
   * Mục đích của function: Gửi request cập nhật số lượng của một sản phẩm trong giỏ hàng.
   * Tham số đầu vào: 
   *  - item (CartItem): Sản phẩm cần cập nhật.
   *  - newQty (number): Số lượng mới cần đặt.
   * Giá trị trả về: Promise<void>.
   * Điều kiện xử lý: newQty phải >= 1 và <= số lượng tồn kho (stock).
   * Lỗi có thể phát sinh: Lỗi gọi API PATCH, hiện alert thông báo.
   */
  async function updateQty(item: CartItem, newQty: number) {
    if (newQty < 1) return;
    const stock = item.books?.quantity ?? 0; // Ý nghĩa: Số lượng tồn kho của sản phẩm; Giá trị: số nguyên >= 0; Đơn vị: quyển; Lý do: Kiểm tra để không cho phép mua quá số lượng có sẵn
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

  /**
   * Tên function: removeItem
   * Mục đích của function: Xóa một sản phẩm khỏi giỏ hàng.
   * Tham số đầu vào: bookId (string) - ID của sách cần xóa.
   * Giá trị trả về: Promise<void>.
   * Điều kiện xử lý: Gửi request DELETE tới API.
   * Lỗi có thể phát sinh: Lỗi gọi API DELETE, hiện alert thông báo.
   */
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

  /**
   * Tên function: clearCart
   * Mục đích của function: Xóa toàn bộ sản phẩm trong giỏ hàng sau khi xác nhận.
   * Tham số đầu vào: Không có.
   * Giá trị trả về: Promise<void>.
   * Điều kiện xử lý: Người dùng phải confirm trước khi xóa.
   * Lỗi có thể phát sinh: Lỗi gọi API DELETE toàn bộ, hiện alert thông báo.
   */
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
    return (
      <div className="cart-page">
        <div className="cart-container">
          <div className="cart-loading">
            <div className="cart-spinner" />
            <p>Đang tải giỏ hàng...</p>
          </div>
        </div>
      </div>
    );
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
                  const price = unitPrice(item); // Ý nghĩa: Giá bán áp dụng; Giá trị: số tiền; Đơn vị: VNĐ
                  const originalPrice = Number(item.books?.price || 0); // Ý nghĩa: Giá gốc chưa giảm; Giá trị: số tiền; Đơn vị: VNĐ
                  const isOnSale = item.books?.is_on_sale && item.books?.sale_price; // Ý nghĩa: Cờ báo sản phẩm đang giảm giá; Giá trị: boolean hoặc giá trị truthy
                  const imageUrl = getBookImageUrl(item.books?.image_url, item.books?.category_id); // Ý nghĩa: URL ảnh hợp lệ của sản phẩm; Giá trị: chuỗi URL; Lý do: Hiển thị ảnh bìa sách
                  const isUpdating = updatingId === item.book_id; // Ý nghĩa: Cờ báo sản phẩm này đang bị thao tác API; Giá trị: boolean; Lý do: Khóa (disable) UI của sản phẩm đang cập nhật
                  const stock = item.books?.quantity ?? 0; // Ý nghĩa: Tồn kho hiện tại; Giá trị: số lượng sách; Đơn vị: quyển

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
