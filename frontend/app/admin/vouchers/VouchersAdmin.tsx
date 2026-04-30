"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export function AdminVouchersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [keyword, setKeyword] = useState("");
  const [searchBy, setSearchBy] = useState("code");
  const [sortBy, setSortBy] = useState("valid_until-desc");
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);

  const emptyForm = {
    code: "",
    discount_percent: 10,
    max_discount_amount: 50000,
    valid_until: new Date(Date.now() + 86400000).toISOString().slice(0, 16), // tomorrow
    is_active: true
  };

  const [form, setForm] = useState<any>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const qs = new URLSearchParams();
      if (keyword.trim()) qs.append("search", keyword.trim());
      if (searchBy) qs.append("searchBy", searchBy);
      if (sortBy) qs.append("sort", sortBy);

      const res = await apiFetch<{ items: any[] }>(`/admin/vouchers?${qs.toString()}`);
      setItems(res.items || []);
      setError(null);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, searchBy, sortBy]);

  async function save(e: React.FormEvent) {
    e.preventDefault();

    try {
      const saveData = {
        code: form.code.toUpperCase(),
        discount_percent: Number(form.discount_percent),
        max_discount_amount: Number(form.max_discount_amount),
        valid_until: new Date(form.valid_until).toISOString(),
        is_active: Boolean(form.is_active)
      };

      if (modalMode === "add") {
        await apiFetch("/admin/vouchers", { method: "POST", body: JSON.stringify(saveData) });
      } else if (modalMode === "edit") {
        // Exclude code from update body, it's in the URL
        const { code, ...updateData } = saveData;
        await apiFetch(`/admin/vouchers/${form.code}`, { method: "PATCH", body: JSON.stringify(updateData) });
      }
      setModalMode(null);
      await load();
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  async function remove(code: string) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa voucher "${code}"?`)) return;
    try {
      await apiFetch(`/admin/vouchers/${code}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  function openAdd() {
    setForm({ ...emptyForm });
    setModalMode("add");
  }

  function openEdit(item: any) {
    setForm({ 
      ...item, 
      valid_until: item.valid_until ? new Date(item.valid_until).toISOString().slice(0, 16) : emptyForm.valid_until 
    });
    setModalMode("edit");
  }

  return (
    <div>
      <div className="page-header mb-4">
        <h1><i className="fas fa-ticket-alt me-2" />Quản lý Voucher</h1>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div className="input-group" style={{ maxWidth: "400px" }}>
          <select className="form-select" style={{ maxWidth: "150px" }} value={searchBy} onChange={(e) => setSearchBy(e.target.value)}>
            <option value="code">Mã Voucher</option>
          </select>
          <input type="text" className="form-control" placeholder="Tìm kiếm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>

        <div className="d-flex align-items-center gap-2">
          <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="valid_until-desc">Ngày hết hạn: Mới nhất</option>
            <option value="valid_until-asc">Ngày hết hạn: Cũ nhất</option>
            <option value="discount_percent-desc">% Giảm: Cao đến thấp</option>
            <option value="discount_percent-asc">% Giảm: Thấp đến cao</option>
          </select>
          <button className="btn btn-primary text-nowrap" onClick={openAdd}><i className="fas fa-plus me-1"></i> Thêm Voucher</button>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      <div className="table-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Mã Voucher</th>
                <th className="text-center">% Giảm</th>
                <th className="text-end">Giảm tối đa (VNĐ)</th>
                <th className="text-center">Ngày hết hạn</th>
                <th className="text-center">Trạng thái</th>
                <th className="text-end" style={{ width: "120px" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4 text-muted">Không tìm thấy voucher nào.</td></tr>
              ) : items.map((b) => (
                <tr key={b.code}>
                  <td className="fw-bold text-primary">{b.code}</td>
                  <td className="text-center"><span className="badge bg-danger">{b.discount_percent}%</span></td>
                  <td className="text-end fw-bold">{b.max_discount_amount?.toLocaleString("vi-VN") || 0}</td>
                  <td className="text-center">{b.valid_until ? new Date(b.valid_until).toLocaleString("vi-VN") : ""}</td>
                  <td className="text-center">
                    {b.is_active ? <span className="badge bg-success">Kích hoạt</span> : <span className="badge bg-secondary">Đã khóa</span>}
                  </td>
                  <td className="text-end">
                    <button className="btn btn-outline-primary btn-sm me-2" onClick={() => openEdit(b)}><i className="fas fa-edit"></i></button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => remove(b.code)}><i className="fas fa-trash-alt"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalMode && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setModalMode(null)}></div>
          <div className="modal fade show d-block" style={{ zIndex: 1050 }} tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header bg-light">
                  <h5 className="modal-title fw-bold text-primary">
                    <i className="fas fa-ticket-alt me-2"></i>
                    {modalMode === "add" ? "Thêm Voucher" : "Chỉnh sửa Voucher"}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setModalMode(null)}></button>
                </div>
                <div className="modal-body p-4">
                  <form id="voucherModalForm" onSubmit={save}>
                    <div className="mb-3">
                      <label className="form-label fw-bold small">Mã Voucher</label>
                      <input 
                        className="form-control text-uppercase font-monospace fw-bold" 
                        required 
                        disabled={modalMode === "edit"} 
                        value={form.code} 
                        onChange={(e) => setForm((f: any) => ({ ...f, code: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') }))} 
                        placeholder="Ví dụ: SUMMER2024"
                      />
                      {modalMode === "add" && <div className="form-text">Chỉ chứa chữ cái, số, gạch ngang và gạch dưới. Sẽ tự động in hoa.</div>}
                    </div>
                    
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label fw-bold small text-danger">Phần trăm giảm (%)</label>
                        <div className="input-group">
                          <input type="number" min="1" max="100" className="form-control" required value={form.discount_percent} onChange={(e) => setForm((f: any) => ({ ...f, discount_percent: Number(e.target.value) }))} />
                          <span className="input-group-text">%</span>
                        </div>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label fw-bold small">Giảm tối đa</label>
                        <div className="input-group">
                          <input type="number" min="0" step="1000" className="form-control" required value={form.max_discount_amount} onChange={(e) => setForm((f: any) => ({ ...f, max_discount_amount: Number(e.target.value) }))} />
                          <span className="input-group-text">₫</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold small">Ngày giờ hết hạn</label>
                      <input type="datetime-local" className="form-control" required value={form.valid_until} onChange={(e) => setForm((f: any) => ({ ...f, valid_until: e.target.value }))} />
                    </div>

                    <div className="form-check form-switch mt-4">
                      <input className="form-check-input" type="checkbox" id="isActiveSwitch" checked={form.is_active} onChange={(e) => setForm((f: any) => ({ ...f, is_active: e.target.checked }))} />
                      <label className="form-check-label fw-bold" htmlFor="isActiveSwitch">Cho phép sử dụng (Kích hoạt)</label>
                    </div>
                  </form>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setModalMode(null)}>Hủy</button>
                  <button type="submit" form="voucherModalForm" className="btn btn-primary px-4">Lưu lại</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
