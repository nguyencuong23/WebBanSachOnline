/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: OrdersPage.tsx
 * Mục đích của file: Quản lý và hiển thị danh sách đơn hàng của người dùng.
 * Các chức năng chính: Lấy danh sách đơn hàng, hiển thị trạng thái thanh toán và vận chuyển, hủy đơn hàng.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Orders Component
 * Mục đích của module: Xử lý nghiệp vụ quản lý đơn hàng cá nhân phía Client.
 * Phạm vi xử lý: Client Component, API `/orders`, `/orders/[id]/cancel`.
 * Các thành phần chính trong module: OrdersPage.
 * Module liên quan: page.tsx, OrderDetailsPage.tsx.
 * ============================================================================
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import "./orders.css";

/**
 * Tên function: OrdersPage
 * Mục đích của function: Component render danh sách đơn hàng.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: JSX Element.
 */
export function OrdersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  /**
   * Tên function: fetchOrders
   * Mục đích của function: Gọi API lấy danh sách toàn bộ đơn hàng của user.
   */
  const fetchOrders = () => {
    setLoading(true);
    apiFetch<{ items: any[] }>("/orders")
      .then((r) => {
        setItems(r.items);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e.message || e));
        setLoading(false);
      });
  };

  /**
   * Tên function: handleCancel
   * Mục đích của function: Gửi yêu cầu hủy đơn hàng.
   * Điều kiện xử lý: Chỉ hủy được đơn ở trạng thái "pending".
   */
  const handleCancel = async (orderId: number) => {
    if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) return;
    try {
      await apiFetch(`/orders/${orderId}/cancel`, { method: "PATCH" });
      alert("Hủy đơn hàng thành công!");
      fetchOrders();
    } catch (e: any) {
      alert(e.message || "Không thể hủy đơn hàng");
    }
  };

  /**
   * Tên function: getStatusInfo
   * Mục đích của function: Trả về style và label tương ứng với trạng thái vận chuyển của đơn hàng.
   */
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "Chờ xác nhận", class: "status-pending", icon: "fa-clock" };
      case "confirmed":
        return { label: "Đã xác nhận", class: "status-confirmed", icon: "fa-check-circle" };
      case "shipping":
        return { label: "Đang giao hàng", class: "status-shipping", icon: "fa-truck" };
      case "delivered":
        return { label: "Đã giao", class: "status-delivered", icon: "fa-box-open" };
      case "cancelled":
        return { label: "Đã hủy", class: "status-cancelled", icon: "fa-times-circle" };
      default:
        return { label: status, class: "", icon: "fa-info-circle" };
    }
  };

  /**
   * Tên function: getPaymentStatusInfo
   * Mục đích của function: Trả về style và label tương ứng với trạng thái thanh toán của đơn hàng.
   */
  const getPaymentStatusInfo = (status: string) => {
    switch (status) {
      case "unpaid":
        return { label: "Chưa thanh toán", class: "payment-unpaid" };
      case "paid":
        return { label: "Đã thanh toán", class: "payment-paid" };
      case "pending_confirmation":
        return { label: "Chờ xác nhận", class: "payment-pending_confirmation" };
      case "refunded":
        return { label: "Đã hoàn tiền", class: "payment-unpaid" };
      default:
        return { label: status, class: "" };
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
        <p className="mt-3 text-muted">Đang tải danh sách đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="container py-4 animate-fade-in">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="mb-0 fw-bold">
          <i className="fas fa-history me-3 text-primary" />
          Đơn hàng của tôi
        </h2>
        <span className="badge bg-light text-dark rounded-pill px-3 py-2 border">
          {items.length} đơn hàng
        </span>
      </div>

      {error && (
        <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center">
          <i className="fas fa-exclamation-triangle me-3 fs-4" />
          {error}
        </div>
      )}

      {!items.length ? (
        <div className="text-center py-5 bg-white rounded-4 shadow-sm border">
          <div className="mb-4">
            <i className="fas fa-shopping-bag fa-4x text-light" />
          </div>
          <h4 className="fw-bold">Bạn chưa có đơn hàng nào</h4>
          <p className="text-muted mb-4">Khám phá hàng ngàn cuốn sách hấp dẫn ngay hôm nay!</p>
          <Link href="/" className="btn btn-primary px-4 py-2 rounded-pill shadow-sm">
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {items.map((o) => {
            const sInfo = getStatusInfo(o.status);
            const pInfo = getPaymentStatusInfo(o.payment_status);
            return (
              <div key={o.order_id} className="order-card">
                <div className="order-header">
                  <div className="d-flex align-items-center gap-3">
                    <span className="fw-bold text-primary fs-5">#{o.order_code}</span>
                    <span className="text-muted small">
                      <i className="far fa-calendar-alt me-1" />
                      {new Date(o.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className={`status-badge ${sInfo.class}`}>
                      <i className={`fas ${sInfo.icon}`} />
                      {sInfo.label}
                    </span>
                  </div>
                </div>
                <div className="order-body">
                  <div className="row align-items-center">
                    <div className="col-md-8">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <i className="fas fa-map-marker-alt text-muted small" />
                        <span className="text-truncate d-inline-block" style={{ maxWidth: "100%" }}>
                          {o.shipping_address}
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-3 text-muted small">
                        <span>
                          <i className="fas fa-user me-1" /> {o.receiver_name}
                        </span>
                        <span>
                          <i className="fas fa-phone me-1" /> {o.receiver_phone}
                        </span>
                      </div>
                    </div>
                    <div className="col-md-4 text-md-end mt-3 mt-md-0">
                      <div className="mb-1 text-muted small">Tổng thanh toán</div>
                      <div className="fs-4 fw-bold text-primary">
                        {Number(o.total).toLocaleString()}đ
                      </div>
                      <span className={`payment-badge ${pInfo.class} mt-1`}>
                        {pInfo.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="order-footer">
                  <Link href={`/user/orders/${o.order_code}`} className="btn btn-outline-primary px-4 rounded-pill btn-sm">
                    Xem chi tiết
                  </Link>
                  {o.status === "pending" && (
                    <button 
                      className="btn btn-link text-muted text-decoration-none btn-sm"
                      onClick={() => handleCancel(o.order_id)}
                    >
                      Hủy đơn
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
