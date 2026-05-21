"use client";

/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      CheckoutPage.tsx
 * Mục đích:      Trang thanh toán — thu thập thông tin giao hàng, chọn phương
 *                thức thanh toán, áp dụng voucher và đặt hàng. Hỗ trợ 2 luồng:
 *                mua từ giỏ hàng và mua ngay (buy now) từ trang chi tiết sách.
 * Các chức năng chính:
 *   - Form thông tin giao hàng (tên, SĐT, địa chỉ, ghi chú)
 *   - Chọn phương thức: COD hoặc chuyển khoản (hiển thị QR)
 *   - Áp dụng/xóa voucher với preview số tiền giảm
 *   - Tóm tắt đơn hàng: subtotal, phí ship, giảm giá, tổng
 *   - Submit đặt hàng và redirect đến trang chi tiết đơn
 *
 * Tên module:    Checkout Page
 * Module liên quan: lib/api.ts, backend/routes/orders.js (POST /checkout)
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Lã Anh Tuấn
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useLoading } from "../_components/LoadingContext";
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

interface VoucherResult {
  code: string;
  discount_percent: number;
  max_discount_amount: number;
  discount: number;
}

function fmt(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setIsPageLoading } = useLoading();

  const buyNowBookId = searchParams.get("book_id");
  const buyNowQty = Math.max(1, Number(searchParams.get("qty") || 1));
  const isBuyNow = !!buyNowBookId;

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const [bankId, setBankId] = useState("MB");
  const [bankAccount, setBankAccount] = useState("123456789");
  const [defaultShippingFee, setDefaultShippingFee] = useState(30000);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(300000);

  // Voucher state
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherResult, setVoucherResult] = useState<VoucherResult | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const voucherInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preOrderCode, setPreOrderCode] = useState("");

  useEffect(() => {
    const now = new Date();
    const code = `BP${now.toISOString().slice(0, 19).replace(/[-:T]/g, "")}${Math.floor(100 + Math.random() * 900)}`;
    setPreOrderCode(code);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setIsPageLoading(true);
        const [profileRes, settingsRes] = await Promise.allSettled([
          apiFetch<{ profile: any }>("/me"),
          apiFetch<{ items: any[] }>("/settings"),
        ]);

        if (profileRes.status === "fulfilled" && profileRes.value.profile) {
          const p = profileRes.value.profile;
          setReceiverName(p.full_name || "");
          setReceiverPhone(p.phone_number || "");
          setShippingAddress(p.default_address || "");
        }

        if (settingsRes.status === "fulfilled") {
          const getSet = (k: string) => settingsRes.value.items?.find((x: any) => x.key === k)?.value;
          setBankId(getSet("BankId") || "MB");
          setBankAccount(getSet("BankAccount") || "123456789");
          setDefaultShippingFee(Number(getSet("DefaultShippingFee") || 30000));
          setFreeShippingThreshold(Number(getSet("FreeShippingThreshold") || 300000));
        }

        if (isBuyNow) {
          const bookRes = await apiFetch<{ item: any }>(`/books/${buyNowBookId}`);
          const b = bookRes.item;
          setItems([{
            book_id: b.book_id,
            quantity: buyNowQty,
            books: {
              title: b.title,
              price: Number(b.price),
              sale_price: b.sale_price ? Number(b.sale_price) : null,
              is_on_sale: !!b.is_on_sale,
            },
          }]);
        } else {
          const cartRes = await apiFetch<{ items: CartItem[] }>("/cart");
          if (!cartRes.items || cartRes.items.length === 0) {
            router.replace("/cart");
            setIsPageLoading(false);
            return;
          }
          setItems(cartRes.items);
        }
      } catch (err: any) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
        setIsPageLoading(false);
      }
    }
    loadData();
    return () => {
      setIsPageLoading(false);
    };
  }, [router, isBuyNow, buyNowBookId, buyNowQty, setIsPageLoading]);

  // ── Tính tiền ──────────────────────────────────────────────────────────────
  const subtotal = items.reduce((sum, item) => {
    const price = item.books.is_on_sale && item.books.sale_price
      ? item.books.sale_price
      : item.books.price;
    return sum + Number(price) * item.quantity;
  }, 0);

  const shippingFee = (freeShippingThreshold > 0 && subtotal >= freeShippingThreshold)
    ? 0
    : defaultShippingFee;

  const discount = voucherResult?.discount ?? 0;
  const total = subtotal + shippingFee - discount;

  // ── Áp dụng voucher ────────────────────────────────────────────────────────
  async function handleApplyVoucher() {
    const code = voucherInput.trim().toUpperCase();
    if (!code) { setVoucherError("Vui lòng nhập mã voucher."); return; }
    setVoucherError(null);
    setVoucherResult(null);
    setVoucherLoading(true);
    try {
      const res = await apiFetch<{
        ok: boolean;
        voucher: { code: string; discount_percent: number; max_discount_amount: number };
        discount: number;
        final_total: number;
      }>("/vouchers/apply", {
        method: "POST",
        body: JSON.stringify({ code, subtotal }),
      });
      setVoucherResult({ ...res.voucher, discount: res.discount });
      setVoucherInput(res.voucher.code);
    } catch (err: any) {
      setVoucherError(err.message || "Mã voucher không hợp lệ.");
    } finally {
      setVoucherLoading(false);
    }
  }

  function handleRemoveVoucher() {
    setVoucherResult(null);
    setVoucherInput("");
    setVoucherError(null);
    setTimeout(() => voucherInputRef.current?.focus(), 50);
  }

  // Khi subtotal thay đổi, re-validate voucher đang áp dụng
  useEffect(() => {
    if (!voucherResult) return;
    const rawDiscount = Math.floor((subtotal * voucherResult.discount_percent) / 100);
    const newDiscount = voucherResult.max_discount_amount > 0
      ? Math.min(rawDiscount, voucherResult.max_discount_amount)
      : rawDiscount;
    setVoucherResult(prev => prev ? { ...prev, discount: newDiscount } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ order_id: number; order_code: string }>("/checkout", {
        method: "POST",
        body: JSON.stringify({
          receiver_name: receiverName,
          receiver_phone: receiverPhone,
          shipping_address: shippingAddress,
          payment_method: paymentMethod,
          note: note || undefined,
          voucher_code: voucherResult?.code || undefined,
          lines: items.map((x) => ({ book_id: x.book_id, quantity: x.quantity })),
          order_code: preOrderCode,
        }),
      });
      router.push(`/user/orders/${res.order_code}`);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return null;
  }

  return (
    <div className="co-wrap">
      <div className="co-container">

        {/* Breadcrumb */}
        <div className="co-breadcrumb">
          <Link href={isBuyNow ? `/books/${buyNowBookId}` : "/cart"} className="co-back-link">
            <i className="fas fa-arrow-left" />
            {isBuyNow ? "Quay lại trang sách" : "Quay lại giỏ hàng"}
          </Link>
        </div>

        <h1 className="co-page-title">
          <i className="fas fa-credit-card" />
          {isBuyNow ? "Mua ngay" : "Thanh toán"}
        </h1>

        {error && (
          <div className="co-alert co-alert-error">
            <i className="fas fa-exclamation-circle" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="co-layout">

            {/* ── Cột trái ── */}
            <div className="co-left">

              {/* Thông tin giao hàng */}
              <div className="co-card">
                <div className="co-card-header">
                  <i className="fas fa-map-marker-alt" />
                  Thông tin giao hàng
                </div>
                <div className="co-card-body">
                  <div className="co-field">
                    <label className="co-label">Người nhận <span className="co-required">*</span></label>
                    <input
                      className="co-input"
                      placeholder="Họ và tên người nhận"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      required minLength={2}
                    />
                  </div>
                  <div className="co-field">
                    <label className="co-label">Số điện thoại <span className="co-required">*</span></label>
                    <input
                      className="co-input"
                      placeholder="09xxxxxxxx"
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      required
                      pattern="^(?:\+84|0)(?:3|5|7|8|9)\d{8}$"
                      title="Số điện thoại Việt Nam hợp lệ"
                    />
                  </div>
                  <div className="co-field">
                    <label className="co-label">Địa chỉ giao hàng <span className="co-required">*</span></label>
                    <textarea
                      className="co-input co-textarea"
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                      rows={3}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      required minLength={5}
                    />
                  </div>
                  <div className="co-field">
                    <label className="co-label">Ghi chú <span className="co-optional">(tùy chọn)</span></label>
                    <textarea
                      className="co-input co-textarea"
                      placeholder="Ghi chú thêm về đơn hàng hoặc thời gian giao hàng..."
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Phương thức thanh toán */}
              <div className="co-card">
                <div className="co-card-header">
                  <i className="fas fa-wallet" />
                  Phương thức thanh toán
                </div>
                <div className="co-card-body">
                  <label className={`co-payment-option ${paymentMethod === "cod" ? "selected" : ""}`}>
                    <input
                      type="radio" name="payment" value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                    />
                    <div className="co-payment-icon co-payment-cod">
                      <i className="fas fa-hand-holding-usd" />
                    </div>
                    <div>
                      <div className="co-payment-title">Thanh toán khi nhận hàng (COD)</div>
                      <div className="co-payment-sub">Trả tiền mặt khi nhận được hàng</div>
                    </div>
                  </label>

                  <label className={`co-payment-option ${paymentMethod === "bank_transfer" ? "selected" : ""}`}>
                    <input
                      type="radio" name="payment" value="bank_transfer"
                      checked={paymentMethod === "bank_transfer"}
                      onChange={() => setPaymentMethod("bank_transfer")}
                    />
                    <div className="co-payment-icon co-payment-bank">
                      <i className="fas fa-university" />
                    </div>
                    <div>
                      <div className="co-payment-title">Chuyển khoản ngân hàng</div>
                      <div className="co-payment-sub">Quét mã QR để thanh toán</div>
                    </div>
                  </label>

                  {paymentMethod === "bank_transfer" && (
                    <div className="co-bank-info">
                      <p className="co-bank-desc">
                        Sau khi bấm <strong>Đặt hàng</strong>, hệ thống sẽ tạo đơn và cung cấp <strong>Mã QR</strong> để bạn quét thanh toán ở trang tiếp theo.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Cột phải — Order summary ── */}
            <div className="co-right">
              <div className="co-summary">

                {/* Danh sách sản phẩm */}
                <div className="co-summary-header">
                  <i className="fas fa-shopping-basket" />
                  Đơn hàng ({items.length} sản phẩm)
                </div>

                <div className="co-items-list">
                  {items.map((item) => {
                    const itemPrice = item.books.is_on_sale && item.books.sale_price
                      ? item.books.sale_price
                      : item.books.price;
                    return (
                      <div key={item.book_id} className="co-item">
                        <div className="co-item-info">
                          <div className="co-item-title" title={item.books.title}>
                            {item.books.title}
                          </div>
                          <div className="co-item-qty">x{item.quantity}</div>
                        </div>
                        <div className="co-item-price">
                          {fmt(Number(itemPrice) * item.quantity)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="co-divider" />

                {/* ── Voucher ── */}
                <div className="co-voucher-section">
                  <div className="co-voucher-label">
                    <i className="fas fa-ticket-alt" />
                    Mã giảm giá
                  </div>

                  {voucherResult ? (
                    /* Voucher đã áp dụng thành công */
                    <div className="co-voucher-applied">
                      <div className="co-voucher-applied-info">
                        <i className="fas fa-check-circle" />
                        <div>
                          <div className="co-voucher-code">{voucherResult.code}</div>
                          <div className="co-voucher-desc">
                            Giảm {voucherResult.discount_percent}%
                            {voucherResult.max_discount_amount > 0 &&
                              ` (tối đa ${fmt(voucherResult.max_discount_amount)})`}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="co-voucher-remove"
                        onClick={handleRemoveVoucher}
                        title="Xóa voucher"
                      >
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  ) : (
                    /* Input nhập voucher */
                    <div className="co-voucher-input-row">
                      <input
                        ref={voucherInputRef}
                        className={`co-voucher-input ${voucherError ? "has-error" : ""}`}
                        type="text"
                        placeholder="Nhập mã voucher..."
                        value={voucherInput}
                        onChange={(e) => {
                          setVoucherInput(e.target.value.toUpperCase());
                          setVoucherError(null);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyVoucher(); } }}
                        maxLength={30}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        className="co-voucher-btn"
                        onClick={handleApplyVoucher}
                        disabled={voucherLoading || !voucherInput.trim()}
                      >
                        {voucherLoading
                          ? <i className="fas fa-spinner fa-spin" />
                          : "Áp dụng"}
                      </button>
                    </div>
                  )}

                  {voucherError && (
                    <div className="co-voucher-error">
                      <i className="fas fa-exclamation-circle" /> {voucherError}
                    </div>
                  )}
                </div>

                <div className="co-divider" />

                {/* Tổng tiền */}
                <div className="co-price-rows">
                  <div className="co-price-row">
                    <span>Tạm tính</span>
                    <span>{fmt(subtotal)}</span>
                  </div>
                  <div className="co-price-row">
                    <span>Phí vận chuyển</span>
                    <span className={shippingFee === 0 ? "co-free-ship" : ""}>
                      {shippingFee === 0 ? "Miễn phí" : fmt(shippingFee)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="co-price-row co-discount-row">
                      <span>
                        <i className="fas fa-ticket-alt" style={{ marginRight: 5 }} />
                        Giảm giá ({voucherResult?.code})
                      </span>
                      <span>-{fmt(discount)}</span>
                    </div>
                  )}
                </div>

                <div className="co-divider" />

                <div className="co-total-row">
                  <span>Tổng cộng</span>
                  <span className="co-total-amount">{fmt(total)}</span>
                </div>

                {freeShippingThreshold > 0 && subtotal < freeShippingThreshold && (
                  <div className="co-freeship-hint">
                    <i className="fas fa-truck" />
                    Mua thêm <strong>{fmt(freeShippingThreshold - subtotal)}</strong> để được miễn phí vận chuyển
                  </div>
                )}

                <button
                  type="submit"
                  className={`co-submit-btn ${paymentMethod === "bank_transfer" ? "co-submit-bank" : "co-submit-cod"}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <><i className="fas fa-spinner fa-spin" /> Đang xử lý...</>
                  ) : (
                    <><i className="fas fa-paper-plane" /> Đặt hàng</>
                  )}
                </button>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
