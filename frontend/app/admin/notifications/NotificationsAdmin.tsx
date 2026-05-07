/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: NotificationsAdmin.tsx
 * Mục đích của file: Quản lý hệ thống thông báo gửi đến người dùng.
 * Các chức năng chính: Tạo thông báo mới (hàng loạt hoặc chọn lọc), xem chi tiết, chỉnh sửa và thu hồi thông báo. Upload ảnh đính kèm.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Notifications Admin Component
 * Mục đích của module: Công cụ giao tiếp với khách hàng từ phía Admin.
 * Phạm vi xử lý: Client Component.
 * Các thành phần chính trong module: NotificationsAdmin.
 * Module liên quan: EntityPicker.tsx, api.ts.
 * ============================================================================
 */
"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { EntityPicker } from "../_components/EntityPicker";

/**
 * Tên function: NotificationsAdmin
 * Mục đích của function: Component render giao diện quản lý thông báo.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: JSX Element.
 */
export function NotificationsAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState("created_at-desc");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modals
  const [modalMode, setModalMode] = useState<"detail" | "edit" | "add" | null>(null);
  const [selectedNotif, setSelectedNotif] = useState<any>(null);

  // Form states
  const [form, setForm] = useState<any>({
    title: "",
    message: "",
    link: "",
    type: "system",
    recipients_type: "all",
    recipient_ids: []
  });
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]); // for display
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [detailRecipients, setDetailRecipients] = useState<any[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  /**
   * Tên function: load
   * Mục đích của function: Tải danh sách lịch sử thông báo từ API.
   */
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (keyword.trim()) qs.append("search", keyword.trim());
      if (sortBy) qs.append("sort", sortBy);
      const res = await apiFetch<{ items: any[] }>(`/admin/notifications?${qs.toString()}`);
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
  }, [keyword, sortBy]);

  function openAdd() {
    setForm({
      title: "",
      message: "",
      link: "",
      type: "system",
      recipients_type: "all",
      recipient_ids: []
    });
    setSelectedUsers([]);
    setSaveError(null);
    setModalMode("add");
  }

  async function openDetail(id: number) {
    try {
      const res = await apiFetch<{ item: any }>(`/admin/notifications/${id}`);
      const notif = res.item;
      setSelectedNotif(notif);
      setDetailRecipients([]);
      setModalMode("detail");

      // Nếu gửi cho người dùng cụ thể, fetch danh sách profiles
      if (notif.recipients_type === "custom" && notif.recipient_ids?.length > 0) {
        setLoadingRecipients(true);
        try {
          const userRes = await apiFetch<{ items: any[] }>(
            `/admin/users?searchBy=user_id&sort=full_name-asc`
          );
          const matched = (userRes.items || []).filter((u: any) =>
            notif.recipient_ids.includes(u.user_id)
          );
          setDetailRecipients(matched);
        } catch {
          // silent fail
        } finally {
          setLoadingRecipients(false);
        }
      }
    } catch (e: any) {
      alert("Lỗi tải chi tiết: " + (e.message || String(e)));
    }
  }

  function openEdit(notif: any) {
    setForm({
      title: notif.title,
      message: notif.message,
      link: notif.link || "",
      type: notif.type || "system",
    });
    setSaveError(null);
    setSelectedNotif(notif);
    setModalMode("edit");
  }

  /**
   * Tên function: handleAddSubmit
   * Mục đích của function: Gửi thông báo mới lên server.
   */
  async function handleAddSubmit() {
    setSaving(true);
    setSaveError(null);
    try {
      if (!form.title.trim() || !form.message.trim()) {
        throw new Error("Tiêu đề và nội dung không được để trống");
      }
      if (form.recipients_type === "custom" && form.recipient_ids.length === 0) {
        throw new Error("Vui lòng chọn ít nhất một người nhận");
      }

      await apiFetch("/admin/notifications", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          recipient_ids: form.recipients_type === "custom" ? form.recipient_ids : undefined
        }),
      });
      setModalMode(null);
      load();
    } catch (e: any) {
      setSaveError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  /**
   * Tên function: handleEditSubmit
   * Mục đích của function: Cập nhật nội dung thông báo hiện có.
   */
  async function handleEditSubmit() {
    setSaving(true);
    setSaveError(null);
    try {
      if (!form.title.trim() || !form.message.trim()) {
        throw new Error("Tiêu đề và nội dung không được để trống");
      }
      await apiFetch(`/admin/notifications/${selectedNotif.id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setModalMode(null);
      load();
    } catch (e: any) {
      setSaveError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  /**
   * Tên function: deleteNotif
   * Mục đích của function: Xóa một thông báo và thu hồi khỏi tất cả người dùng đã nhận.
   */
  async function deleteNotif(id: number) {
    if (!window.confirm(`Xóa lịch sử thông báo này và thu hồi khỏi người nhận?`)) return;
    try {
      await apiFetch(`/admin/notifications/${id}`, { method: "DELETE" });
      if (modalMode && selectedNotif?.id === id) setModalMode(null);
      load();
    } catch (e: any) {
      alert("Lỗi xóa: " + (e.message || String(e)));
    }
  }

  /**
   * Tên function: handleImageUpload
   * Mục đích của function: Chuyển đổi ảnh sang Base64 và tải lên server để làm banner thông báo.
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Kích thước ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB.");
      return;
    }

    try {
      setSaving(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await apiFetch<{ url: string }>("/admin/notifications/upload-image", {
            method: "POST",
            body: JSON.stringify({
              base64,
              contentType: file.type
            })
          });
          setForm((prev: any) => ({ ...prev, link: res.url }));
        } catch (uploadErr: any) {
          alert("Lỗi tải ảnh lên: " + (uploadErr.message || String(uploadErr)));
        } finally {
          setSaving(false);
        }
      };
    } catch (err: any) {
      setSaving(false);
      alert("Lỗi đọc file: " + err.message);
    }
  };

  const handleUserSelect = (user: any) => {
    if (!form.recipient_ids.includes(user.user_id)) {
      setForm((prev: any) => ({ ...prev, recipient_ids: [...prev.recipient_ids, user.user_id] }));
      setSelectedUsers((prev) => [...prev, user]);
    }
  };

  const removeUser = (userId: string) => {
    setForm((prev: any) => ({ ...prev, recipient_ids: prev.recipient_ids.filter((id: string) => id !== userId) }));
    setSelectedUsers((prev) => prev.filter((u) => u.user_id !== userId));
  };

  return (
    <div>
      <div className="page-header mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h1><i className="fas fa-bullhorn me-2" />Quản lý Thông báo</h1>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="fas fa-paper-plane me-2" />Gửi thông báo
        </button>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="input-group" style={{ maxWidth: 400 }}>
          <span className="input-group-text"><i className="fas fa-search" /></span>
          <input className="form-control" placeholder="Tìm kiếm tiêu đề, nội dung..." value={keyword} onChange={e => setKeyword(e.target.value)} />
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <select className="form-select form-select-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="created_at-desc">Mới nhất</option>
            <option value="created_at-asc">Cũ nhất</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="table-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Nội dung</th>
                <th>Phân loại</th>
                <th>Người nhận</th>
                <th className="text-center">Ngày gửi</th>
                <th className="text-end" style={{ width: 150 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && (
                <tr><td colSpan={6} className="text-center py-4 text-muted"><i className="fas fa-spinner fa-spin me-2" />Đang tải...</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={6} className="text-center py-4 text-muted">Chưa có thông báo nào.</td></tr>
              )}
              {items.map((n) => (
                <tr key={n.id}>
                  <td><div className="fw-bold">{n.title}</div></td>
                  <td>
                    <div style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {n.message}
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-secondary">
                      {n.type === "system" ? "Hệ thống" :
                        n.type === "promotion" ? "Khuyến mãi" :
                          n.type === "order" ? "Đơn hàng" :
                            n.type === "other" ? "Khác" : n.type}
                    </span>
                  </td>
                  <td>
                    {n.recipients_type === "all" ? (
                      <span className="badge bg-success">Tất cả</span>
                    ) : (
                      <span className="badge bg-info text-dark">{n.recipient_ids?.length || 0} người</span>
                    )}
                  </td>
                  <td className="text-center text-muted small">{n.created_at ? new Date(n.created_at).toLocaleString("vi-VN") : ""}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-info me-1" onClick={() => openDetail(n.id)} title="Xem chi tiết"><i className="fas fa-eye" /></button>
                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(n)} title="Chỉnh sửa"><i className="fas fa-edit" /></button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => deleteNotif(n.id)} title="Xóa"><i className="fas fa-trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== MODAL THÊM ===== */}
      {modalMode === "add" && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setModalMode(null)} />
          <div className="modal fade show d-block" style={{ zIndex: 1050 }} onClick={() => setModalMode(null)}>
            <div className="modal-dialog modal-lg modal-dialog-centered" onClick={e => e.stopPropagation()}>
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold"><i className="fas fa-paper-plane me-2 text-primary" />Gửi thông báo mới</h5>
                  <button className="btn-close" onClick={() => setModalMode(null)} />
                </div>
                <div className="modal-body bg-light">
                  {saveError && <div className="alert alert-danger py-2 mb-3">{saveError}</div>}
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-semibold">Người nhận</label>
                      <select className="form-select mb-2" value={form.recipients_type} onChange={e => setForm({ ...form, recipients_type: e.target.value })}>
                        <option value="all">Tất cả người dùng</option>
                        <option value="custom">Chọn người dùng cụ thể</option>
                      </select>

                      {form.recipients_type === "custom" && (
                        <div className="p-3 bg-white border rounded">
                          <EntityPicker
                            entityType="users"
                            value={""}
                            onChange={() => { }}
                            onSelect={handleUserSelect}
                            placeholder="Nhập tên, email hoặc số điện thoại..."
                          />
                          <div className="mt-2 d-flex flex-wrap gap-2">
                            {selectedUsers.map(u => (
                              <div key={u.user_id} className="badge bg-light text-dark border d-flex align-items-center gap-1 p-2">
                                <span>{u.full_name || u.email}</span>
                                <button type="button" className="btn-close btn-close-sm" style={{ fontSize: "0.5rem" }} onClick={() => removeUser(u.user_id)}></button>
                              </div>
                            ))}
                            {selectedUsers.length === 0 && <span className="text-muted small">Chưa chọn người dùng nào</span>}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Tiêu đề <span className="text-danger">*</span></label>
                      <input className="form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Nội dung <span className="text-danger">*</span></label>
                      <textarea className="form-control" rows={4} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Phân loại</label>
                      <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                        <option value="system">Hệ thống</option>
                        <option value="promotion">Khuyến mãi</option>
                        <option value="order">Đơn hàng</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Ảnh đính kèm <span className="text-muted fw-normal">(tùy chọn)</span></label>
                      <div className="d-flex gap-3 align-items-start">
                        {form.link && (
                          <div className="position-relative" style={{ width: 120, height: 120 }}>
                            <img src={form.link} alt="Preview" className="img-thumbnail rounded" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <button type="button" className="btn-close position-absolute top-0 end-0 m-1 bg-white" onClick={() => setForm({ ...form, link: "" })}></button>
                          </div>
                        )}
                        <div className="flex-grow-1">
                          <input type="file" className="form-control" accept="image/*" onChange={handleImageUpload} disabled={saving} />
                          <small className="text-muted mt-1 d-block">Định dạng hỗ trợ: JPG, PNG, GIF. Tối đa 5MB.</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setModalMode(null)}>Hủy</button>
                  <button className="btn btn-primary" onClick={handleAddSubmit} disabled={saving}>
                    {saving ? <><i className="fas fa-spinner fa-spin me-2" />Đang gửi...</> : <><i className="fas fa-paper-plane me-2" />Gửi ngay</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== MODAL CHỈNH SỬA ===== */}
      {modalMode === "edit" && selectedNotif && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setModalMode(null)} />
          <div className="modal fade show d-block" style={{ zIndex: 1050 }} onClick={() => setModalMode(null)}>
            <div className="modal-dialog modal-lg modal-dialog-centered" onClick={e => e.stopPropagation()}>
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold"><i className="fas fa-edit me-2 text-primary" />Chỉnh sửa nội dung thông báo</h5>
                  <button className="btn-close" onClick={() => setModalMode(null)} />
                </div>
                <div className="modal-body bg-light">
                  {saveError && <div className="alert alert-danger py-2 mb-3">{saveError}</div>}
                  <div className="alert alert-warning py-2 mb-3 small">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Thay đổi này sẽ áp dụng lên tất cả người dùng đã nhận thông báo này.
                  </div>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-semibold">Tiêu đề <span className="text-danger">*</span></label>
                      <input className="form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Nội dung <span className="text-danger">*</span></label>
                      <textarea className="form-control" rows={4} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Phân loại</label>
                      <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                        <option value="system">Hệ thống</option>
                        <option value="promotion">Khuyến mãi</option>
                        <option value="order">Đơn hàng</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Ảnh đính kèm <span className="text-muted fw-normal">(tùy chọn)</span></label>
                      <div className="d-flex gap-3 align-items-start">
                        {form.link && (
                          <div className="position-relative" style={{ width: 120, height: 120 }}>
                            <img src={form.link} alt="Preview" className="img-thumbnail rounded" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <button type="button" className="btn-close position-absolute top-0 end-0 m-1 bg-white" onClick={() => setForm({ ...form, link: "" })}></button>
                          </div>
                        )}
                        <div className="flex-grow-1">
                          <input type="file" className="form-control" accept="image/*" onChange={handleImageUpload} disabled={saving} />
                          <small className="text-muted mt-1 d-block">Định dạng hỗ trợ: JPG, PNG, GIF. Tối đa 5MB.</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setModalMode(null)}>Hủy</button>
                  <button className="btn btn-primary" onClick={handleEditSubmit} disabled={saving}>
                    {saving ? <><i className="fas fa-spinner fa-spin me-2" />Đang lưu...</> : <><i className="fas fa-save me-2" />Lưu thay đổi</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== MODAL CHI TIẾT ===== */}
      {modalMode === "detail" && selectedNotif && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setModalMode(null)} />
          <div className="modal fade show d-block" style={{ zIndex: 1050 }} onClick={() => setModalMode(null)}>
            <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Chi tiết thông báo</h5>
                  <button className="btn-close" onClick={() => setModalMode(null)} />
                </div>
                <div className="modal-body p-4">
                  <h4 className="fw-bold">{selectedNotif.title}</h4>
                  <div className="text-muted small mb-3">
                    Ngày gửi: {new Date(selectedNotif.created_at).toLocaleString("vi-VN")}
                  </div>
                  <div className="p-3 bg-light rounded mb-3" style={{ whiteSpace: "pre-wrap" }}>
                    {selectedNotif.message}
                  </div>
                  {selectedNotif.link && (
                    <div className="mb-3">
                      <img src={selectedNotif.link} alt="Notification image" className="img-fluid rounded border shadow-sm" style={{ maxHeight: 300 }} />
                    </div>
                  )}
                  <dl className="row mb-0">
                    <dt className="col-sm-4 text-muted">Phân loại</dt>
                    <dd className="col-sm-8">
                      <span className="badge bg-secondary">
                        {selectedNotif.type === "system" ? "Hệ thống" :
                          selectedNotif.type === "promotion" ? "Khuyến mãi" :
                            selectedNotif.type === "order" ? "Đơn hàng" :
                              selectedNotif.type === "other" ? "Khác" : selectedNotif.type}
                      </span>
                    </dd>

                    <dt className="col-sm-4 text-muted">Người nhận</dt>
                    <dd className="col-sm-8">
                      {selectedNotif.recipients_type === "all" ? (
                        <span className="badge bg-success">Tất cả người dùng</span>
                      ) : (
                        <div>
                          <span className="badge bg-info text-dark mb-2">{selectedNotif.recipient_ids?.length || 0} người cụ thể</span>
                          {loadingRecipients ? (
                            <div className="text-muted small"><i className="fas fa-spinner fa-spin me-1" />Đang tải...</div>
                          ) : detailRecipients.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1 mt-1">
                              {detailRecipients.map((u: any) => (
                                <span key={u.user_id} className="badge bg-light text-dark border" style={{ fontWeight: 400 }}>
                                  <i className="fas fa-user me-1 text-secondary" />
                                  {u.full_name || u.username || u.email}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </dd>
                  </dl>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setModalMode(null)}>Đóng</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
