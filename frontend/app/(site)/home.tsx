/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: home.tsx
 * Mục đích của file: Cung cấp giao diện trang chủ của cửa hàng sách.
 * Các chức năng chính: Hiển thị banner, danh sách thể loại, sách mới nhất, sách giảm giá, sách bán chạy.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Trang Chủ
 * Mục đích của module: Trang landing page thu hút khách hàng.
 * Phạm vi xử lý: Client Component, fetch dữ liệu từ nhiều endpoint: /books/latest, /books/featured, /categories.
 * Các thành phần chính trong module: HomePage, ShelfCard, BestsellerCard, InfiniteShelf.
 * Module liên quan: api.ts, cart.ts, bookImage.ts.
 * ============================================================================
 */
"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { addToCart } from "@/lib/cart";
import { getBookImageUrl } from "@/lib/bookImage";
import "./home.css";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Book {
  book_id: string;
  title: string;
  author: string;
  price: number;
  sale_price?: number | null;
  is_on_sale?: boolean;
  quantity: number;
  image_url?: string | null;
  category_id: string;
  categories?: { name: string };
}

interface Category {
  category_id: string;
  name: string;
  description?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Tên function: fmt
 * Mục đích của function: Format số tiền.
 * Tham số đầu vào: n (number)
 * Giá trị trả về: Chuỗi VNĐ.
 */
function fmt(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

/**
 * Tên function: getPrice
 * Mục đích của function: Tính toán giá gốc và giá khuyến mãi dựa trên trạng thái của sách.
 * Tham số đầu vào: b (Book)
 * Giá trị trả về: Object `{ sale, original }`
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
 * Tham số đầu vào: orig (Giá gốc), sale (Giá bán)
 * Giá trị trả về: Số phần trăm nguyên (ví dụ: 20).
 */
function pct(orig: number, sale: number) {
  return Math.round((1 - sale / orig) * 100);
}

// Ý nghĩa: Định nghĩa icon và màu sắc cho các mã thể loại; Lý do cần: Hiển thị UI sinh động
const CAT_META: Record<string, { icon: string; color: string; bg: string }> = {
  VH: { icon: "fa-feather-alt",   color: "#7c3aed", bg: "#f5f3ff" },
  KT: { icon: "fa-chart-line",    color: "#0891b2", bg: "#ecfeff" },
  TL: { icon: "fa-brain",         color: "#059669", bg: "#ecfdf5" },
  KH: { icon: "fa-flask",         color: "#2563eb", bg: "#eff6ff" },
  LS: { icon: "fa-landmark",      color: "#b45309", bg: "#fffbeb" },
  NN: { icon: "fa-language",      color: "#dc2626", bg: "#fef2f2" },
  GD: { icon: "fa-graduation-cap",color: "#0d9488", bg: "#f0fdfa" },
  TH: { icon: "fa-yin-yang",      color: "#6d28d9", bg: "#f5f3ff" },
  MG: { icon: "fa-dragon",        color: "#db2777", bg: "#fdf2f8" },
  LN: { icon: "fa-book-open",     color: "#ea580c", bg: "#fff7ed" },
};

/**
 * Tên function: getCatMeta
 * Mục đích của function: Lấy thông tin màu sắc và icon từ mã danh mục.
 * Tham số đầu vào: categoryId (Mã danh mục)
 * Giá trị trả về: Object chứa icon, color, bg.
 */
function getCatMeta(categoryId: string) {
  const prefix = String(categoryId).split("-")[0].toUpperCase();
  return CAT_META[prefix] || { icon: "fa-book", color: "#6b7280", bg: "#f9fafb" };
}

// ─── Shelf Book Card ──────────────────────────────────────────────────────────
/**
 * Tên function: ShelfCard
 * Mục đích của function: Component hiển thị một thẻ sách trên giá sách (trang chủ).
 * Tham số đầu vào: book, badge (nhãn), onAddCart (hàm thêm vào giỏ).
 * Giá trị trả về: JSX Element.
 */
function ShelfCard({
  book,
  badge,
  onAddCart,
}: {
  book: Book;
  badge?: "new" | "sale" | "hot";
  onAddCart: (b: Book) => void;
}) {
  const { sale, original } = getPrice(book);
  const inStock = book.quantity > 0;
  const img = getBookImageUrl(book.image_url, book.category_id);

  return (
    <Link href={`/books/${book.book_id}`} className="shelf-book-card">
      <div className="shelf-book-cover">
        <img
          src={img || "https://placehold.co/168x210/f8fafc/94a3b8?text=📚"}
          alt={book.title}
          loading="lazy"
        />
        {badge && (
          <span className={`shelf-book-badge badge-${badge}`}>
            {badge === "new" ? "Mới" : badge === "sale" ? `-${sale ? pct(original, sale) : 0}%` : "Hot"}
          </span>
        )}
      </div>
      <div className="shelf-book-body">
        <div className="shelf-book-cat">{book.categories?.name || book.category_id}</div>
        <div className="shelf-book-title">{book.title}</div>
        <div className="shelf-book-author">{book.author}</div>
        <div className="shelf-book-price-row">
          <div>
            {sale != null ? (
              <>
                <div className="shelf-price-sale">{fmt(sale)}</div>
                <div className="shelf-price-original">{fmt(original)}</div>
              </>
            ) : (
              <div className="shelf-price-normal">{fmt(original)}</div>
            )}
          </div>
          <button
            className="shelf-cart-btn"
            disabled={!inStock}
            title={inStock ? "Thêm vào giỏ" : "Hết hàng"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddCart(book);
            }}
          >
            <i className="fas fa-cart-plus" />
          </button>
        </div>
      </div>
    </Link>
  );
}

// ─── Bestseller Card ──────────────────────────────────────────────────────────
/**
 * Tên function: BestsellerCard
 * Mục đích của function: Component hiển thị sách bán chạy kèm thứ hạng.
 * Tham số đầu vào: book, rank (hạng), onAddCart.
 * Giá trị trả về: JSX Element.
 */
function BestsellerCard({
  book,
  rank,
  onAddCart,
}: {
  book: Book;
  rank: number;
  onAddCart: (b: Book) => void;
}) {
  const { sale, original } = getPrice(book);
  const inStock = book.quantity > 0;
  const img = getBookImageUrl(book.image_url, book.category_id);
  const rankClass = rank <= 3 ? `rank-${rank}` : "rank-other";

  return (
    <Link href={`/books/${book.book_id}`} className="bestseller-card">
      <div className={`bestseller-rank ${rankClass}`}>{rank}</div>
      <img
        src={img || "https://placehold.co/72x96/f8fafc/94a3b8?text=📚"}
        alt={book.title}
        className="bestseller-cover"
        loading="lazy"
      />
      <div className="bestseller-info">
        <div className="bestseller-cat">{book.categories?.name || book.category_id}</div>
        <div className="bestseller-title">{book.title}</div>
        <div className="bestseller-author">{book.author}</div>
        <div className="bestseller-footer">
          <div>
            {sale != null ? (
              <>
                <span className="bestseller-price-sale">{fmt(sale)}</span>{" "}
                <span className="bestseller-price-orig">{fmt(original)}</span>
              </>
            ) : (
              <span className="bestseller-price-normal">{fmt(original)}</span>
            )}
          </div>
          <button
            className="bestseller-cart-btn"
            disabled={!inStock}
            title={inStock ? "Thêm vào giỏ" : "Hết hàng"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddCart(book);
            }}
          >
            <i className="fas fa-cart-plus" />
          </button>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton shelf ───────────────────────────────────────────────────────────
/**
 * Tên function: ShelfSkeleton
 * Mục đích của function: Hiển thị hiệu ứng loading (skeleton) cho danh sách sách.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: JSX Element.
 */
function ShelfSkeleton() {
  return (
    <div style={{ display: "flex", gap: 18, overflow: "hidden" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ flexShrink: 0, width: 168 }}>
          <div className="home-skeleton" style={{ height: 210, borderRadius: 12, marginBottom: 10 }} />
          <div className="home-skeleton" style={{ height: 12, width: "60%", marginBottom: 6 }} />
          <div className="home-skeleton" style={{ height: 14, marginBottom: 4 }} />
          <div className="home-skeleton" style={{ height: 12, width: "40%" }} />
        </div>
      ))}
    </div>
  );
}

