"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export function AdminUsersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiFetch<{ items: any[] }>("/admin/users");
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(u: any) {
    if (!window.confirm(`Bạn có chắc chắn muốn ${u.is_active ? "khóa" : "mở khóa"} tài khoản "${u.email}"?`)) return;
    await apiFetch(`/admin/users/${u.user_id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !u.is_active })
    });
    await load();
  }

  const filteredItems = items.filter((u) => {
    const k = keyword.trim().toLowerCase();
    const statusOk = statusFilter === "all" ? true : statusFilter === "active" ? !!u.is_active : !u.is_active;
    const textOk = !k
      ? true
      : [u.full_name, u.email, u.role].some((v) => String(v || "").toLowerCase().includes(k));
    return statusOk && textOk;
  });

  return (
    <div>
      <div className="page-header">
        <h1>
          <i className="fas fa-user-graduate me-2" />
          Quản lý sinh viên/độc giả
        </h1>
      </div>
      <div className="d-flex gap-2 mb-3">
        <input
          id="searchInput"
          className="form-control"
          placeholder="Tìm theo họ tên, email, vai trò..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <select
          id="statusFilter"
          className="form-select"
          style={{ maxWidth: 220 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Đã khóa</option>
        </select>
      </div>
      {error && <p className="text-danger">{error}</p>}
      <div className="table-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" cellPadding={8}>
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((u) => (
                <tr key={u.user_id}>
                  <td>{u.full_name || "Chưa cập nhật"}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    {u.is_active ? (
                      <span className="badge badge-active">Hoạt động</span>
                    ) : (
                      <span className="badge badge-inactive">Đã khóa</span>
                    )}
                  </td>
                  <td className="text-center">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => toggleActive(u)}>
                      {u.is_active ? "Khóa tài khoản" : "Mở khóa"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

