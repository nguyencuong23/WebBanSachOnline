"use client";

/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      CategoriesAdmin.tsx
 * Mục đích:      Trang quản lý thể loại sách trong khu vực admin — cho phép
 *                xem, thêm, chỉnh sửa và xóa thể loại.
 * Các chức năng chính:
 *   - Hiển thị danh sách thể loại với tìm kiếm và sắp xếp realtime
 *   - Thêm thể loại mới (mã thể loại không thể sửa sau khi tạo)
 *   - Chỉnh sửa tên và mô tả thể loại
 *   - Xóa thể loại (có confirm dialog)
 *
 * Tên module:    Admin Category Management
 * Module liên quan: lib/api.ts, routes/categories.js (backend)
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * @component AdminCategoriesPage
 * @description Trang quản lý thể loại sách trong khu vực admin.
 *              Cung cấp giao diện CRUD cho thể loại với tìm kiếm và sắp xếp realtime.
 */
export function AdminCategoriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [keyword, setKeyword] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [error, setError] = useState<string | null>(null);

  const emptyForm = {
    category_id: "",
    name: "",
    description: ""
  };

  const [form, setForm] = useState<any>(emptyForm);
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);

  /**
   * Tải danh sách thể loại từ API với các tham số tìm kiếm và sắp xếp hiện tại.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function load() {
    try {
      const qs = new URLSearchParams();
      if (keyword.trim()) qs.append("search", keyword.trim());
      if (searchBy) qs.append("searchBy", searchBy);
      if (sortBy) qs.append("sort", sortBy);

      const res = await apiFetch<{ items: any[] }>(`/categories?${qs.toString()}`);
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  // Gọi API mỗi khi có thay đổi tìm kiếm/sắp xếp, có độ trễ 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, searchBy, sortBy]);

  /**
   * Lưu thể loại mới hoặc cập nhật thể loại hiện có.
   *
   * @async
   * @param {React.FormEvent} e - Sự kiện submit của form.
   * @returns {Promise<void>}
   */
  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();

    // Kiểm tra trùng lặp tên thể loại (không phân biệt hoa thường)
    const isDuplicate = items.some(
      (item) =>
        item.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
        item.category_id !== form.category_id
    );
    if (isDuplicate) {
      alert("Tên thể loại này đã tồn tại! Vui lòng nhập tên khác.");
      return;
    }

    try {
      if (modalMode === "add") {
        await apiFetch("/admin/categories", { method: "POST", body: JSON.stringify(form) });
      } else if (modalMode === "edit") {
        await apiFetch(`/admin/categories/${form.category_id}`, { method: "PATCH", body: JSON.stringify(form) });
      }
      setModalMode(null);
      await load();
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  /**
   * Xóa thể loại sau khi xác nhận.
   *
   * @async
   * @param {string} id - Mã thể loại cần xóa.
   * @returns {Promise<void>}
   */
  async function remove(id: string) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thể loại "${id}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await apiFetch(`/admin/categories/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  function openAdd() {
    setForm({ ...emptyForm });
    setModalMode("add");
  }

  function openEdit(category: any) {
    setForm({ ...emptyForm, ...category });
    setModalMode("edit");
  }

  return (
    <div>
      <style>{`
        .action-hover-wrapper { position: relative; display: inline-flex; align-items: center; }
        .action-hover-buttons {
          position: absolute; right: 100%; display: flex; gap: 8px; opacity: 0; visibility: hidden;
          transition: all 0.2s ease-in-out; padding: 6px 10px; margin-right: 8px;
          background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); z-index: 100;
        }
        .action-hover-wrapper:hover .action-hover-buttons { opacity: 1; visibility: visible; }
        .btn-action-icon { width: 32px; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; }
      `}</style>

      <div className="page-header mb-4">
        <h1><i className="fas fa-tags me-2" />Quản lý thể loại sách</h1>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div className="input-group" style={{ maxWidth: "500px" }}>
          <select className="form-select" style={{ maxWidth: "150px" }} value={searchBy} onChange={(e) => setSearchBy(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="category_id">Mã thể loại</option>
            <option value="name">Tên thể loại</option>
          </select>
          <input type="text" className="form-control" placeholder="Tìm kiếm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>

        <div className="d-flex align-items-center gap-2">
          <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name-asc">Tên: A-Z</option>
            <option value="name-desc">Tên: Z-A</option>
            <option value="category_id-asc">Mã: A-Z</option>
            <option value="category_id-desc">Mã: Z-A</option>
          </select>
          <button className="btn btn-primary text-nowrap" onClick={openAdd}><i className="fas fa-plus me-1"></i> Thêm thể loại</button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th style={{ width: "20%" }}>Mã thể loại</th>
                <th style={{ width: "30%" }}>Tên thể loại</th>
                <th>Mô tả</th>
                <th className="text-end" style={{ width: "100px" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.category_id}>
                  <td><span className="badge bg-secondary">{c.category_id}</span></td>
                  <td className="fw-bold">{c.name}</td>
                  <td className="text-muted small">{c.description || <span className="fst-italic opacity-50">Không có mô tả</span>}</td>
                  <td className="text-end">
                    <div className="action-hover-wrapper">
                      <div className="action-hover-buttons">
                        <button className="btn btn-outline-primary btn-action-icon" onClick={() => openEdit(c)}><i className="fas fa-edit"></i></button>
                        <button className="btn btn-outline-danger btn-action-icon" onClick={() => remove(c.category_id)}><i className="fas fa-trash-alt"></i></button>
                      </div>
                      <button className="btn btn-light btn-action-icon"><i className="fas fa-ellipsis-v"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted">Không tìm thấy thể loại nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalMode && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setModalMode(null)}></div>
          <div 
            className="modal fade show d-block" 
            style={{ zIndex: 1050 }} 
            tabIndex={-1} 
            onClick={() => setModalMode(null)}
          >
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header bg-light">
                  <h5 className="modal-title fw-bold text-primary">
                    <i className="fas fa-tags me-2"></i>
                    {modalMode === "add" ? "Thêm thể loại mới" : "Chỉnh sửa thể loại"}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setModalMode(null)}></button>
                </div>
                <div className="modal-body p-4">
                  <form onSubmit={saveCategory}>
                    <div className="mb-3">
                      <label className="form-label fw-bold small">Mã thể loại <span className="text-danger">*</span></label>
                      <input 
                        autoFocus
                        className={`form-control ${modalMode === "edit" ? "bg-light" : ""}`}
                        required 
                        readOnly={modalMode === "edit"}
                        placeholder="Ví dụ: VH, KT, TT..."
                        value={form.category_id} 
                        onChange={(e) => setForm((f: any) => ({ ...f, category_id: e.target.value.toUpperCase() }))} 
                      />
                      {modalMode === "add" && <div className="form-text">Mã thể loại dùng để định danh, viết liền không dấu, sẽ không thể sửa sau khi tạo.</div>}
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label fw-bold small">Tên thể loại <span className="text-danger">*</span></label>
                      <input 
                        className="form-control" 
                        required 
                        placeholder="Ví dụ: Văn Học, Kinh Tế..."
                        value={form.name} 
                        onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} 
                      />
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-bold small">Mô tả thêm</label>
                      <textarea 
                        className="form-control" 
                        rows={3}
                        placeholder="Mô tả chi tiết về thể loại này (không bắt buộc)..."
                        value={form.description || ""} 
                        onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))} 
                      ></textarea>
                    </div>

                    <div className="d-flex justify-content-end gap-2">
                      <button type="button" className="btn btn-light" onClick={() => setModalMode(null)}>Hủy bỏ</button>
                      <button type="submit" className="btn btn-primary px-4">
                        <i className="fas fa-save me-2"></i> Lưu lại
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
