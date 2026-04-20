import { useState } from "react";
import { getCart, saveCart } from "../../cart";
import { apiFetch } from "../../api";
import { useNavigate } from "react-router-dom";
import "../shared/crud.css";

export function CheckoutPage() {
  const [receiver_name, setName] = useState("");
  const [receiver_phone, setPhone] = useState("");
  const [shipping_address, setAddress] = useState("");
  const [payment_method, setMethod] = useState("cod");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cart = getCart();
    try {
      const res = await apiFetch<{ order_id: number }>("/checkout", {
        method: "POST",
        body: JSON.stringify({
          receiver_name,
          receiver_phone,
          shipping_address,
          payment_method,
          note,
          lines: cart.map((x) => ({ book_id: x.book_id, quantity: x.quantity }))
        })
      });
      saveCart([]);
      nav(`/orders/${res.order_id}`);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  return (
    <div className="container py-4">
      <h2 className="mb-3">
        <i className="fas fa-credit-card me-2" />
        Thanh toán
      </h2>

      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 680 }}>
            <input placeholder="Người nhận" value={receiver_name} onChange={(e) => setName(e.target.value)} required />
            <input
              placeholder="Số điện thoại"
              value={receiver_phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <input
              placeholder="Địa chỉ giao hàng"
              value={shipping_address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <select value={payment_method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cod">Thanh toán khi nhận hàng (COD)</option>
              <option value="bank_transfer">Chuyển khoản ngân hàng</option>
            </select>
            <textarea placeholder="Ghi chú đơn hàng" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn btn-primary" type="submit">
              Đặt hàng
            </button>
          </form>
          {error && <p className="text-danger mt-3 mb-0">{error}</p>}
        </div>
      </div>
    </div>
  );
}

