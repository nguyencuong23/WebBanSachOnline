import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api";

export function OrderDetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/orders/${id}`)
      .then(setData)
      .catch((e: any) => setError(e.message || String(e)));
  }, [id]);

  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <p>Đang tải...</p>;

  return (
    <div className="container py-4">
      <h2 className="mb-2">Chi tiết đơn hàng {data.order?.order_code}</h2>
      <p className="text-muted mb-4">
        Trạng thái: <strong>{data.order?.status}</strong> - Thanh toán: <strong>{data.order?.payment_status}</strong>
      </p>

      <div className="table-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th className="text-end">Đơn giá</th>
                <th className="text-center">Số lượng</th>
                <th className="text-end">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {(data.items || []).map((it: any) => (
                <tr key={it.order_item_id}>
                  <td>{it.books?.title || it.book_id}</td>
                  <td className="text-end">{Number(it.unit_price || 0).toLocaleString()}đ</td>
                  <td className="text-center">{it.quantity}</td>
                  <td className="text-end">{Number(it.line_total || 0).toLocaleString()}đ</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={3} className="text-end">
                  Tổng cộng
                </th>
                <th className="text-end">{Number(data.order?.total || 0).toLocaleString()}đ</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

