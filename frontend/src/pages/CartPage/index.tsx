import { useMemo, useState } from "react";
import { getCart, saveCart } from "../../cart";
import { useNavigate } from "react-router-dom";
import "../shared/crud.css";

export function CartPage() {
  const [lines, setLines] = useState(getCart());
  const nav = useNavigate();
  const total = useMemo(() => lines.reduce((s, x) => s + Number(x.unit_price || 0) * x.quantity, 0), [lines]);

  function setQty(bookId: string, q: number) {
    const next = lines.map((x) => (x.book_id === bookId ? { ...x, quantity: Math.max(1, q) } : x));
    setLines(next);
    saveCart(next);
  }

  function remove(bookId: string) {
    const next = lines.filter((x) => x.book_id !== bookId);
    setLines(next);
    saveCart(next);
  }

  return (
    <div className="container py-4">
      <h2 className="mb-3">
        <i className="fas fa-shopping-cart me-2" />
        Giỏ hàng
      </h2>

      {!lines.length ? (
        <div className="alert alert-info">Giỏ hàng của bạn đang trống.</div>
      ) : (
        <>
          <div className="table-card">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Sách</th>
                    <th className="text-end">Đơn giá</th>
                    <th className="text-center">Số lượng</th>
                    <th className="text-end">Thành tiền</th>
                    <th className="text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((x) => (
                    <tr key={x.book_id}>
                      <td>
                        <strong>{x.title || x.book_id}</strong>
                      </td>
                      <td className="text-end">{Number(x.unit_price || 0).toLocaleString()}đ</td>
                      <td className="text-center">
                        <input
                          style={{ width: 80, margin: "0 auto" }}
                          type="number"
                          min={1}
                          value={x.quantity}
                          onChange={(e) => setQty(x.book_id, Number(e.target.value))}
                        />
                      </td>
                      <td className="text-end">{(Number(x.unit_price || 0) * x.quantity).toLocaleString()}đ</td>
                      <td className="text-center">
                        <button className="btn btn-sm btn-outline-danger" onClick={() => remove(x.book_id)}>
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <p className="mb-0">
              <strong>Tổng cộng: {total.toLocaleString()}đ</strong>
            </p>
            <button className="btn btn-primary" onClick={() => nav("/checkout")} disabled={!lines.length}>
              Tiến hành thanh toán
            </button>
          </div>
        </>
      )}
    </div>
  );
}

