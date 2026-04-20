import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { Link } from "react-router-dom";

export function OrdersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ items: any[] }>("/orders")
      .then((r) => setItems(r.items))
      .catch((e) => setError(String(e.message || e)));
  }, []);

  return (
    <div className="container py-4">
      <h2 className="mb-3">
        <i className="fas fa-receipt me-2" />
        Đơn hàng của tôi
      </h2>
      {error && <p className="text-danger">{error}</p>}

      {!items.length ? (
        <div className="alert alert-info">Bạn chưa có đơn hàng nào.</div>
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Trạng thái</th>
                  <th>Thanh toán</th>
                  <th className="text-end">Tổng tiền</th>
                  <th className="text-end">Xem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.order_id}>
                    <td>
                      <strong>{o.order_code}</strong>
                    </td>
                    <td>{o.status}</td>
                    <td>{o.payment_status}</td>
                    <td className="text-end">{Number(o.total).toLocaleString()}đ</td>
                    <td className="text-end">
                      <Link to={`/orders/${o.order_id}`} className="btn btn-sm btn-outline-primary">
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

