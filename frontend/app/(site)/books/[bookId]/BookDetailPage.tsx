/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: BookDetailPage.tsx
 * Mục đích của file: Hiển thị giao diện chi tiết của một cuốn sách.
 * Các chức năng chính: Hiển thị thông tin sách, chọn số lượng, thêm vào giỏ, hiển thị đánh giá và sách cùng thể loại.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Book Detail UI
 * Mục đích của module: Hiển thị thông tin sách chi tiết.
 * Phạm vi xử lý: Client Component, fetch API `/books/[id]`.
 * Các thành phần chính trong module: BookDetailPage, Skeleton, Helper functions.
 * Module liên quan: ReviewsSection.tsx, cart.ts, bookImage.ts.
 * ============================================================================
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { addToCart } from "@/lib/cart";
import { getBookImageUrl } from "@/lib/bookImage";
import { ReviewsSection } from "./ReviewsSection";
import "./book-detail.css";

// ─── Types ────────────────────────────────────────────────────────────────────
/**
 * Tên class/interface: Book
 * Mục đích của class/interface: Type cho dữ liệu sách chi tiết.
 */
interface Book {
  book_id: string;
  title: string;
  author: string;
  publisher?: string;
  isbn?: string;
  category_id: string;
  price: number;
  sale_price?: number | null;
  is_on_sale?: boolean;
  quantity: number;
  publish_year?: number;
  description?: string;
  image_url?: string;
  location?: string;
  slug?: string;
  categories?: { category_id: string; name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Tên function: fmt
 * Mục đích của function: Format giá tiền (VNĐ).
 */
function fmt(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

/**
 * Tên function: getPrice
 * Mục đích của function: Tính toán giá hiển thị (có sale hay không).
 */
function getPrice(b: Book) {
  if (b.is_on_sale && b.sale_price != null && b.sale_price > 0) {
    return { sale: b.sale_price, original: b.price };
  }
  return { sale: null, original: b.price };
}

/**
 * Tên function: pct
 * Mục đích của function: Tính phần trăm giảm giá.
 */
function pct(orig: number, sale: number) {
  return Math.round((1 - sale / orig) * 100);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
/**
 * Tên function: Skeleton
 * Mục đích của function: Hiển thị khung sườn (loading) trước khi có dữ liệu.
 */
function Skeleton() {
  return (
    <div className="bd-wrap">
      <div className="container">
        <div className="bd-main">
          <div>
            <div className="bd-skeleton" style={{ height: 460, borderRadius: 20 }} />
          </div>
          <div style={{ paddingTop: 4 }}>
            <div className="bd-skeleton" style={{ height: 20, width: "30%", marginBottom: 14 }} />
            <div className="bd-skeleton" style={{ height: 36, marginBottom: 10 }} />
            <div className="bd-skeleton" style={{ height: 36, width: "70%", marginBottom: 20 }} />
            <div className="bd-skeleton" style={{ height: 18, width: "50%", marginBottom: 20 }} />
            <div className="bd-skeleton" style={{ height: 1, marginBottom: 20 }} />
            <div className="bd-skeleton" style={{ height: 48, width: "40%", marginBottom: 20 }} />
            <div className="bd-skeleton" style={{ height: 52, marginBottom: 12 }} />
            <div className="bd-skeleton" style={{ height: 52 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
/**
 * Tên function: BookDetailPage
 * Mục đích của function: Component render toàn bộ chi tiết sách, giỏ hàng và danh sách liên quan.
 * Tham số đầu vào: bookId (string).
 * Giá trị trả về: JSX Element.
 * Điều kiện xử lý: Xử lý cuộn vô tận cho slider, load data và settings đồng thời.
 */
export function BookDetailPage({ bookId }: { bookId: string }) {
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [related, setRelated] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<"desc" | "specs" | "reviews">("desc");
  const [toast, setToast] = useState<string | null>(null);
  const [addingCart, setAddingCart] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const sliderRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const CARD_WIDTH = 186; // 170px card + 16px gap
  const SCROLL_AMOUNT = CARD_WIDTH * 3; // ~3 cards per click

  /**
   * Tên function: scrollSlider
   * Mục đích của function: Cuộn danh sách sách liên quan sang trái/phải.
   */
  function scrollSlider(dir: "left" | "right") {
    const el = sliderRef.current;
    if (!el || !related.length) return;
    const cloneWidth = CARD_WIDTH * related.length;

    // Teleport instant nếu sắp chạm ranh giới
    if (dir === "left" && el.scrollLeft - SCROLL_AMOUNT < cloneWidth) {
      el.scrollLeft += cloneWidth; // instant, không animation
    }
    if (dir === "right" && el.scrollLeft + SCROLL_AMOUNT > cloneWidth * 2) {
      el.scrollLeft -= cloneWidth; // instant, không animation
    }

    // Scroll smooth bằng cách thêm class tạm
    el.classList.add("smooth");
    el.scrollBy({ left: dir === "left" ? -SCROLL_AMOUNT : SCROLL_AMOUNT });
    // Xóa class sau khi animation xong (~400ms)
    setTimeout(() => el.classList.remove("smooth"), 450);
  }

  // Infinite loop: teleport instant khi chạm clone boundary
  useEffect(() => {
    const el = sliderRef.current;
    if (!el || !related.length) return;

    const cloneWidth = CARD_WIDTH * related.length;

    function onScroll() {
      if (!el || isScrolling.current) return;
      // Chạm clone phải → teleport về thật (instant)
      if (el.scrollLeft >= cloneWidth * 2) {
        isScrolling.current = true;
        el.style.scrollBehavior = "auto";
        el.scrollLeft -= cloneWidth;
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        el.scrollLeft; // force reflow
        el.style.scrollBehavior = "";
        isScrolling.current = false;
      }
      // Chạm clone trái → teleport về thật (instant)
      if (el.scrollLeft <= 0) {
        isScrolling.current = true;
        el.style.scrollBehavior = "auto";
        el.scrollLeft += cloneWidth;
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        el.scrollLeft; // force reflow
        el.style.scrollBehavior = "";
        isScrolling.current = false;
      }
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    // Init: bắt đầu ở đoạn thật
    el.style.scrollBehavior = "auto";
    el.scrollLeft = cloneWidth;
    el.style.scrollBehavior = "";

    return () => el.removeEventListener("scroll", onScroll);
  }, [related]);

  // Load book + settings
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [bookRes, settingsRes] = await Promise.all([
          apiFetch<{ item: Book }>(`/books/${bookId}`),
          apiFetch<{ items: { key: string; value: string }[] }>("/settings").catch(() => ({ items: [] })),
        ]);
        setBook(bookRes.item);

        const map: Record<string, string> = {};
        for (const s of settingsRes.items || []) map[s.key] = s.value;
        setSettings(map);

        // Load related books (same category) — dùng category_id param chính xác
        const relRes = await apiFetch<{ items: Book[] }>(
          `/books?category_id=${encodeURIComponent(bookRes.item.category_id)}&sort=created_at-desc`
        ).catch(() => ({ items: [] }));
        setRelated(
          (relRes.items || [])
            .filter(b => b.book_id !== bookId)
            .slice(0, 8)
        );
      } catch (e: any) {
        if (e?.status === 404) setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [bookId]);

  /**
   * Tên function: showToast
   * Mục đích của function: Hiển thị thông báo (thêm giỏ hàng thành công).
   */
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  /**
   * Tên function: handleAddCart
   * Mục đích của function: Xử lý sự kiện bấm Thêm vào giỏ.
   */
  async function handleAddCart() {
    if (!book) return;
    setAddingCart(true);
    try {
      await addToCart(book, qty);
      showToast(`Đã thêm ${qty} cuốn "${book.title}" vào giỏ hàng`);
    } finally {
      setAddingCart(false);
    }
  }

  /**
   * Tên function: handleBuyNow
   * Mục đích của function: Chuyển hướng trực tiếp sang trang checkout kèm book_id.
   */
  async function handleBuyNow() {
    if (!book) return;
    setAddingCart(true);
    try {
      // Không thêm vào giỏ — truyền thẳng book_id + qty qua URL
      router.push(`/checkout?book_id=${encodeURIComponent(book.book_id)}&qty=${qty}`);
    } finally {
      setAddingCart(false);
    }
  }

  if (isLoading) return <Skeleton />;

  if (notFound || !book) {
    return (
      <div className="bd-wrap">
        <div className="container bd-not-found">
          <div className="bd-not-found-icon">📚</div>
          <h2 style={{ fontWeight: 800, color: "#1f2937", marginBottom: 8 }}>Không tìm thấy sách</h2>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>Sách này không tồn tại hoặc đã bị xóa.</p>
          <Link href="/search" className="bd-btn-buy" style={{ display: "inline-flex", textDecoration: "none", maxWidth: 200 }}>
            <i className="fas fa-search" /> Tìm sách khác
          </Link>
        </div>
      </div>
    );
  }

  const { sale, original } = getPrice(book);
  const inStock = book.quantity > 0;
  const imgUrl = getBookImageUrl(book.image_url, book.category_id)
    || "https://via.placeholder.com/400x560?text=No+Image";
  const freeShipThreshold = Number(settings["FreeShippingThreshold"] || 300000);
  const shippingFee = Number(settings["DefaultShippingFee"] || 30000);
  const effectivePrice = sale ?? original;
  const isFreeShip = effectivePrice * qty >= freeShipThreshold;

  return (
    <div className="bd-wrap">
      <div className="container">

        {/* Breadcrumb */}
        <nav className="bd-breadcrumb" aria-label="breadcrumb">
          <Link href="/">Trang chủ</Link>
          <span className="sep"><i className="fas fa-chevron-right" style={{ fontSize: "0.65rem" }} /></span>
          <Link href="/search">Sách</Link>
          {book.categories && (
            <>
              <span className="sep"><i className="fas fa-chevron-right" style={{ fontSize: "0.65rem" }} /></span>
              <Link href={`/search?cat=${book.category_id}`}>{book.categories.name}</Link>
            </>
          )}
          <span className="sep"><i className="fas fa-chevron-right" style={{ fontSize: "0.65rem" }} /></span>
          <span className="current">{book.title}</span>
        </nav>

        {/* ── Main ── */}
        <div className="bd-main">

          {/* Gallery */}
          <div className="bd-gallery">
            <div className="bd-img-main-wrap">
              <img src={imgUrl} alt={book.title} className="bd-img-main" />
              {sale != null && (
                <div className="bd-sale-ribbon">-{pct(original, sale)}% GIẢM</div>
              )}
              <span className={`bd-stock-badge ${inStock ? "bd-stock-in" : "bd-stock-out"}`}>
                <i className={`fas ${inStock ? "fa-check-circle" : "fa-times-circle"}`} style={{ marginRight: 4 }} />
                {inStock ? `Còn ${book.quantity} cuốn` : "Hết hàng"}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="bd-info">
            {/* Category */}
            <Link href={`/search?cat=${book.category_id}`} className="bd-category-tag">
              <i className="fas fa-tag" />
              {book.categories?.name || book.category_id}
            </Link>

            {/* Title */}
            <h1 className="bd-title">{book.title}</h1>

            {/* Author */}
            <div className="bd-author-line">
              <i className="fas fa-pen-nib" style={{ color: "#9ca3af" }} />
              Tác giả:&nbsp;
              <Link href={`/search?q=${encodeURIComponent(book.author)}&by=author`}>
                {book.author}
              </Link>
            </div>

            {/* Meta chips */}
            <div className="bd-meta-row">
              {book.publisher && (
                <span className="bd-meta-chip">
                  <i className="fas fa-building" />{book.publisher}
                </span>
              )}
              {book.publish_year && (
                <span className="bd-meta-chip">
                  <i className="fas fa-calendar-alt" />{book.publish_year}
                </span>
              )}
              {book.isbn && (
                <span className="bd-meta-chip">
                  <i className="fas fa-barcode" />ISBN: {book.isbn}
                </span>
              )}
              <span className="bd-meta-chip">
                <i className="fas fa-hashtag" />{book.book_id}
              </span>
            </div>

            <div className="bd-divider" />

            {/* Price */}
            <div className="bd-price-block">
              {sale != null ? (
                <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 4 }}>
                  <span className="bd-price-sale">{fmt(sale)}</span>
                  <span className="bd-price-original">{fmt(original)}</span>
                  <span className="bd-save-tag">Tiết kiệm {fmt(original - sale)}</span>
                </div>
              ) : (
                <span className="bd-price-normal">{fmt(original)}</span>
              )}
            </div>

            {/* Shipping info */}
            {inStock && (
              <div className="bd-shipping-info">
                <i className="fas fa-truck" />
                {isFreeShip
                  ? "Miễn phí vận chuyển cho đơn hàng này"
                  : `Phí vận chuyển: ${fmt(shippingFee)} — Mua thêm ${fmt(freeShipThreshold - effectivePrice * qty)} để freeship`}
              </div>
            )}

            {/* Qty + Actions */}
            <div className="bd-actions">
              {inStock && (
                <div className="bd-qty">
                  <button
                    className="bd-qty-btn"
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                  >−</button>
                  <input
                    className="bd-qty-input"
                    type="number"
                    min={1}
                    max={book.quantity}
                    value={qty}
                    onChange={e => setQty(Math.min(book.quantity, Math.max(1, Number(e.target.value) || 1)))}
                  />
                  <button
                    className="bd-qty-btn"
                    onClick={() => setQty(q => Math.min(book.quantity, q + 1))}
                    disabled={qty >= book.quantity}
                  >+</button>
                </div>
              )}
              <button
                className="bd-btn-cart"
                disabled={!inStock || addingCart}
                onClick={handleAddCart}
              >
                <i className="fas fa-cart-plus" />
                {inStock ? "Thêm vào giỏ" : "Hết hàng"}
              </button>
              <button
                className="bd-btn-buy"
                disabled={!inStock || addingCart}
                onClick={handleBuyNow}
              >
                <i className="fas fa-bolt" />
                Mua ngay
              </button>
            </div>

            {/* Policies */}
            <div className="bd-policies">
              <div className="bd-policy-item">
                <i className="fas fa-shield-alt" />
                <span>Sách chính hãng 100%</span>
              </div>
              <div className="bd-policy-item">
                <i className="fas fa-undo-alt" />
                <span>Đổi trả trong 7 ngày</span>
              </div>
              <div className="bd-policy-item">
                <i className="fas fa-truck-fast" />
                <span>Giao hàng toàn quốc</span>
              </div>
              <div className="bd-policy-item">
                <i className="fas fa-headset" />
                <span>Hỗ trợ 24/7</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="bd-tabs-section">
          <div className="bd-tabs">
            <button
              className={`bd-tab-btn ${activeTab === "desc" ? "active" : ""}`}
              onClick={() => setActiveTab("desc")}
            >
              <i className="fas fa-align-left" style={{ marginRight: 6 }} />Mô tả sách
            </button>
            <button
              className={`bd-tab-btn ${activeTab === "specs" ? "active" : ""}`}
              onClick={() => setActiveTab("specs")}
            >
              <i className="fas fa-info-circle" style={{ marginRight: 6 }} />Thông tin chi tiết
            </button>
            <button
              className={`bd-tab-btn ${activeTab === "reviews" ? "active" : ""}`}
              onClick={() => setActiveTab("reviews")}
            >
              <i className="fas fa-star" style={{ marginRight: 6 }} />Đánh giá
            </button>
          </div>

          {/* Description */}
          <div className={`bd-tab-panel ${activeTab === "desc" ? "active" : ""}`}>
            {book.description ? (
              <div className="bd-description">{book.description}</div>
            ) : (
              <p style={{ color: "#9ca3af", fontStyle: "italic" }}>Chưa có mô tả cho cuốn sách này.</p>
            )}
          </div>

          {/* Specs */}
          <div className={`bd-tab-panel ${activeTab === "specs" ? "active" : ""}`}>
            <table className="bd-specs-table">
              <tbody>
                <tr><td>Mã sách</td><td>{book.book_id}</td></tr>
                <tr><td>Tên sách</td><td>{book.title}</td></tr>
                <tr><td>Tác giả</td><td>{book.author}</td></tr>
                {book.publisher && <tr><td>Nhà xuất bản</td><td>{book.publisher}</td></tr>}
                {book.publish_year && <tr><td>Năm xuất bản</td><td>{book.publish_year}</td></tr>}
                {book.isbn && <tr><td>ISBN</td><td>{book.isbn}</td></tr>}
                <tr><td>Thể loại</td><td>{book.categories?.name || book.category_id}</td></tr>
                <tr><td>Tình trạng</td><td>{inStock ? `Còn hàng (${book.quantity} cuốn)` : "Hết hàng"}</td></tr>
                {book.location && <tr><td>Vị trí kho</td><td>{book.location}</td></tr>}
                <tr>
                  <td>Giá bán</td>
                  <td>
                    {sale != null ? (
                      <span>
                        <span style={{ color: "#dc2626", fontWeight: 700 }}>{fmt(sale)}</span>
                        {" "}
                        <span style={{ textDecoration: "line-through", color: "#9ca3af", fontSize: "0.85em" }}>{fmt(original)}</span>
                      </span>
                    ) : fmt(original)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Reviews */}
          <div className={`bd-tab-panel ${activeTab === "reviews" ? "active" : ""}`}>
            <ReviewsSection bookId={bookId} />
          </div>
        </div>

        {/* ── Related books ── */}
        {related.length > 0 && (
          <div className="bd-related">
            <h2 className="bd-section-title">
              <i className="fas fa-book-open" style={{ color: "#2563eb" }} />
              Sách cùng thể loại
            </h2>
            <div className="bd-related-slider-wrap">
              <button
                className="bd-slider-arrow left"
                onClick={() => scrollSlider("left")}
                aria-label="Cuộn trái"
              >
                <i className="fas fa-chevron-left" />
              </button>

              <div className="bd-related-slider" ref={sliderRef}>
                {/* Clone cuối (để loop ngược) */}
                {related.map(rb => {
                  const rp = getPrice(rb);
                  const rImg = getBookImageUrl(rb.image_url, rb.category_id) || "https://via.placeholder.com/300x420?text=No+Image";
                  return (
                    <Link key={`pre-${rb.book_id}`} href={`/books/${rb.book_id}`} className="bd-related-card" aria-hidden="true" tabIndex={-1}>
                      <div className="bd-related-img-wrap"><img src={rImg} alt={rb.title} className="bd-related-img" loading="lazy" /></div>
                      <div className="bd-related-body">
                        <div className="bd-related-title">{rb.title}</div>
                        <div className="bd-related-author">{rb.author}</div>
                        {rp.sale != null ? <span className="bd-related-price">{fmt(rp.sale)}</span> : <span className="bd-related-price-normal">{fmt(rp.original)}</span>}
                      </div>
                    </Link>
                  );
                })}
                {/* Danh sách thật */}
                {related.map(rb => {
                  const rp = getPrice(rb);
                  const rImg = getBookImageUrl(rb.image_url, rb.category_id) || "https://via.placeholder.com/300x420?text=No+Image";
                  return (
                    <Link key={rb.book_id} href={`/books/${rb.book_id}`} className="bd-related-card">
                      <div className="bd-related-img-wrap"><img src={rImg} alt={rb.title} className="bd-related-img" loading="lazy" /></div>
                      <div className="bd-related-body">
                        <div className="bd-related-title">{rb.title}</div>
                        <div className="bd-related-author">{rb.author}</div>
                        {rp.sale != null ? <span className="bd-related-price">{fmt(rp.sale)}</span> : <span className="bd-related-price-normal">{fmt(rp.original)}</span>}
                      </div>
                    </Link>
                  );
                })}
                {/* Clone đầu (để loop xuôi) */}
                {related.map(rb => {
                  const rp = getPrice(rb);
                  const rImg = getBookImageUrl(rb.image_url, rb.category_id) || "https://via.placeholder.com/300x420?text=No+Image";
                  return (
                    <Link key={`post-${rb.book_id}`} href={`/books/${rb.book_id}`} className="bd-related-card" aria-hidden="true" tabIndex={-1}>
                      <div className="bd-related-img-wrap"><img src={rImg} alt={rb.title} className="bd-related-img" loading="lazy" /></div>
                      <div className="bd-related-body">
                        <div className="bd-related-title">{rb.title}</div>
                        <div className="bd-related-author">{rb.author}</div>
                        {rp.sale != null ? <span className="bd-related-price">{fmt(rp.sale)}</span> : <span className="bd-related-price-normal">{fmt(rp.original)}</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>

              <button
                className="bd-slider-arrow right"
                onClick={() => scrollSlider("right")}
                aria-label="Cuộn phải"
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Toast */}
      {toast && (
        <div className="bd-toast">
          <i className="fas fa-check-circle" style={{ color: "#34d399" }} />
          {toast}
        </div>
      )}
    </div>
  );
}
