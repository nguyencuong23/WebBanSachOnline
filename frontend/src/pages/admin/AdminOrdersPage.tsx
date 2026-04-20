import { useEffect, useState } from "react";
import { apiFetch } from "../../api";

export function AdminOrdersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiFetch<{ items: any[] }>("/admin/orders");
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(orderId: number, status: string) {
    await apiFetch(`/admin/orders/${orderId}/status`, {
      method: "POST",
      body: JSON.stringify({ status })
    });
    await load();
  }

  return (
    <div className="dashboard-card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="fas fa-shopping-bag me-2" />
          Quản lý đơn hàng
        </h5>
      </div>
      {error && <p className="text-danger p-3">{error}</p>}
      <table className="table table-hover mb-0" cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th align="left">Mã đơn</th>
            <th align="left">Trạng thái</th>
            <th align="left">Thanh toán</th>
            <th align="right">Tổng tiền</th>
            <th align="left">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => (
            <tr key={o.order_id}>
              <td>{o.order_code}</td>
              <td>{o.status}</td>
              <td>
                {o.payment_method}/{o.payment_status}
              </td>
              <td align="right">{Number(o.total || 0).toLocaleString()}đ</td>
              <td>
                <button className="btn btn-sm btn-outline-primary me-1" onClick={() => updateStatus(o.order_id, "confirmed")}>
                  Xác nhận
                </button>
                <button className="btn btn-sm btn-outline-warning me-1" onClick={() => updateStatus(o.order_id, "shipping")}>
                  Giao hàng
                </button>
                <button className="btn btn-sm btn-outline-success" onClick={() => updateStatus(o.order_id, "delivered")}>
                  Hoàn tất
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

