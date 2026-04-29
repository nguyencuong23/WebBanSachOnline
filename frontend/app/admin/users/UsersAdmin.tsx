"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export function AdminUsersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [keyword, setKeyword] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [sortBy, setSortBy] = useState("created_at-desc");
  const [filterRole, setFilterRole] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    apiFetch<{ profile: any }>("/me").then(res => setCurrentUser(res?.profile)).catch(console.error);
  }, []);

  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [form, setForm] = useState<any>({});

  async function load() {
    try {
      const qs = new URLSearchParams();
      if (keyword.trim()) qs.append("search", keyword.trim());
      if (searchBy) qs.append("searchBy", searchBy);
      if (sortBy) qs.append("sort", sortBy);
      if (filterRole) qs.append("role", filterRole);
      if (filterActive) qs.append("active", filterActive);

      const res = await apiFetch<{ items: any[] }>(`/admin/users?${qs.toString()}`);
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  // Polling with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, searchBy, sortBy, filterRole, filterActive]);

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (modalMode === "add") {
        await apiFetch(`/admin/users`, { 
          method: "POST", 
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            username: form.username,
            full_name: form.full_name,
            phone_number: form.phone_number,
            role: form.role,
            is_active: form.is_active
          }) 
        });
      } else if (modalMode === "edit") {
        await apiFetch(`/admin/users/${form.user_id}`, { 
          method: "PATCH", 
          body: JSON.stringify({
            username: form.username,
            full_name: form.full_name,
            phone_number: form.phone_number,
            avatar_url: form.avatar_url,
            default_address: form.default_address,
            loyalty_points: form.loyalty_points,
            customer_note: form.customer_note,
            role: form.role,
            is_active: form.is_active
          }) 
        });
      }
      setModalMode(null);
      await load();
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  function openAdd() {
    setForm({ role: "user", is_active: true });
    setModalMode("add");
  }

  function openEdit(user: any) {
    setForm({ ...user });
    setModalMode("edit");
  }

  async function removeUser(id: string, name: string) {
    if (currentUser?.user_id === id) {
      alert("Bạn không thể xóa tài khoản của chính mình.");
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa người dùng "${name}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  async function toggleLockUser(id: string, name: string, is_active: boolean) {
    if (currentUser?.user_id === id) {
      alert("Bạn không thể khóa/mở khóa tài khoản của chính mình.");
      return;
    }
    const action = is_active ? "khóa" : "mở khóa";
    if (!window.confirm(`Bạn có chắc chắn muốn ${action} người dùng "${name}"?`)) return;
    try {
      await apiFetch(`/admin/users/${id}/toggle-status`, { method: "POST" });
      await load();
    } catch (e: any) {
      alert(e.message || String(e));
    }
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
        <h1><i className="fas fa-users me-2" />Quản lý người dùng</h1>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div className="input-group" style={{ maxWidth: "500px" }}>
          <select className="form-select" style={{ maxWidth: "150px" }} value={searchBy} onChange={(e) => setSearchBy(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="full_name">Họ tên</option>
            <option value="email">Email</option>
            <option value="phone_number">Số điện thoại</option>
          </select>
          <input type="text" className="form-control" placeholder="Tìm kiếm người dùng..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>

        <div className="d-flex align-items-center gap-2">
          <select className="form-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="">Lọc Vai trò</option>
            <option value="user">Khách hàng</option>
            <option value="admin">Quản trị viên</option>
          </select>
          <select className="form-select" value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
            <option value="">Lọc Trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã khóa</option>
          </select>
          <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="created_at-desc">Mới nhất</option>
            <option value="created_at-asc">Cũ nhất</option>
            <option value="full_name-asc">Tên: A-Z</option>
            <option value="full_name-desc">Tên: Z-A</option>
          </select>
          <button className="btn btn-primary text-nowrap ms-2" onClick={openAdd}>
            <i className="fas fa-plus me-1"></i> Thêm người dùng
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Tên đăng nhập</th>
                <th>Liên hệ</th>
                <th className="text-center">Vai trò</th>
                <th className="text-center">Trạng thái</th>
                <th className="text-center">Điểm</th>
                <th>Ngày tham gia</th>
                <th className="text-end" style={{ width: "80px" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.user_id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="Avatar" className="user-avatar-small rounded-circle" style={{ width: '32px', height: '32px', objectFit: 'cover' }} onError={e => e.currentTarget.style.display = 'none'} />
                      ) : (
                        <div className="user-avatar-small bg-primary text-white">
                          {(u.full_name || u.username || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="fw-bold">{u.full_name || "Chưa cập nhật"}</div>
                    </div>
                  </td>
                  <td>
                    <div className="fw-bold">{u.username || <span className="text-muted fst-italic">Chưa có</span>}</div>
                  </td>
                  <td>
                    <div>{u.email}</div>
                    <div className="text-muted small">{u.phone_number || "Chưa cập nhật SDT"}</div>
                  </td>
                  <td className="text-center">
                    {u.role === "admin" ? (
                      <span className="badge bg-danger"><i className="fas fa-shield-alt me-1"></i>Admin</span>
                    ) : (
                      <span className="badge bg-secondary">User</span>
                    )}
                  </td>
                  <td className="text-center">
                    {u.is_active ? (
                      <span className="badge bg-success">Đang hoạt động</span>
                    ) : (
                      <span className="badge bg-warning text-dark">Đã khóa</span>
                    )}
                  </td>
                  <td className="text-center fw-bold text-success">
                    {u.loyalty_points || 0}
                  </td>
                  <td className="text-muted small">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("vi-VN") : ""}
                  </td>
                  <td className="text-end">
                    <div className="action-hover-wrapper">
                      <div className="action-hover-buttons">
                        <button className="btn btn-outline-primary btn-action-icon" onClick={() => openEdit(u)} title="Chỉnh sửa">
                          <i className="fas fa-edit"></i>
                        </button>
                        {currentUser?.user_id !== u.user_id && (
                          <>
                            <button className={`btn btn-outline-${u.is_active ? 'warning' : 'success'} btn-action-icon`} onClick={() => toggleLockUser(u.user_id, u.full_name || u.email, u.is_active)} title={u.is_active ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
                              <i className={`fas ${u.is_active ? 'fa-lock' : 'fa-unlock'}`}></i>
                            </button>
                            <button className="btn btn-outline-danger btn-action-icon" onClick={() => removeUser(u.user_id, u.full_name || u.email)} title="Xóa">
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </>
                        )}
                      </div>
                      <button className="btn btn-light btn-action-icon"><i className="fas fa-ellipsis-v"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">Không tìm thấy người dùng nào.</td>
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
            <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header bg-light">
                  <h5 className="modal-title fw-bold text-primary">
                    <i className={modalMode === "add" ? "fas fa-user-plus me-2" : "fas fa-user-edit me-2"}></i> 
                    {modalMode === "add" ? "Thêm người dùng mới" : "Chi tiết & Chỉnh sửa người dùng"}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setModalMode(null)}></button>
                </div>
                <div className="modal-body p-4">
                  <form onSubmit={saveUser}>
                    <div className="row">
                      {/* Cột trái: Thông tin cơ bản */}
                      <div className="col-md-6 border-end pe-4">
                        <h6 className="fw-bold mb-3 border-bottom pb-2">Thông tin cơ bản</h6>
                        {modalMode === "edit" && (
                          <div className="mb-3">
                            <label className="form-label fw-bold small text-muted">ID Người dùng</label>
                            <input className="form-control form-control-sm bg-light" readOnly value={form.user_id || ""} />
                          </div>
                        )}
                        <div className="mb-3">
                          <label className="form-label fw-bold small">Tên đăng nhập (Username)</label>
                          <input 
                            className="form-control" 
                            value={form.username || ""} 
                            onChange={(e) => setForm((f: any) => ({ ...f, username: e.target.value }))} 
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-bold small">Họ tên (Full name)</label>
                          <input 
                            className="form-control" 
                            value={form.full_name || ""} 
                            onChange={(e) => setForm((f: any) => ({ ...f, full_name: e.target.value }))} 
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-bold small">Email</label>
                          <input 
                            className={modalMode === "add" ? "form-control" : "form-control bg-light"} 
                            readOnly={modalMode !== "add"} 
                            required={modalMode === "add"}
                            type="email"
                            value={form.email || ""} 
                            onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} 
                          />
                        </div>
                        {modalMode === "add" && (
                          <div className="mb-3">
                            <label className="form-label fw-bold small">Mật khẩu</label>
                            <input 
                              className="form-control" 
                              required 
                              type="password"
                              value={form.password || ""} 
                              onChange={(e) => setForm((f: any) => ({ ...f, password: e.target.value }))} 
                            />
                          </div>
                        )}
                        <div className="mb-3">
                          <label className="form-label fw-bold small">Số điện thoại</label>
                          <input 
                            className="form-control" 
                            value={form.phone_number || ""} 
                            onChange={(e) => setForm((f: any) => ({ ...f, phone_number: e.target.value }))} 
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-bold small">Đường dẫn ảnh đại diện (Avatar URL)</label>
                          <input 
                            className="form-control" 
                            value={form.avatar_url || ""} 
                            onChange={(e) => setForm((f: any) => ({ ...f, avatar_url: e.target.value }))} 
                          />
                        </div>
                      </div>

                      {/* Cột phải: Thiết lập & Thông tin bổ sung */}
                      <div className="col-md-6 ps-4">
                        <h6 className="fw-bold mb-3 border-bottom pb-2">Thiết lập & Khác</h6>
                        <div className="row mb-3">
                          <div className="col-6">
                            <label className="form-label fw-bold small">Vai trò</label>
                            <select 
                              className="form-select" 
                              value={form.role} 
                              onChange={(e) => setForm((f: any) => ({ ...f, role: e.target.value }))}
                            >
                              <option value="user">Người dùng (User)</option>
                              <option value="admin">Quản trị viên (Admin)</option>
                            </select>
                          </div>
                          <div className="col-6">
                            <label className="form-label fw-bold small">Trạng thái</label>
                            <select 
                              className="form-select" 
                              disabled={modalMode === "edit" && currentUser?.user_id === form.user_id}
                              value={form.is_active ? "true" : "false"} 
                              onChange={(e) => setForm((f: any) => ({ ...f, is_active: e.target.value === "true" }))}
                            >
                              <option value="true">Đang hoạt động</option>
                              <option value="false">Khóa tài khoản</option>
                            </select>
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="form-label fw-bold small">Điểm thưởng (Loyalty Points)</label>
                          <input 
                            type="number"
                            className="form-control" 
                            min="0"
                            value={form.loyalty_points || 0} 
                            onChange={(e) => setForm((f: any) => ({ ...f, loyalty_points: parseInt(e.target.value) || 0 }))} 
                          />
                        </div>
                        
                        <div className="mb-3">
                          <label className="form-label fw-bold small">Địa chỉ mặc định</label>
                          <textarea 
                            className="form-control" 
                            rows={2}
                            value={form.default_address || ""} 
                            onChange={(e) => setForm((f: any) => ({ ...f, default_address: e.target.value }))} 
                          ></textarea>
                        </div>
                        
                        <div className="mb-3">
                          <label className="form-label fw-bold small">Ghi chú nội bộ (Customer Note)</label>
                          <textarea 
                            className="form-control bg-warning bg-opacity-10" 
                            rows={3}
                            placeholder="Ghi chú về khách hàng này (chỉ admin thấy)..."
                            value={form.customer_note || ""} 
                            onChange={(e) => setForm((f: any) => ({ ...f, customer_note: e.target.value }))} 
                          ></textarea>
                        </div>

                        {modalMode === "edit" && (
                          <div className="text-muted small mt-4">
                            <div><strong>Ngày tạo:</strong> {form.created_at ? new Date(form.created_at).toLocaleString("vi-VN") : ""}</div>
                            <div><strong>Cập nhật lần cuối:</strong> {form.updated_at ? new Date(form.updated_at).toLocaleString("vi-VN") : ""}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                      <button type="button" className="btn btn-light px-4" onClick={() => setModalMode(null)}>Hủy bỏ</button>
                      <button type="submit" className="btn btn-primary px-4">
                        <i className="fas fa-save me-2"></i> Lưu thay đổi
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
