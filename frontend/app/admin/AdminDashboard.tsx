"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import "./admin-dashboard.css";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Sector
} from "recharts";
import { TrendingUp, Users, ShoppingBag, Coins, BarChart3, PieChart as PieChartIcon, Package, CreditCard } from "lucide-react";

export function AdminDashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [trends, setTrends] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<any>("/admin/dashboard/summary"),
      apiFetch<any>("/admin/dashboard/stats"),
      apiFetch<any[]>("/admin/monthly-stats"),
      apiFetch<any>("/admin/borrowing-trends")
    ])
      .then(([summaryData, statsData, monthlyData, trendsData]) => {
        setSummary(summaryData);
        setStats(statsData);
        setMonthlyStats(monthlyData);
        setTrends(trendsData);
      })
      .catch((e) => setError(String(e.message || e)))
      .finally(() => setLoading(false));
  }, []);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];
  const STATUS_COLORS: Record<string, string> = {
    pending: "#FFBB28",
    shipping: "#0088FE",
    delivered: "#00C49F",
    cancelled: "#FF8042"
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">
            <BarChart3 className="me-2" size={28} />
            Dashboard
          </h2>
          <p className="text-muted mb-0">Tổng quan và xu hướng kinh doanh của cửa hàng</p>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          <div className="row mb-4">
            {/* Cards Section */}
            <div className="col-lg-3 col-md-6 mb-3">
              <div className="stats-card bg-gradient-primary text-white">
                <div className="stats-icon">
                  <TrendingUp size={24} />
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
                  <Users size={24} />
                </div>
                <div className="stats-content">
                  <div className="stats-number">{summary?.total_users ?? 0}</div>
                  <div className="stats-label">Khách hàng</div>
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-md-6 mb-3">
              <div className="stats-card bg-gradient-warning text-white">
                <div className="stats-icon">
                  <ShoppingBag size={24} />
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
                  <Coins size={24} />
                </div>
                <div className="stats-content">
                  <div className="stats-number">{Number(summary?.revenue ?? 0).toLocaleString()}đ</div>
                  <div className="stats-label">Doanh thu tháng</div>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            {/* 1. Biểu đồ đường: Xu hướng doanh thu 30 ngày */}
            <div className="col-lg-8 mb-4">
              <div className="chart-card card h-100 border-0 shadow-sm">
                <div className="card-header bg-white border-0 py-3 d-flex align-items-center">
                  <TrendingUp className="text-primary me-2" size={20} />
                  <h5 className="mb-0">Doanh thu & Đơn hàng (30 ngày qua)</h5>
                </div>
                <div className="card-body">
                  <div style={{ width: "100%", height: 300 }}>
                    {trends?.revenue ? (
                      <ResponsiveContainer>
                        <LineChart data={trends.revenue.map((r: any, i: number) => ({
                          date: r.date?.split("-").slice(1).reverse().join("/") || "",
                          revenue: r.revenue || 0,
                          orders: trends.order_volume?.[i]?.count || 0
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip formatter={(value: any) => Number(value).toLocaleString()} />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="revenue" name="Doanh thu (đ)" stroke="#4e73df" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                          <Line yAxisId="right" type="monotone" dataKey="orders" name="Số đơn hàng" stroke="#1cc88a" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-100 d-flex align-items-center justify-content-center text-muted">
                        Không có dữ liệu xu hướng
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Biểu đồ Donut: Tỷ lệ Trạng thái đơn hàng */}
            <div className="col-lg-4 mb-4">
              <div className="chart-card card h-100 border-0 shadow-sm">
                <div className="card-header bg-white border-0 py-3 d-flex align-items-center">
                  <PieChartIcon className="text-warning me-2" size={20} />
                  <h5 className="mb-0">Trạng thái đơn hàng</h5>
                </div>
                <div className="card-body d-flex flex-column justify-content-center align-items-center">
                  <div style={{ width: "100%", height: 250 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={stats?.status_distribution || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {(stats?.status_distribution || []).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={Object.values(STATUS_COLORS)[index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 w-100">
                    {(stats?.status_distribution || []).map((s: any, i: number) => (
                      <div key={s.key} className="d-flex justify-content-between align-items-center mb-1">
                        <small className="text-muted">
                          <span className="dot me-1" style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: Object.values(STATUS_COLORS)[i % 4] }} />
                          {s.name}
                        </small>
                        <small className="fw-bold">{s.value}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Biểu đồ cột ngang: Top 10 Sách bán chạy */}
            <div className="col-lg-6 mb-4">
              <div className="chart-card card h-100 border-0 shadow-sm">
                <div className="card-header bg-white border-0 py-3 d-flex align-items-center">
                  <BarChart3 className="text-success me-2" size={20} />
                  <h5 className="mb-0">Top 10 sách bán chạy</h5>
                </div>
                <div className="card-body">
                  <div style={{ width: "100%", height: 350 }}>
                    <ResponsiveContainer>
                      <BarChart layout="vertical" data={stats?.top_books || []} margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="title" type="category" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="sold_quantity" name="Đã bán" fill="#1cc88a" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Biểu đồ cột chồng: Tỷ lệ COD vs Chuyển khoản */}
            <div className="col-lg-6 mb-4">
              <div className="chart-card card h-100 border-0 shadow-sm">
                <div className="card-header bg-white border-0 py-3 d-flex align-items-center">
                  <CreditCard className="text-info me-2" size={20} />
                  <h5 className="mb-0">Doanh thu theo phương thức thanh toán</h5>
                </div>
                <div className="card-body">
                  <div style={{ width: "100%", height: 350 }}>
                    <ResponsiveContainer>
                      <BarChart data={monthlyStats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: any) => Number(value).toLocaleString()} />
                        <Legend />
                        <Bar dataKey="cod" name="Tiền mặt (COD)" stackId="a" fill="#4e73df" />
                        <Bar dataKey="bank_transfer" name="Chuyển khoản" stackId="a" fill="#36b9cc" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && error && (
        <div className="alert alert-danger mt-4 d-flex align-items-center shadow-sm border-0">
          <i className="fas fa-exclamation-triangle me-3 fs-4" />
          <div>
            <h6 className="mb-1 fw-bold">Đã xảy ra lỗi khi tải dữ liệu dashboard</h6>
            <p className="mb-0 small">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

