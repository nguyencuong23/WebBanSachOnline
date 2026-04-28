"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import "./admin-dashboard.css";

export function AdminDashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/admin/dashboard/summary")
      .then(setSummary)
      .catch((e) => setError(String(e.message || e)));
  }, []);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">
            <i className="fas fa-tachometer-alt me-2" />
            Dashboard
          </h2>
          <p className="text-muted mb-0">Tổng quan hệ thống cửa hàng sách</p>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="stats-card bg-gradient-primary text-white">
            <div className="stats-icon">
              <i className="fas fa-book" />
            </div>
            <div className="stats-content">
              <div className="stats-number">{summary?.total_books ?? 0}</div>
              <div className="stats-label">Tổng số sách</div>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="stats-card bg-gradient-success text-white">
            <div className="stats-icon">
              <i className="fas fa-user-graduate" />
            </div>
            <div className="stats-content">
              <div className="stats-number">{summary?.total_users ?? 0}</div>
              <div className="stats-label">Người dùng</div>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="stats-card bg-gradient-warning text-white">
            <div className="stats-icon">
              <i className="fas fa-shopping-bag" />
            </div>
            <div className="stats-content">
              <div className="stats-number">{summary?.total_orders ?? 0}</div>
              <div className="stats-label">Đơn hàng</div>
            </div>
          </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="stats-card bg-gradient-danger text-white">
            <div className="stats-icon">
              <i className="fas fa-coins" />
            </div>
            <div className="stats-content">
              <div className="stats-number">{Number(summary?.revenue ?? 0).toLocaleString()}đ</div>
              <div className="stats-label">Doanh thu tháng</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-card p-4">
        <h5 className="mb-3">Thao tác nhanh</h5>
        <div className="d-flex gap-2 flex-wrap">
          <Link className="btn btn-outline-primary" href="/admin/orders">
            Quản lý đơn hàng
          </Link>
          <Link className="btn btn-outline-primary" href="/admin/books">
            Quản lý sách
          </Link>
          <Link className="btn btn-outline-primary" href="/admin/categories">
            Quản lý thể loại
          </Link>
          <Link className="btn btn-outline-primary" href="/admin/settings">
            Cài đặt hệ thống
          </Link>
        </div>
      </div>

      {error && <p className="text-danger mt-3">{error}</p>}
    </div>
  );
}

