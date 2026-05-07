/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: OrderDetailsPage.tsx
 * Mục đích của file: Hiển thị chi tiết một đơn hàng cụ thể.
 * Các chức năng chính: Xem thông tin giao hàng, danh sách sản phẩm, thanh toán, hủy đơn.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Order Details Component
 * Mục đích của module: Xử lý hiển thị thông tin chi tiết của một đơn hàng.
 * Phạm vi xử lý: Client Component, API `/orders/[code]`, `/orders/[code]/cancel`.
 * Các thành phần chính trong module: OrderDetailsPage.
 * Module liên quan: page.tsx.
 * ============================================================================
 */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getBookImageUrl } from "@/lib/bookImage";
import "../orders.css";

/**
 * Tên function: OrderDetailsPage
 * Mục đích của function: Component render giao diện chi tiết đơn hàng theo mã (code).
 * Tham số đầu vào: Không có (sử dụng url params).
 * Giá trị trả về: JSX Element.
 */
export function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string | undefined;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!code) return;
    fetchOrder();
  }, [code]);

  /**
   * Tên function: fetchOrder
   * Mục đích của function: Gọi API lấy thông tin chi tiết và danh sách sản phẩm của đơn hàng.
   */
  const fetchOrder = () => {
    setLoading(true);
    apiFetch(`/orders/${code}`)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e.message || String(e));
        setLoading(false);
      });
  };

  /**
   * Tên function: handleCancel
   * Mục đích của function: Gửi yêu cầu hủy đơn hàng.
   */
  const handleCancel = async () => {
    if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) return;
    setCancelling(true);
    try {
      await apiFetch(`/orders/${code}/cancel`, { method: "PATCH" });
      alert("Hủy đơn hàng thành công!");
      fetchOrder();
    } catch (e: any) {
      alert(e.message || "Không thể hủy đơn hàng");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger">{error || "Không tìm thấy đơn hàng"}</div>
        <Link href="/user/orders" className="btn btn-primary rounded-pill">Quay lại danh sách</Link>
      </div>
    );
  }

  const { order, items } = data;
  
  const steps = [
    { key: "pending", label: "Chờ xác nhận", icon: "fa-clock" },
    { key: "confirmed", label: "Đã xác nhận", icon: "fa-check" },
    { key: "shipping", label: "Đang giao", icon: "fa-truck" },
    { key: "delivered", label: "Hoàn tất", icon: "fa-box-open" },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="container py-4 animate-fade-in">
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link href="/user/orders" className="btn btn-light btn-sm rounded-circle shadow-sm">
          <i className="fas fa-arrow-left" />
        </Link>
        <h2 className="mb-0 fw-bold ms-2">Chi tiết đơn hàng #{order.order_code}</h2>
      </div>

      {!isCancelled && (
        <div className="order-timeline">
          {steps.map((step, index) => {
            let statusClass = "";
            if (index < currentStepIndex) statusClass = "completed";
            else if (index === currentStepIndex) statusClass = "active";
            
            return (
              <div key={step.key} className={`timeline-step ${statusClass}`}>
                <div className="step-icon">
                  <i className={`fas ${index < currentStepIndex ? "fa-check" : step.icon}`} />
                </div>
                <div className="step-label">{step.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {isCancelled && (
        <div className="alert alert-secondary border-0 shadow-sm d-flex align-items-center mb-4">
          <i className="fas fa-ban me-3 fs-4" />
          <div>
            <strong>Đơn hàng đã bị hủy</strong>
            <div className="small">Vào lúc {new Date(order.updated_at || order.created_at).toLocaleString("vi-VN")}</div>
          </div>
        </div>
      )}

      <div className="info-grid">
        <div className="info-box">
          <h4><i className="fas fa-shipping-fast me-2" /> Thông tin nhận hàng</h4>
          <div className="fw-bold mb-1">{order.receiver_name}</div>
          <div className="text-muted small mb-2">{order.receiver_phone}</div>
          <div className="small">{order.shipping_address}</div>
        </div>
        <div className="info-box">
          <h4><i className="fas fa-credit-card me-2" /> Thanh toán</h4>
          <div className="mb-2">
            Phương thức: <strong>{order.payment_method === "cod" ? "Thanh toán khi nhận hàng (COD)" : "Chuyển khoản ngân hàng"}</strong>
          </div>
          <div className="d-flex align-items-center gap-2">
            Trạng thái: 
            <span className={`payment-badge payment-${order.payment_status}`}>
              {order.payment_status === "unpaid" ? "Chưa thanh toán" : 
               order.payment_status === "paid" ? "Đã thanh toán" :
               order.payment_status === "refunded" ? "Đã hoàn tiền" : 
               order.payment_status === "pending_confirmation" ? "Chờ xác nhận" : order.payment_status}
            </span>
          </div>
        </div>
        <div className="info-box">
          <h4><i className="fas fa-info-circle me-2" /> Ghi chú</h4>
          <div className="text-muted small">{order.note || "Không có ghi chú"}</div>
        </div>
      </div>

      <div className="order-card mb-4">
        <div className="order-header">
          <span className="fw-bold">Sản phẩm đã đặt</span>
          <span className="text-muted">{items.length} mặt hàng</span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th className="border-0 px-4">Sản phẩm</th>
                <th className="border-0 text-end">Đơn giá</th>
                <th className="border-0 text-center">Số lượng</th>
                <th className="border-0 text-end px-4">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any) => (
                <tr key={it.order_item_id}>
                  <td className="px-4">
                    <div className="d-flex align-items-center gap-3">
                      <img 
                        src={getBookImageUrl(it.books?.image_url, it.books?.category_id) || "https://placehold.co/100x150?text=No+Image"} 
                        alt={it.books?.title}
                        className="rounded"
                        style={{ width: "40px", height: "60px", objectFit: "cover" }}
                      />
                      <div>
                        <div className="fw-bold">{it.books?.title || it.book_id}</div>
                        <div className="text-muted small">Mã: {it.book_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-end">{Number(it.unit_price || 0).toLocaleString()}đ</td>
                  <td className="text-center">{it.quantity}</td>
                  <td className="text-end px-4 fw-bold">{Number(it.line_total || 0).toLocaleString()}đ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="order-body border-top bg-light">
          <div className="row justify-content-end">
            <div className="col-md-4">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Tạm tính:</span>
                <span>{Number(order.subtotal).toLocaleString()}đ</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Phí vận chuyển:</span>
                <span>{Number(order.shipping_fee).toLocaleString()}đ</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="d-flex justify-content-between mb-2 text-danger">
                  <span>Giảm giá:</span>
                  <span>-{Number(order.discount).toLocaleString()}đ</span>
                </div>
              )}
              <hr />
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold fs-5">Tổng cộng:</span>
                <span className="fw-bold fs-4 text-primary">{Number(order.total).toLocaleString()}đ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-between">
        <Link href="/user/orders" className="btn btn-outline-secondary px-4 rounded-pill">
          Quay lại danh sách
        </Link>
        {order.status === "pending" && (
          <button 
            className="btn btn-danger px-4 rounded-pill" 
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? "Đang xử lý..." : "Hủy đơn hàng"}
          </button>
        )}
      </div>
    </div>
  );
}
