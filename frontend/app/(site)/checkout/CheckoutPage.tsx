"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import "./checkout.css";

interface CartItem {
  book_id: string;
  quantity: number;
  books: {
    title: string;
    price: number;
    sale_price: number | null;
    is_on_sale: boolean;
  };
}

export function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  
  const [bankTransferInfo, setBankTransferInfo] = useState<string>("");
  const [defaultShippingFee, setDefaultShippingFee] = useState<number>(30000);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(300000);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load cart
        const cartRes = await apiFetch<{ items: CartItem[] }>("/cart");
        if (!cartRes.items || cartRes.items.length === 0) {
          router.replace("/cart");
          return;
        }
        setItems(cartRes.items);

        // Load profile
        try {
          const profileRes = await apiFetch<{ profile: any }>("/me");
          if (profileRes.profile) {
            setReceiverName(profileRes.profile.full_name || "");
            setReceiverPhone(profileRes.profile.phone_number || "");
            setShippingAddress(profileRes.profile.default_address || "");
          }
        } catch (e) {
          console.warn("Could not load profile", e);
        }

        // Load settings
        try {
          const settingsRes = await apiFetch<{ items: any[] }>("/settings");
          if (settingsRes.items) {
            const getSet = (k: string) => settingsRes.items.find(x => x.key === k)?.value;
            setBankTransferInfo(getSet("BankTransferInfo") || "");
            setDefaultShippingFee(Number(getSet("DefaultShippingFee") || 30000));
            setFreeShippingThreshold(Number(getSet("FreeShippingThreshold") || 300000));
          }
        } catch (e) {
          console.warn("Could not load settings", e);
        }
      } catch (err: any) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const subtotal = items.reduce((sum, item) => {
    const price = item.books.is_on_sale && item.books.sale_price ? item.books.sale_price : item.books.price;
    return sum + Number(price) * item.quantity;
  }, 0);

  const shippingFee = (freeShippingThreshold > 0 && subtotal >= freeShippingThreshold) ? 0 : defaultShippingFee;
  const total = subtotal + shippingFee;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      const res = await apiFetch<{ order_id: number }>("/checkout", {
        method: "POST",
        body: JSON.stringify({
          receiver_name: receiverName,
          receiver_phone: receiverPhone,
          shipping_address: shippingAddress,
          payment_method: paymentMethod,
          note: note,
          lines: items.map((x) => ({ book_id: x.book_id, quantity: x.quantity }))
        })
      });
      alert("Đặt hàng thành công!");
      router.push(`/profile`);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
        <p className="mt-2 text-muted">Đang tải thông tin thanh toán...</p>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="mb-4">
        <Link href="/cart" className="text-decoration-none text-muted">
          <i className="fas fa-arrow-left me-2"></i>Quay lại giỏ hàng
        </Link>
      </div>
      
      <h2 className="mb-4 fw-bold text-primary">
        <i className="fas fa-credit-card me-2" />
        Thanh toán đơn hàng
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          <div className="col-lg-7">
            {error && <div className="alert alert-danger"><i className="fas fa-exclamation-circle me-2"></i>{error}</div>}
            
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white py-3">
                <h5 className="mb-0 fw-bold"><i className="fas fa-map-marker-alt text-primary me-2"></i>Thông tin giao hàng</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Người nhận hàng <span className="text-danger">*</span></label>
                  <input className="form-control" placeholder="Họ và tên" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} required minLength={2} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Số điện thoại <span className="text-danger">*</span></label>
                  <input className="form-control" placeholder="Số điện thoại liên hệ" value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} required pattern="^(?:\+84|0)(?:3|5|7|8|9)\d{8}$" title="Vui lòng nhập số điện thoại Việt Nam hợp lệ" />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Địa chỉ giao hàng <span className="text-danger">*</span></label>
                  <textarea className="form-control" placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..." rows={3} value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} required minLength={5}></textarea>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Ghi chú (Tùy chọn)</label>
                  <textarea className="form-control" placeholder="Ghi chú thêm về đơn hàng hoặc thời gian giao hàng..." rows={2} value={note} onChange={(e) => setNote(e.target.value)}></textarea>
                </div>
              </div>
            </div>

            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3">
                <h5 className="mb-0 fw-bold"><i className="fas fa-wallet text-primary me-2"></i>Phương thức thanh toán</h5>
              </div>
              <div className="card-body">
                <div className="form-check custom-radio mb-3 p-3 border rounded">
                  <input className="form-check-input ms-0 me-3" type="radio" name="paymentMethod" id="cod" value="cod" checked={paymentMethod === "cod"} onChange={(e) => setPaymentMethod(e.target.value)} />
                  <label className="form-check-label w-100 fw-semibold" htmlFor="cod" style={{ cursor: "pointer" }}>
                    <div className="d-flex align-items-center">
                      <i className="fas fa-hand-holding-usd text-success fs-4 me-3"></i>
                      <span>Thanh toán khi nhận hàng (COD)</span>
                    </div>
                  </label>
                </div>
                
                <div className={`form-check custom-radio mb-3 p-3 border rounded ${paymentMethod === 'bank_transfer' ? 'border-primary bg-light' : ''}`}>
                  <input className="form-check-input ms-0 me-3" type="radio" name="paymentMethod" id="bank_transfer" value="bank_transfer" checked={paymentMethod === "bank_transfer"} onChange={(e) => setPaymentMethod(e.target.value)} />
                  <label className="form-check-label w-100 fw-semibold" htmlFor="bank_transfer" style={{ cursor: "pointer" }}>
                    <div className="d-flex align-items-center">
                      <i className="fas fa-university text-primary fs-4 me-3"></i>
                      <span>Chuyển khoản ngân hàng</span>
                    </div>
                  </label>
                  
                  {paymentMethod === "bank_transfer" && (
                    <div className="mt-3 p-3 bg-white border rounded text-center animation-fade-in">
                      <p className="mb-2 text-muted small">Vui lòng quét mã QR bên dưới để thanh toán số tiền <strong className="text-danger">{total.toLocaleString("vi-VN")}đ</strong>.</p>
                      {bankTransferInfo ? (
                        <img src={bankTransferInfo} alt="QR Code Thanh Toán" className="img-fluid rounded border shadow-sm mb-3" style={{ maxWidth: "250px" }} />
                      ) : (
                        <div className="p-4 bg-light text-muted border rounded mb-3">Chưa cấu hình QR Code thanh toán</div>
                      )}
                      <div className="alert alert-info py-2 mb-0 small text-start">
                        <i className="fas fa-info-circle me-1"></i>Hệ thống thử nghiệm: Chỉ cần nhấn xác nhận bên dưới là đơn hàng sẽ được đánh dấu đã thanh toán.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="card shadow-sm border-0 position-sticky" style={{ top: "20px" }}>
              <div className="card-header bg-white py-3">
                <h5 className="mb-0 fw-bold"><i className="fas fa-shopping-basket text-primary me-2"></i>Đơn hàng của bạn ({items.length} sản phẩm)</h5>
              </div>
              <div className="card-body">
                <div className="checkout-items-list mb-3" style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {items.map(item => {
                    const itemPrice = item.books.is_on_sale && item.books.sale_price ? item.books.sale_price : item.books.price;
                    return (
                      <div key={item.book_id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                        <div className="pe-3">
                          <h6 className="mb-1 text-truncate" style={{ maxWidth: "220px", fontSize: "0.95rem" }} title={item.books.title}>{item.books.title}</h6>
                          <div className="text-muted small">SL: {item.quantity}</div>
                        </div>
                        <div className="fw-semibold">
                          {(Number(itemPrice) * item.quantity).toLocaleString("vi-VN")}đ
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Tạm tính</span>
                  <span className="fw-semibold">{subtotal.toLocaleString("vi-VN")}đ</span>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span className="text-muted">Phí vận chuyển</span>
                  <span className="fw-semibold">{shippingFee === 0 ? "Miễn phí" : `${shippingFee.toLocaleString("vi-VN")}đ`}</span>
                </div>
                <hr />
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <span className="fw-bold fs-5">Tổng cộng</span>
                  <span className="fw-bold fs-4 text-danger">{total.toLocaleString("vi-VN")}đ</span>
                </div>

                <button 
                  type="submit" 
                  className={`btn ${paymentMethod === 'bank_transfer' ? 'btn-success' : 'btn-primary'} w-100 py-3 fw-bold fs-5 shadow-sm`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <><i className="fas fa-spinner fa-spin me-2"></i>Đang xử lý...</>
                  ) : paymentMethod === 'bank_transfer' ? (
                    <><i className="fas fa-check-circle me-2"></i>Xác nhận đã thanh toán</>
                  ) : (
                    <><i className="fas fa-paper-plane me-2"></i>Đặt hàng (COD)</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
