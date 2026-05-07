/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: OrdersAdmin.tsx
 * Mục đích của file: Quản lý toàn bộ đơn hàng của khách từ phía Admin.
 * Các chức năng chính: Xem danh sách, cập nhật trạng thái đơn hàng và trạng thái thanh toán, tạo đơn hàng mới, xem chi tiết và xóa đơn.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Orders Admin Component
 * Mục đích của module: Quản lý vòng đời và tiến trình xử lý đơn hàng.
 * Phạm vi xử lý: Client Component.
 * Các thành phần chính trong module: AdminOrdersPage.
 * Module liên quan: EntityPicker.tsx, bookImage.ts.
 * ============================================================================
 */
"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { EntityPicker } from "../_components/EntityPicker";
import { getBookImageUrl } from "@/lib/bookImage";

const STATUS_OPTIONS = [
  { value: "pending", label: "Chờ xác nhận", color: "warning" },
  { value: "confirmed", label: "Đã xác nhận", color: "info" },
  { value: "shipping", label: "Đang giao hàng", color: "primary" },
  { value: "delivered", label: "Đã giao thành công", color: "success" },
  { value: "cancelled", label: "Đã hủy", color: "danger" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "unpaid", label: "Chưa thanh toán" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "refunded", label: "Đã hoàn tiền" },
];

/**
 * Tên function: AdminOrdersPage
 * Mục đích của function: Component render giao diện quản lý đơn hàng.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: JSX Element.
 */