// ─── Infinite Loop Shelf ─────────────────────────────────────────────────────
const CARD_W = 186; // Ý nghĩa: Chiều rộng một thẻ sách (168px card + 18px gap) dùng để tính toán cuộn; Giá trị: 186
const SCROLL_BY = CARD_W * 3; // Ý nghĩa: Khoảng cách cuộn mỗi lần nhấn nút; Giá trị: 3 thẻ

/**
 * Tên function: InfiniteShelf
 * Mục đích của function: Component hiển thị giá sách cuộn vô tận (Carousel).
 * Tham số đầu vào: books (Danh sách sách), badge, onAddCart.
 * Giá trị trả về: JSX Element.
 * Điều kiện xử lý: Tạo bản sao (clone) của danh sách để lừa thị giác.
 */
function InfiniteShelf({
  books,
  badge,
  onAddCart,
}: {
  books: Book[];
  badge?: "new" | "sale" | "hot";
  onAddCart: (b: Book) => void;
}) {
  const sliderRef   = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const cloneWidth  = CARD_W * books.length;

  // Init: bắt đầu ở đoạn thật (giữa)
  useEffect(() => {
    const el = sliderRef.current;
    if (!el || !books.length) return;
    el.style.scrollBehavior = "auto";
    el.scrollLeft = cloneWidth;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.scrollLeft;
    el.style.scrollBehavior = "";
  }, [books.length, cloneWidth]);

  // Teleport khi chạm biên clone
  useEffect(() => {
    const el = sliderRef.current;
    if (!el || !books.length) return;

    function onScroll() {
      if (!el || isScrolling.current) return;
      if (el.scrollLeft >= cloneWidth * 2) {
        isScrolling.current = true;
        el.style.scrollBehavior = "auto";
        el.scrollLeft -= cloneWidth;
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        el.scrollLeft;
        el.style.scrollBehavior = "";
        isScrolling.current = false;
      }
      if (el.scrollLeft <= 0) {
        isScrolling.current = true;
        el.style.scrollBehavior = "auto";
        el.scrollLeft += cloneWidth;
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        el.scrollLeft;
        el.style.scrollBehavior = "";
        isScrolling.current = false;
      }
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [books.length, cloneWidth]);

  function scroll(dir: "left" | "right") {
    const el = sliderRef.current;
    if (!el || !books.length) return;
    if (dir === "left" && el.scrollLeft - SCROLL_BY < cloneWidth) {
      el.style.scrollBehavior = "auto";
      el.scrollLeft += cloneWidth;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      el.scrollLeft;
      el.style.scrollBehavior = "";
    }
    if (dir === "right" && el.scrollLeft + SCROLL_BY > cloneWidth * 2) {
      el.style.scrollBehavior = "auto";
      el.scrollLeft -= cloneWidth;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      el.scrollLeft;
      el.style.scrollBehavior = "";
    }
    el.classList.add("smooth");
    el.scrollBy({ left: dir === "left" ? -SCROLL_BY : SCROLL_BY });
    setTimeout(() => el.classList.remove("smooth"), 420);
  }

  if (!books.length) return null;

  return (
    <div className="infinite-shelf-wrap">
      <button className="shelf-arrow shelf-arrow-left" onClick={() => scroll("left")} aria-label="Cuộn trái">
        <i className="fas fa-chevron-left" />
      </button>
      <div className="infinite-shelf" ref={sliderRef}>
        {books.map(b => <ShelfCard key={`pre-${b.book_id}`}  book={b} badge={badge} onAddCart={onAddCart} />)}
        {books.map(b => <ShelfCard key={`real-${b.book_id}`} book={b} badge={badge} onAddCart={onAddCart} />)}
        {books.map(b => <ShelfCard key={`post-${b.book_id}`} book={b} badge={badge} onAddCart={onAddCart} />)}
      </div>
      <button className="shelf-arrow shelf-arrow-right" onClick={() => scroll("right")} aria-label="Cuộn phải">
        <i className="fas fa-chevron-right" />
      </button>
    </div>
  );
}

/**
 * Tên function: HomePage
 * Mục đích của function: Component chính chứa toàn bộ giao diện trang chủ.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: JSX Element.
 * Điều kiện xử lý: Sử dụng Promise.allSettled để nạp đồng thời nhiều API không chặn nhau.
 */
export function HomePage() {
  const router = useRouter(); // Ý nghĩa: Đối tượng dùng để chuyển hướng trang; Giá trị: Next Router

  const [latestBooks, setLatestBooks]         = useState<Book[]>([]);
  const [featuredBooks, setFeaturedBooks]     = useState<Book[]>([]);
  const [bestsellerBooks, setBestsellerBooks] = useState<Book[]>([]);
  const [categories, setCategories]           = useState<Category[]>([]);
  const [catCounts, setCatCounts]             = useState<Record<string, number>>({});
  const [settings, setSettings]               = useState<Record<string, string>>({});
  const [loading, setLoading]                 = useState(true);
  const [toast, setToast]                     = useState<string | null>(null);
  const [searchQ, setSearchQ]                 = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [latestRes, featuredRes, bestRes, catRes, allBooksRes, settingsRes] = await Promise.allSettled([
          apiFetch<{ items: Book[] }>("/books/latest?limit=12"),
          apiFetch<{ items: Book[] }>("/books/featured?limit=12"),
          apiFetch<{ items: Book[] }>("/books/bestsellers?limit=10"),
          apiFetch<{ items: Category[] }>("/categories"),
          apiFetch<{ items: Book[] }>("/books?sort=created_at-desc"),
          apiFetch<{ items: { key: string; value: string }[] }>("/settings"),
        ]);

        if (latestRes.status === "fulfilled")   setLatestBooks(latestRes.value.items || []);
        if (featuredRes.status === "fulfilled") setFeaturedBooks(featuredRes.value.items || []);
        if (bestRes.status === "fulfilled")     setBestsellerBooks(bestRes.value.items || []);
        if (catRes.status === "fulfilled")      setCategories(catRes.value.items || []);
        if (settingsRes.status === "fulfilled") {
          const map: Record<string, string> = {};
          for (const s of settingsRes.value.items || []) map[s.key] = s.value;
          setSettings(map);
        }

        if (allBooksRes.status === "fulfilled") {
          const counts: Record<string, number> = {};
          for (const b of allBooksRes.value.items || []) {
            counts[b.category_id] = (counts[b.category_id] || 0) + 1;
          }
          setCatCounts(counts);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /**
   * Tên function: showToast
   * Mục đích của function: Hiển thị thông báo (toast) tạm thời.
   * Tham số đầu vào: msg (Nội dung thông báo)
   */
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  /**
   * Tên function: handleAddCart
   * Mục đích của function: Xử lý sự kiện nhấn nút thêm vào giỏ.
   * Tham số đầu vào: book (Sách)
   */
  async function handleAddCart(book: Book) {
    await addToCart(book, 1);
    showToast(`Đã thêm "${book.title}" vào giỏ hàng`);
  }

  /**
   * Tên function: handleSearch
   * Mục đích của function: Xử lý submit form tìm kiếm trang chủ.
   * Tham số đầu vào: e (React.FormEvent)
   */
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQ.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQ.trim())}`);
    } else {
      router.push("/search");
    }
  }

  const totalBooks = Object.values(catCounts).reduce((a, b) => a + b, 0);
  const logoUrl    = settings["LogoUrl"] || "";
  const siteTitle  = settings["SiteTitle"] || "Cửa hàng sách";

  return (
    <>
      <section className="home-hero">
        <div className="hero-inner">
          <div className="hero-text">
            <div className="hero-eyebrow">
              <i className="fas fa-star" />
              Kho sách chất lượng cao
            </div>
            <h1 className="hero-title">
              Khám phá thế giới<br />
              qua từng <span className="accent">trang sách</span>
            </h1>
            <p className="hero-desc">
              Hàng nghìn đầu sách từ văn học, kinh tế, khoa học đến manga — tất cả trong một nơi.
              Tìm cuốn sách phù hợp với bạn ngay hôm nay.
            </p>
            <div className="hero-cta-row">
              <Link href="/search" className="hero-btn-primary">
                <i className="fas fa-search" /> Khám phá ngay
              </Link>
              <Link href="/search?sale=1" className="hero-btn-secondary">
                <i className="fas fa-tags" /> Xem khuyến mãi
              </Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat-item">
                <div className="hero-stat-num">{totalBooks > 0 ? `${totalBooks}+` : "1000+"}</div>
                <div className="hero-stat-label">Đầu sách</div>
              </div>
              <div className="hero-stat-item">
                <div className="hero-stat-num">{categories.length > 0 ? `${categories.length}` : "10+"}</div>
                <div className="hero-stat-label">Thể loại</div>
              </div>
              <div className="hero-stat-item">
                <div className="hero-stat-num">24/7</div>
                <div className="hero-stat-label">Hỗ trợ</div>
              </div>
              <div className="hero-stat-item">
                <div className="hero-stat-num">Free</div>
                <div className="hero-stat-label">Ship &gt;300k</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-logo-wrap">
              {logoUrl ? (
                <img src={logoUrl} alt={siteTitle} className="hero-logo-img" />
              ) : (
                <div className="hero-logo-fallback">
                  <i className="fas fa-book-open" />
                </div>
              )}
              <div className="hero-logo-glow" />
            </div>
            <div className="hero-floating-badge badge-top">
              <i className="fas fa-fire" style={{ color: "#f97316" }} />
              Bán chạy hôm nay
            </div>
            <div className="hero-floating-badge badge-bottom">
              <i className="fas fa-tags" style={{ color: "#7c3aed" }} />
              Giảm đến 40%
            </div>
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: "32px 24px 0" }}>
        <div className="features-strip">
          <div className="feature-item">
            <div className="feature-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
              <i className="fas fa-truck-fast" />
            </div>
            <div>
              <div className="feature-text-title">Giao hàng nhanh</div>
              <div className="feature-text-sub">Toàn quốc 2-5 ngày</div>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
              <i className="fas fa-shield-alt" />
            </div>
            <div>
              <div className="feature-text-title">Sách chính hãng</div>
              <div className="feature-text-sub">Cam kết 100% thật</div>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon" style={{ background: "#fff7ed", color: "#ea580c" }}>
              <i className="fas fa-undo-alt" />
            </div>
            <div>
              <div className="feature-text-title">Đổi trả dễ dàng</div>
              <div className="feature-text-sub">Trong vòng 7 ngày</div>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon" style={{ background: "#fdf4ff", color: "#9333ea" }}>
              <i className="fas fa-headset" />
            </div>
            <div>
              <div className="feature-text-title">Hỗ trợ 24/7</div>
              <div className="feature-text-sub">Luôn sẵn sàng giúp bạn</div>
            </div>
          </div>
        </div>
      </div>

      <section className="home-section">
        <div className="container">
          <div className="home-section-header">
            <div>
              <h2 className="home-section-title">
                <i className="fas fa-layer-group" style={{ color: "#2563eb", marginRight: 10 }} />
                Khám phá theo thể loại
              </h2>
              <p className="home-section-sub">Chọn thể loại yêu thích để tìm sách phù hợp</p>
            </div>
            <Link href="/search" className="home-see-all">
              Tất cả thể loại <i className="fas fa-arrow-right" />
            </Link>
          </div>

          {loading ? (
            <div className="categories-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="home-skeleton" style={{ height: 110, borderRadius: 18 }} />
              ))}
            </div>
          ) : (
            <div className="categories-grid categories-grid-2rows">
              {categories.map((cat) => {
                const meta = getCatMeta(cat.category_id);
                const count = catCounts[cat.category_id] || 0;
                return (
                  <Link
                    key={cat.category_id}
                    href={`/search?cat=${cat.category_id}`}
                    className="category-card"
                  >
                    <div
                      className="category-icon-wrap"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      <i className={`fas ${meta.icon}`} />
                    </div>
                    <div className="category-name">{cat.name}</div>
                    {count > 0 && <div className="category-count">{count} cuốn</div>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="home-section home-section-alt">
        <div className="container">
          <div className="home-section-header">
            <div>
              <h2 className="home-section-title">
                <i className="fas fa-sparkles" style={{ color: "#2563eb", marginRight: 10 }} />
                Sách mới nhất
              </h2>
              <p className="home-section-sub">Cập nhật liên tục các đầu sách mới về kho</p>
            </div>
            <Link href="/search?sort=created_at-desc" className="home-see-all">
              Xem tất cả <i className="fas fa-arrow-right" />
            </Link>
          </div>

          {loading ? (
            <ShelfSkeleton />
          ) : latestBooks.length === 0 ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: "40px 0" }}>Chưa có sách nào.</p>
          ) : (
            <InfiniteShelf books={latestBooks} badge="new" onAddCart={handleAddCart} />
          )}
        </div>
      </section>

      <section className="home-section">
        <div className="container">
          <div className="sale-banner">
            <div className="sale-banner-text">
              <div className="sale-banner-eyebrow">⚡ Flash Sale</div>
              <div className="sale-banner-title">Giảm giá đến 40%<br />cho sách chọn lọc</div>
              <div className="sale-banner-sub">Ưu đãi có hạn — Đừng bỏ lỡ!</div>
              <Link href="/search?sale=1" className="sale-banner-btn">
                <i className="fas fa-tags" /> Mua ngay
              </Link>
            </div>
            <div className="sale-banner-visual">📚</div>
          </div>
        </div>
      </section>

      {(loading || featuredBooks.length > 0) && (
        <section className="home-section home-section-alt">
          <div className="container">
            <div className="home-section-header">
              <div>
                <h2 className="home-section-title">
                  <i className="fas fa-tags" style={{ color: "#f97316", marginRight: 10 }} />
                  Đang giảm giá
                </h2>
                <p className="home-section-sub">Những cuốn sách đang có ưu đãi hấp dẫn</p>
              </div>
              <Link href="/search?sale=1" className="home-see-all">
                Xem tất cả <i className="fas fa-arrow-right" />
              </Link>
            </div>

            {loading ? (
              <ShelfSkeleton />
            ) : (
              <InfiniteShelf books={featuredBooks} badge="sale" onAddCart={handleAddCart} />
            )}
          </div>
        </section>
      )}

      <section className="home-section">
        <div className="container">
          <div className="home-section-header">
            <div>
              <h2 className="home-section-title">
                <i className="fas fa-fire" style={{ color: "#ef4444", marginRight: 10 }} />
                Bán chạy nhất
              </h2>
              <p className="home-section-sub">Những cuốn sách được yêu thích và mua nhiều nhất</p>
            </div>
            <Link href="/search?sort=created_at-desc" className="home-see-all">
              Xem thêm <i className="fas fa-arrow-right" />
            </Link>
          </div>

          {loading ? (
            <div className="bestsellers-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="home-skeleton" style={{ height: 120, borderRadius: 16 }} />
              ))}
            </div>
          ) : bestsellerBooks.length === 0 ? (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: "40px 0" }}>Chưa có dữ liệu.</p>
          ) : (
            <div className="bestsellers-grid bestsellers-grid-2rows">
              {bestsellerBooks.map((b, i) => (
                <BestsellerCard
                  key={b.book_id}
                  book={b}
                  rank={i + 1}
                  onAddCart={handleAddCart}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="home-section home-section-alt">
        <div className="container" style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>📖</div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 900, color: "#0f172a", marginBottom: 10 }}>
            Không tìm thấy sách bạn muốn?
          </h2>
          <p style={{ color: "#6b7280", marginBottom: 24, lineHeight: 1.7 }}>
            Dùng trang tìm kiếm để lọc theo thể loại, tác giả, giá cả và nhiều tiêu chí khác.
          </p>
          <Link href="/search" className="hero-btn-primary" style={{ display: "inline-flex" }}>
            <i className="fas fa-search" /> Tìm kiếm nâng cao
          </Link>
        </div>
      </section>

      {toast && (
        <div className="home-toast">
          <i className="fas fa-check-circle" style={{ color: "#34d399" }} />
          {toast}
        </div>
      )}
    </>
  );
}
