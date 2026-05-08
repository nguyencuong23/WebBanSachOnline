"use client";

/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      CartsAdmin.tsx
 * Mục đích:      Trang quản lý giỏ hàng trong khu vực admin — cho phép xem,
 *                thêm, cập nhật số lượng và xóa sản phẩm trong giỏ hàng của
 *                bất kỳ người dùng nào.
 * Các chức năng chính:
 *   - Hiển thị danh sách cart_items với thông tin user và sách kèm theo
 *   - Tìm kiếm theo tên khách hàng, email hoặc tên sách
 *   - Cập nhật số lượng trực tiếp trên bảng (inline edit)
 *   - Xóa sản phẩm khỏi giỏ hàng
 *   - Thêm sản phẩm vào giỏ hàng của user bất kỳ (dùng EntityPicker)
 *   - Cảnh báo khi số lượng trong giỏ vượt quá tồn kho
 *
 * Tên module:    Admin Cart Management
 * Module liên quan: lib/api.ts, _components/EntityPicker.tsx, lib/bookImage.ts
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { EntityPicker } from "../_components/EntityPicker";
import { getBookImageUrl } from "@/lib/bookImage";

/**
 * @component CartsAdmin
 * @description Trang quản lý giỏ hàng trong khu vực admin.
 *              Hiển thị tất cả cart_items của mọi người dùng với khả năng
 *              chỉnh sửa số lượng và xóa sản phẩm trực tiếp.
 */