export function AdminOrdersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [keyword, setKeyword] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [sortBy, setSortBy] = useState("created_at-desc");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});

  // Modals
  const [modalMode, setModalMode] = useState<"detail" | "edit" | "add" | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);

  // Edit form state
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Add form state
  const [addForm, setAddForm] = useState({
    user_id: "", receiver_name: "", receiver_phone: "", shipping_address: "", note: "", payment_method: "cod", shipping_fee: 0,
    lines: [{ book_id: "", quantity: 1 }]
  });

  /**
   * Tên function: load
   * Mục đích của function: Lấy danh sách đơn hàng từ API với các bộ lọc.
   */
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (keyword.trim()) qs.append("search", keyword.trim());
      if (searchBy) qs.append("searchBy", searchBy);
      if (sortBy) qs.append("sort", sortBy);
      if (filterStatus) qs.append("status", filterStatus);
      if (filterPayment) qs.append("paymentMethod", filterPayment);
      const res = await apiFetch<{ items: any[] }>(`/admin/orders?${qs.toString()}`);
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    apiFetch<{ items: any[] }>("/settings")
      .then((res) => {
        const s: Record<string, string> = {};
        for (const i of (res.items || [])) s[i.key] = i.value;
        setSettings(s);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [keyword, searchBy, sortBy, filterStatus, filterPayment]);

  /**
   * Tên function: openDetail
   * Mục đích của function: Mở modal xem chi tiết đơn hàng.
   */
  async function openDetail(orderId: number) {
    try {
      const res = await apiFetch<{ item: any }>(`/admin/orders/${orderId}`);
      setSelectedOrder(res.item);
      setOrderItems(res.item?.order_items || []);
      setModalMode("detail");
    } catch (e: any) {
      alert("Lỗi tải chi tiết: " + (e.message || String(e)));
    }
  }

  function openEdit(order: any) {
    setEditForm({
      status: order.status,
      payment_status: order.payment_status,
      receiver_name: order.receiver_name || "",
      receiver_phone: order.receiver_phone || "",
      shipping_address: order.shipping_address || "",
      note: order.note || "",
      shipping_fee: order.shipping_fee || 0,
    });
    setSaveError(null);
    setSelectedOrder(order);
    setModalMode("edit");
  }

  /**
   * Tên function: handleSaveEdit
   * Mục đích của function: Cập nhật thông tin nhận hàng và trạng thái cơ bản.
   */
  async function handleSaveEdit() {
    setSaving(true);
    setSaveError(null);
    try {
      await apiFetch(`/admin/orders/${selectedOrder.order_id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
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
   * Tên function: deleteOrder
   * Mục đích của function: Xóa vĩnh viễn đơn hàng khỏi hệ thống.
   */
  async function deleteOrder(orderId: number, orderCode: string) {
    if (!window.confirm(`Xóa vĩnh viễn đơn hàng "${orderCode}"?\nHành động này không thể hoàn tác.`)) return;
    try {
      await apiFetch(`/admin/orders/${orderId}`, { method: "DELETE" });
      if (modalMode && selectedOrder?.order_id === orderId) setModalMode(null);
      load();
    } catch (e: any) {
      alert("Lỗi xóa đơn hàng: " + (e.message || String(e)));
    }
  }

  /**
   * Tên function: quickPatch
   * Mục đích của function: Cập nhật nhanh 1 trường dữ liệu (vd: trạng thái) của đơn hàng.
   */
  async function quickPatch(orderId: number, patch: any) {
    try {
      await apiFetch(`/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (selectedOrder?.order_id === orderId) {
        openDetail(orderId);
      }
      load();
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  /**
   * Tên function: handleAddSubmit
   * Mục đích của function: Tạo mới một đơn hàng thủ công từ Admin.
   */
  async function handleAddSubmit() {
    setSaving(true);
    setSaveError(null);
    try {
      // Validate lines
      const validLines = addForm.lines.filter(l => l.book_id.trim());
      if (validLines.length === 0) throw new Error("Vui lòng nhập ít nhất 1 sản phẩm.");

      const payload = { ...addForm, lines: validLines };
      await apiFetch("/admin/orders", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setModalMode(null);
      setAddForm({ user_id: "", receiver_name: "", receiver_phone: "", shipping_address: "", note: "", payment_method: "cod", shipping_fee: 0, lines: [{ book_id: "", quantity: 1 }] });
      load();
    } catch (e: any) {
      setSaveError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  const fmt = (val: any) => (val ? Number(val).toLocaleString("vi-VN") : "0");

  const statusInfo = (s: string) =>
    STATUS_OPTIONS.find((o) => o.value === s) || { label: s, color: "secondary" };

  const StatusBadge = ({ status }: { status: string }) => {
    const info = statusInfo(status);
    return <span className={`badge bg-${info.color} ${info.color === "warning" || info.color === "info" ? "text-dark" : ""}`}>{info.label}</span>;
  };

  const PayBadge = ({ ps }: { ps: string }) => {
    if (ps === "paid") return <span className="badge bg-success">Đã TT</span>;
    if (ps === "refunded") return <span className="badge bg-secondary">Hoàn tiền</span>;
    return <span className="badge bg-warning text-dark">Chưa TT</span>;
  };

  return (
    <div>
      <style>{`
        .action-hover-wrapper { position: relative; display: inline-flex; align-items: center; }
        .action-hover-buttons {
          position: absolute; right: 100%; display: flex; gap: 6px; opacity: 0; visibility: hidden;
          transition: all 0.2s; padding: 6px 10px; margin-right: 8px;
          background: #fff; border: 1px solid #dee2e6; border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100;
        }
        .action-hover-wrapper:hover .action-hover-buttons { opacity: 1; visibility: visible; }
        .btn-action-icon { width: 32px; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; }
        .modal-backdrop.fade.show { cursor: pointer; }
      `}</style>

      <div className="page-header mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h1><i className="fas fa-shopping-cart me-2" />Quản lý đơn hàng</h1>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setAddForm({ user_id: "", receiver_name: "", receiver_phone: "", shipping_address: "", note: "", payment_method: "cod", shipping_fee: Number(settings["DefaultShippingFee"] || 30000), lines: [{ book_id: "", quantity: 1 }] });
          setSaveError(null);
          setModalMode("add");
        }}>
          <i className="fas fa-plus me-2" />Thêm đơn hàng
        </button>
      </div>

      {/* Filters */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="input-group" style={{ maxWidth: 480 }}>
          <select className="form-select flex-shrink-0" style={{ maxWidth: 150 }} value={searchBy} onChange={e => setSearchBy(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="order_code">Mã đơn hàng</option>
            <option value="customer">Người nhận</option>
          </select>
          <input className="form-control" placeholder="Tìm kiếm đơn hàng..." value={keyword} onChange={e => setKeyword(e.target.value)} />
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <select className="form-select form-select-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="form-select form-select-sm" value={filterPayment} onChange={e => setFilterPayment(e.target.value)}>
            <option value="">Tất cả TT</option>
            <option value="cod">COD</option>
            <option value="bank_transfer">Chuyển khoản</option>
          </select>
          <select className="form-select form-select-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="created_at-desc">Mới nhất</option>
            <option value="created_at-asc">Cũ nhất</option>
            <option value="total-desc">Tổng tiền ↓</option>
            <option value="total-asc">Tổng tiền ↑</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="table-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Người nhận</th>
                <th>Thanh toán</th>
                <th className="text-end">Tổng tiền (đ)</th>
                <th className="text-center">Trạng thái</th>
                <th className="text-center">Ngày tạo</th>
                <th className="text-end" style={{ width: 100 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && (
                <tr><td colSpan={7} className="text-center py-4 text-muted"><i className="fas fa-spinner fa-spin me-2" />Đang tải...</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={7} className="text-center py-4 text-muted">Không tìm thấy đơn hàng nào.</td></tr>
              )}
              {items.map((o) => (
                <tr key={o.order_id}>
                  <td><span className="fw-bold text-primary font-monospace">{o.order_code}</span></td>
                  <td>
                    <div className="fw-semibold">{o.receiver_name}</div>
                    <div className="text-muted small">{o.receiver_phone}</div>
                  </td>
                  <td>
                    <div className="small">{o.payment_method === "cod" ? "💵 COD" : "🏦 Chuyển khoản"}</div>
                    <PayBadge ps={o.payment_status} />
                  </td>
                  <td className="text-end fw-bold text-danger">{fmt(o.total)}</td>
                  <td className="text-center"><StatusBadge status={o.status} /></td>
                  <td className="text-center text-muted small">{o.created_at ? new Date(o.created_at).toLocaleDateString("vi-VN") : ""}</td>
                  <td className="text-end">
                    <div className="action-hover-wrapper">
                      <div className="action-hover-buttons">
                        <button className="btn btn-outline-info btn-action-icon" onClick={() => openDetail(o.order_id)} title="Xem chi tiết"><i className="fas fa-eye" /></button>
                        <button className="btn btn-outline-primary btn-action-icon" onClick={() => openEdit(o)} title="Chỉnh sửa"><i className="fas fa-edit" /></button>
                        <button className="btn btn-outline-danger btn-action-icon" onClick={() => deleteOrder(o.order_id, o.order_code)} title="Xóa đơn hàng"><i className="fas fa-trash" /></button>
                      </div>
                      <button className="btn btn-light btn-action-icon"><i className="fas fa-ellipsis-v" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== MODAL CHI TIẾT ===== */}
      {modalMode === "detail" && selectedOrder && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setModalMode(null)} />
          <div className="modal fade show d-block" style={{ zIndex: 1050 }} onClick={() => setModalMode(null)}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header bg-light">
                  <div>
                    <h5 className="modal-title fw-bold mb-0">
                      <i className="fas fa-file-invoice me-2 text-primary" />Đơn hàng: <span className="text-primary">{selectedOrder.order_code}</span>
                    </h5>
                    <small className="text-muted">Tạo lúc: {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString("vi-VN") : ""}</small>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(selectedOrder)}><i className="fas fa-edit me-1" />Chỉnh sửa</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => deleteOrder(selectedOrder.order_id, selectedOrder.order_code)}><i className="fas fa-trash me-1" />Xóa</button>
                    <button className="btn-close" onClick={() => setModalMode(null)} />
                  </div>
                </div>
                <div className="modal-body p-4 bg-light">
                  <div className="row g-4">
                    {/* Left: sản phẩm */}
                    <div className="col-lg-8">
                      <div className="card shadow-sm border-0 mb-3">
                        <div className="card-header bg-white fw-bold"><i className="fas fa-box me-2 text-primary" />Sản phẩm trong đơn ({orderItems.length})</div>
                        <div className="card-body p-0">
                          <div className="table-responsive">
                            <table className="table table-borderless align-middle mb-0">
                              <thead className="table-light">
                                <tr>
                                  <th>Sách</th>
                                  <th className="text-center">Đơn giá</th>
                                  <th className="text-center">SL</th>
                                  <th className="text-end">Thành tiền</th>
                                </tr>
                              </thead>
                              <tbody>
                                {orderItems.map((item: any) => (
                                  <tr key={item.order_item_id} className="border-top">
                                    <td>
                                      <div className="fw-semibold">{item.books?.title || item.book_id}</div>
                                      {item.books?.image_url && (
                                        <img src={getBookImageUrl(item.books.image_url, item.books.category_id)} alt="" style={{ width: 36, height: 52, objectFit: "cover", borderRadius: 4 }} className="mt-1" />
                                      )}
                                    </td>
                                    <td className="text-center">{fmt(item.unit_price)} đ</td>
                                    <td className="text-center"><span className="badge bg-secondary">{item.quantity}</span></td>
                                    <td className="text-end fw-bold text-danger">{fmt(item.line_total)} đ</td>
                                  </tr>
                                ))}
                                {orderItems.length === 0 && <tr><td colSpan={4} className="text-center py-3 text-muted">Không có sản phẩm</td></tr>}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="card-footer bg-white">
                          <div className="d-flex justify-content-end">
                            <div style={{ minWidth: 280 }}>
                              {[
                                { label: "Tạm tính", val: selectedOrder.subtotal },
                                { label: "Phí vận chuyển", val: selectedOrder.shipping_fee },
                                { label: "Giảm giá", val: selectedOrder.discount },
                              ].map(r => (
                                <div key={r.label} className="d-flex justify-content-between mb-1 text-muted small">
                                  <span>{r.label}:</span><span>{fmt(r.val)} đ</span>
                                </div>
                              ))}
                              <div className="d-flex justify-content-between border-top pt-2 fw-bold fs-6">
                                <span>Tổng cộng:</span><span className="text-danger">{fmt(selectedOrder.total)} đ</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: thông tin */}
                    <div className="col-lg-4">
                      <div className="card shadow-sm border-0 mb-3">
                        <div className="card-header bg-white fw-bold"><i className="fas fa-map-marker-alt me-2 text-danger" />Thông tin giao hàng</div>
                        <div className="card-body">
                          <dl className="mb-0" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
                            <dt className="text-muted small">Người nhận</dt><dd className="fw-semibold mb-0">{selectedOrder.receiver_name}</dd>
                            <dt className="text-muted small">Điện thoại</dt><dd className="mb-0">{selectedOrder.receiver_phone}</dd>
                            <dt className="text-muted small">Địa chỉ</dt><dd className="mb-0 small">{selectedOrder.shipping_address}</dd>
                            {selectedOrder.note && <><dt className="text-muted small">Ghi chú</dt><dd className="mb-0 fst-italic small text-muted">{selectedOrder.note}</dd></>}
                          </dl>
                        </div>
                      </div>
                      <div className="card shadow-sm border-0">
                        <div className="card-header bg-white fw-bold"><i className="fas fa-credit-card me-2 text-success" />Thanh toán & Trạng thái</div>
                        <div className="card-body">
                          <div className="mb-3">
                            <div className="text-muted small mb-1">Trạng thái đơn hàng</div>
                            <StatusBadge status={selectedOrder.status} />
                          </div>
                          <div className="mb-3">
                            <div className="text-muted small mb-1">Phương thức thanh toán</div>
                            <span className="fw-semibold">{selectedOrder.payment_method === "cod" ? "💵 Thanh toán khi nhận (COD)" : "🏦 Chuyển khoản ngân hàng"}</span>
                          </div>
                          <div className="mb-3">
                            <div className="text-muted small mb-1">Trạng thái thanh toán</div>
                            <PayBadge ps={selectedOrder.payment_status} />
                            {selectedOrder.bank_transfer_reference && (
                              <div className="text-muted small mt-1">Mã CK: {selectedOrder.bank_transfer_reference}</div>
                            )}
                          </div>

                          {selectedOrder.payment_method === "bank_transfer" && selectedOrder.payment_status !== "paid" && selectedOrder.status !== "cancelled" && (
                            <button className="btn btn-success btn-sm w-100 mb-2" onClick={() => quickPatch(selectedOrder.order_id, { payment_status: "paid" })}>
                              <i className="fas fa-check-circle me-1" />Xác nhận đã nhận tiền
                            </button>
                          )}

                          <hr className="my-2" />
                          <div className="text-muted small mb-2">Cập nhật nhanh trạng thái</div>
                          <select
                            className="form-select form-select-sm"
                            value={selectedOrder.status}
                            disabled={selectedOrder.status === "cancelled" || selectedOrder.status === "delivered"}
                            onChange={e => quickPatch(selectedOrder.order_id, { status: e.target.value })}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== MODAL CHỈNH SỬA ===== */}
      {modalMode === "edit" && selectedOrder && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setModalMode(null)} />
          <div className="modal fade show d-block" style={{ zIndex: 1050 }} onClick={() => setModalMode(null)}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold"><i className="fas fa-edit me-2 text-primary" />Chỉnh sửa đơn hàng: {selectedOrder.order_code}</h5>
                  <button className="btn-close" onClick={() => setModalMode(null)} />
                </div>
                <div className="modal-body">
                  {saveError && <div className="alert alert-danger py-2 mb-3">{saveError}</div>}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Trạng thái đơn hàng</label>
                      <select className="form-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Trạng thái thanh toán</label>
                      <select className="form-select" value={editForm.payment_status} onChange={e => setEditForm({ ...editForm, payment_status: e.target.value })}>
                        {PAYMENT_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Tên người nhận</label>
                      <input className="form-control" value={editForm.receiver_name} onChange={e => setEditForm({ ...editForm, receiver_name: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Số điện thoại</label>
                      <input className="form-control" value={editForm.receiver_phone} onChange={e => setEditForm({ ...editForm, receiver_phone: e.target.value })} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Địa chỉ giao hàng</label>
                      <input className="form-control" value={editForm.shipping_address} onChange={e => setEditForm({ ...editForm, shipping_address: e.target.value })} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Ghi chú <span className="text-muted fw-normal">(tùy chọn)</span></label>
                      <textarea className="form-control" rows={3} value={editForm.note} onChange={e => setEditForm({ ...editForm, note: e.target.value })} placeholder="Ghi chú từ khách hàng hoặc admin..." />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Phí giao hàng (VNĐ)</label>
                      <input type="number" className="form-control" value={editForm.shipping_fee} onChange={e => setEditForm({ ...editForm, shipping_fee: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setModalMode(null)}>Hủy</button>
                  <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                    {saving ? <><i className="fas fa-spinner fa-spin me-2" />Đang lưu...</> : <><i className="fas fa-save me-2" />Lưu thay đổi</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== MODAL THÊM ĐƠN HÀNG ===== */}
      {modalMode === "add" && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setModalMode(null)} />
          <div className="modal fade show d-block" style={{ zIndex: 1050 }} onClick={() => setModalMode(null)}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold"><i className="fas fa-plus-circle me-2 text-primary" />Tạo đơn hàng mới</h5>
                  <button className="btn-close" onClick={() => setModalMode(null)} />
                </div>
                <div className="modal-body bg-light">
                  {saveError && <div className="alert alert-danger py-2 mb-3">{saveError}</div>}
                  <div className="row g-4">
                    <div className="col-lg-7">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body">
                          <h6 className="fw-bold mb-3 pb-2 border-bottom">Thông tin Khách hàng & Giao hàng</h6>
                          <div className="row g-3">
                            <div className="col-12">
                              <label className="form-label fw-semibold">Khách hàng (User ID) <span className="text-danger">*</span></label>
                              <EntityPicker
                                entityType="users"
                                value={addForm.user_id}
                                onChange={val => setAddForm({ ...addForm, user_id: val })}
                                onSelect={(user) => {
                                  // Auto-fill some fields when a user is selected
                                  setAddForm({
                                    ...addForm,
                                    user_id: user.user_id,
                                    receiver_name: user.full_name || addForm.receiver_name,
                                    receiver_phone: user.phone_number || addForm.receiver_phone,
                                  });
                                }}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">Tên người nhận <span className="text-danger">*</span></label>
                              <input className="form-control" value={addForm.receiver_name} onChange={e => setAddForm({ ...addForm, receiver_name: e.target.value })} />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">Số điện thoại <span className="text-danger">*</span></label>
                              <input className="form-control" value={addForm.receiver_phone} onChange={e => setAddForm({ ...addForm, receiver_phone: e.target.value })} />
                            </div>
                            <div className="col-12">
                              <label className="form-label fw-semibold">Địa chỉ giao hàng <span className="text-danger">*</span></label>
                              <input className="form-control" value={addForm.shipping_address} onChange={e => setAddForm({ ...addForm, shipping_address: e.target.value })} />
                            </div>
                            <div className="col-12">
                              <label className="form-label fw-semibold">Ghi chú</label>
                              <textarea className="form-control" rows={2} value={addForm.note} onChange={e => setAddForm({ ...addForm, note: e.target.value })} />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">Phí giao hàng (VNĐ)</label>
                              <input type="number" className="form-control" value={addForm.shipping_fee} onChange={e => setAddForm({ ...addForm, shipping_fee: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-semibold">Phương thức thanh toán</label>
                              <select className="form-select" value={addForm.payment_method} onChange={e => setAddForm({ ...addForm, payment_method: e.target.value })}>
                                <option value="cod">Tiền mặt (COD)</option>
                                <option value="bank_transfer">Chuyển khoản</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-5">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body">
                          <h6 className="fw-bold mb-3 pb-2 border-bottom">Sản phẩm trong đơn</h6>
                          {addForm.lines.map((line, idx) => (
                            <div key={idx} className="d-flex gap-2 align-items-start mb-3">
                              <div className="flex-grow-1">
                                <EntityPicker
                                  entityType="books"
                                  value={line.book_id}
                                  onChange={val => {
                                    const newLines = [...addForm.lines];
                                    newLines[idx].book_id = val;
                                    setAddForm({ ...addForm, lines: newLines });
                                  }}
                                />
                              </div>
                              <input type="number" className="form-control" style={{ width: 80 }} min={1} value={line.quantity} onChange={e => {
                                const newLines = [...addForm.lines];
                                newLines[idx].quantity = parseInt(e.target.value) || 1;
                                setAddForm({ ...addForm, lines: newLines });
                              }} />
                              <button className="btn btn-outline-danger" onClick={() => {
                                const newLines = addForm.lines.filter((_, i) => i !== idx);
                                setAddForm({ ...addForm, lines: newLines.length ? newLines : [{ book_id: "", quantity: 1 }] });
                              }}><i className="fas fa-times" /></button>
                            </div>
                          ))}
                          <button className="btn btn-sm btn-outline-primary mt-2" onClick={() => {
                            setAddForm({ ...addForm, lines: [...addForm.lines, { book_id: "", quantity: 1 }] });
                          }}><i className="fas fa-plus me-1" />Thêm dòng sách</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setModalMode(null)}>Hủy</button>
                  <button className="btn btn-primary" onClick={handleAddSubmit} disabled={saving}>
                    {saving ? <><i className="fas fa-spinner fa-spin me-2" />Đang lưu...</> : <><i className="fas fa-save me-2" />Tạo đơn hàng</>}
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