export function CartsAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [sortBy, setSortBy] = useState("created_at-desc");

  // Form thêm giỏ hàng
  const [modalMode, setModalMode] = useState<"add" | null>(null);
  const [addForm, setAddForm] = useState({ user_id: "", book_id: "", quantity: 1 });
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  /**
   * Tải danh sách cart_items từ API với các tham số tìm kiếm và sắp xếp hiện tại.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (keyword.trim()) qs.append("search", keyword.trim());
      if (searchBy) qs.append("searchBy", searchBy);
      if (sortBy) qs.append("sort", sortBy);
      const res = await apiFetch<{ items: any[] }>(`/admin/carts?${qs.toString()}`);
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [keyword, searchBy, sortBy]);

  /**
   * Cập nhật số lượng sản phẩm trong giỏ hàng.
   * Nếu số lượng < 1, tự động xóa sản phẩm khỏi giỏ.
   *
   * @async
   * @param {number} id       - ID của cart_item cần cập nhật.
   * @param {number} quantity - Số lượng mới (nếu < 1 sẽ xóa item).
   * @returns {Promise<void>}
   */
  async function updateQuantity(id: number, quantity: number) {
    if (quantity < 1) return removeCartItem(id);
    try {
      await apiFetch(`/admin/carts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
      load();
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  /**
   * Xóa một sản phẩm khỏi giỏ hàng sau khi xác nhận.
   *
   * @async
   * @param {number} id - ID của cart_item cần xóa.
   * @returns {Promise<void>}
   */
  async function removeCartItem(id: number) {
    if (!window.confirm("Xóa sản phẩm này khỏi giỏ hàng?")) return;
    try {
      await apiFetch(`/admin/carts/${id}`, { method: "DELETE" });
      load();
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  /**
   * Xử lý submit form thêm sản phẩm vào giỏ hàng của user.
   * Validate dữ liệu đầu vào trước khi gọi API.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function handleAddItem() {
    setAddError(null);
    if (!addForm.user_id.trim()) { setAddError("Vui lòng nhập User ID."); return; }
    if (!addForm.book_id.trim()) { setAddError("Vui lòng nhập mã sách."); return; }
    if (addForm.quantity < 1) { setAddError("Số lượng phải lớn hơn 0."); return; }
    
    setAddSaving(true);
    try {
      await apiFetch(`/admin/carts`, {
        method: "POST",
        body: JSON.stringify({ 
          user_id: addForm.user_id.trim(), 
          book_id: addForm.book_id.trim(), 
          quantity: Number(addForm.quantity) 
        }),
      });
      setAddForm({ user_id: "", book_id: "", quantity: 1 });
      setModalMode(null);
      load();
    } catch (e: any) {
      setAddError(e.message || String(e));
    } finally {
      setAddSaving(false);
    }
  }

  const fmt = (val: any) => (val ? Number(val).toLocaleString("vi-VN") : "0");

  return (
    <div>
      <style>{`
        .qty-input { width: 60px; text-align: center; border: 1px solid #dee2e6; border-radius: 4px; padding: 2px 4px; font-size: 0.9rem; }
        .qty-input:focus { outline: 2px solid #2563eb; border-color: transparent; }
      `}</style>

      <div className="page-header mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h1><i className="fas fa-shopping-basket me-2" />Quản lý giỏ hàng</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setModalMode("add")}>
          <i className="fas fa-plus me-2" />Thêm vào giỏ
        </button>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <select className="form-select flex-shrink-0" style={{ maxWidth: "150px" }} value={searchBy} onChange={e => setSearchBy(e.target.value)}>
                  <option value="all">Tất cả</option>
                  <option value="user_name">Tên khách hàng</option>
                  <option value="user_email">Email</option>
                  <option value="book_title">Tên sách</option>
                </select>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập từ khoá..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-6">
              <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="created_at-desc">Ngày thêm (Mới nhất)</option>
                <option value="created_at-asc">Ngày thêm (Cũ nhất)</option>
                <option value="user-asc">Khách hàng (A-Z)</option>
                <option value="user-desc">Khách hàng (Z-A)</option>
                <option value="book-asc">Tên sách (A-Z)</option>
                <option value="book-desc">Tên sách (Z-A)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="table-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Sản phẩm</th>
                <th className="text-center">Đơn giá</th>
                <th className="text-center" style={{ width: 140 }}>Số lượng</th>
                <th className="text-end">Tạm tính</th>
                <th className="text-end" style={{ width: 80 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && (
                <tr><td colSpan={6} className="text-center py-4 text-muted"><i className="fas fa-spinner fa-spin me-2" />Đang tải...</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={6} className="text-center py-4 text-muted">Hiện chưa có dữ liệu giỏ hàng.</td></tr>
              )}
              {items.map((item) => {
                const price = item.books?.is_on_sale ? item.books.sale_price : item.books?.price;
                const lineTotal = (price || 0) * item.quantity;
                const stockWarn = item.books?.quantity != null && item.books.quantity < item.quantity;
                
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="fw-semibold">{item.user?.full_name || "Chưa cập nhật tên"}</div>
                      <div className="text-muted small">{item.user?.email || item.user_id}</div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {item.books?.image_url && (
                          <img src={getBookImageUrl(item.books.image_url, item.books.category_id)} alt="" style={{ width: 36, height: 52, objectFit: "cover", borderRadius: 4 }} />
                        )}
                        <div>
                          <div className="fw-semibold">{item.books?.title || item.book_id}</div>
                          <div className="text-muted small">Mã: {item.book_id}</div>
                          {stockWarn && <div className="text-danger small"><i className="fas fa-exclamation-triangle me-1" />Tồn kho: {item.books?.quantity}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="text-center">{fmt(price)} đ</td>
                    <td className="text-center">
                      <div className="d-flex align-items-center justify-content-center gap-1">
                        <button className="btn btn-outline-secondary btn-sm py-0" style={{ width: 28, height: 28 }} onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                        <input
                          type="number"
                          className="qty-input"
                          value={item.quantity}
                          min={1}
                          onChange={e => {
                            const q = parseInt(e.target.value);
                            if (q > 0) updateQuantity(item.id, q);
                          }}
                        />
                        <button className="btn btn-outline-secondary btn-sm py-0" style={{ width: 28, height: 28 }} onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>
                    </td>
                    <td className="text-end fw-bold text-danger">{fmt(lineTotal)} đ</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-danger" onClick={() => removeCartItem(item.id)} title="Xóa khỏi giỏ">
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== MODAL THÊM GIỎ HÀNG ===== */}
      {modalMode === "add" && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setModalMode(null)} />
          <div className="modal fade show d-block" style={{ zIndex: 1050 }} onClick={() => setModalMode(null)}>
            <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold"><i className="fas fa-cart-plus me-2 text-primary" />Thêm vào giỏ hàng</h5>
                  <button className="btn-close" onClick={() => setModalMode(null)} />
                </div>
                <div className="modal-body">
                  {addError && <div className="alert alert-danger py-2 small">{addError}</div>}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">User (UUID) <span className="text-danger">*</span></label>
                    <EntityPicker
                      entityType="users"
                      value={addForm.user_id}
                      onChange={val => setAddForm({ ...addForm, user_id: val })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Mã sách (book_id) <span className="text-danger">*</span></label>
                    <EntityPicker
                      entityType="books"
                      value={addForm.book_id}
                      onChange={val => setAddForm({ ...addForm, book_id: val })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Số lượng <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      min={1}
                      value={addForm.quantity}
                      onChange={e => setAddForm({ ...addForm, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setModalMode(null)}>Hủy</button>
                  <button className="btn btn-primary" onClick={handleAddItem} disabled={addSaving}>
                    {addSaving ? <><i className="fas fa-spinner fa-spin me-2" />Đang lưu...</> : <><i className="fas fa-save me-2" />Lưu lại</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
