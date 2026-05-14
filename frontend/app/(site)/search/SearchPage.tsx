"use client";

/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      SearchPage.tsx
 * Mục đích:      Trang tìm kiếm và lọc sách — cho phép người dùng tìm theo
 *                từ khóa, lọc theo thể loại/giá/tồn kho/khuyến mãi, sắp xếp
 *                và xem kết quả dạng lưới hoặc danh sách với phân trang.
 * Các chức năng chính:
 *   - Thanh tìm kiếm với lựa chọn trường tìm (tên/tác giả/NXB/tất cả)
 *   - Sidebar lọc: thể loại, khoảng giá, còn hàng, đang giảm giá
 *   - Hiển thị kết quả dạng grid (BookCard) hoặc list (BookListItem)
 *   - Modal xem nhanh thông tin sách (BookModal)
 *   - Phân trang client-side (20 sách/trang)
 *   - Active filter tags với nút xóa từng bộ lọc
 *   - Đồng bộ state với URL search params
 *
 * Tên module:    Search Page
 * Module liên quan: lib/api.ts, lib/cart.ts, lib/bookImage.ts
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { addToCart } from "@/lib/cart";
import { getBookImageUrl } from "@/lib/bookImage";
import "./search.css";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Book {
  book_id: string;
  title: string;
  author: string;
  publisher?: string;
  category_id: string;
  price: number;
  sale_price?: number | null;
  is_on_sale?: boolean;
  quantity: number;
  publish_year?: number;
  description?: string;
  image_url?: string;
  categories?: { name: string };
}

interface Category {
  category_id: string;
  name: string;
  books?: { count: number }[];
}

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: "created_at-desc", label: "Mới nhất" },
  { value: "price-asc",       label: "Giá tăng dần" },
  { value: "price-desc",      label: "Giá giảm dần" },
  { value: "title-asc",       label: "Tên A → Z" },
  { value: "title-desc",      label: "Tên Z → A" },
  { value: "publish_year-desc", label: "Năm mới nhất" },
];

const SEARCH_BY_OPTIONS = [
  { value: "all",        label: "Tất cả" },
  { value: "title",      label: "Tên sách" },
  { value: "author",     label: "Tác giả" },
  { value: "publisher",  label: "NXB" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function getDisplayPrice(b: Book) {
  if (b.is_on_sale && b.sale_price != null && b.sale_price > 0) {
    return { sale: b.sale_price, original: b.price };
  }
  return { sale: null, original: b.price };
}

function getSalePercent(original: number, sale: number) {
  return Math.round((1 - sale / original) * 100);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="books-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton" style={{ height: 240 }} />
          <div style={{ padding: 14 }}>
            <div className="skeleton" style={{ height: 12, marginBottom: 8, width: "60%" }} />
            <div className="skeleton" style={{ height: 16, marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 14, width: "70%", marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 32 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Book Card (Grid) ─────────────────────────────────────────────────────────
function BookCard({ book, onAddCart }: {
  book: Book;
  onAddCart: (b: Book) => void;
}) {
  const { sale, original } = getDisplayPrice(book);
  const inStock = book.quantity > 0;
  const imgUrl = getBookImageUrl(book.image_url, book.category_id)
    || "https://via.placeholder.com/300x420?text=No+Image";

  return (
    <Link href={`/books/${book.book_id}`} className="book-card-search" style={{ textDecoration: "none" }}>
      <div className="book-cover-wrap">
        <img src={imgUrl} alt={book.title} className="book-cover-img" loading="lazy" />
        <span className={`book-status-badge ${inStock ? "badge-in-stock" : "badge-out-stock"}`}>
          {inStock ? "Còn hàng" : "Hết hàng"}
        </span>
        {sale != null && (
          <span className="book-sale-badge">-{getSalePercent(original, sale)}%</span>
        )}
      </div>
      <div className="book-card-body">
        <div className="book-category-tag">{book.categories?.name || book.category_id}</div>
        <div className="book-card-title" title={book.title}>{book.title}</div>
        <div className="book-card-author">
          <i className="fas fa-pen-nib" style={{ marginRight: 4 }} />{book.author}
        </div>
        <div className="book-card-footer">
          <div className="book-price-wrap">
            {sale != null ? (
              <>
                <span className="book-sale-price">{formatPrice(sale)}</span>
                <span className="book-original-price">{formatPrice(original)}</span>
              </>
            ) : (
              <span className="book-price">{formatPrice(original)}</span>
            )}
          </div>
          <button
            className="btn-add-cart"
            disabled={!inStock}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddCart(book); }}
            title={inStock ? "Thêm vào giỏ" : "Hết hàng"}
          >
            <i className="fas fa-cart-plus" />
          </button>
        </div>
      </div>
    </Link>
  );
}

// ─── Book List Item ───────────────────────────────────────────────────────────
function BookListItem({ book, onAddCart }: {
  book: Book;
  onAddCart: (b: Book) => void;
}) {
  const { sale, original } = getDisplayPrice(book);
  const inStock = book.quantity > 0;
  const imgUrl = getBookImageUrl(book.image_url, book.category_id)
    || "https://via.placeholder.com/300x420?text=No+Image";

  return (
    <Link href={`/books/${book.book_id}`} className="book-list-item" style={{ textDecoration: "none" }}>
      <img src={imgUrl} alt={book.title} className="book-list-cover" loading="lazy" />
      <div className="book-list-info">
        <div className="book-list-title">{book.title}</div>
        <div className="book-list-meta">
          <span><i className="fas fa-pen-nib" />{book.author}</span>
          {book.publisher && <span><i className="fas fa-building" />{book.publisher}</span>}
          {book.publish_year && <span><i className="fas fa-calendar" />{book.publish_year}</span>}
          <span><i className="fas fa-tag" />{book.categories?.name || book.category_id}</span>
        </div>
        {book.description && (
          <div className="book-list-desc">{book.description}</div>
        )}
        <div className="book-list-footer">
          {sale != null ? (
            <>
              <span className="book-sale-price" style={{ fontSize: "1.1rem" }}>{formatPrice(sale)}</span>
              <span className="book-original-price">{formatPrice(original)}</span>
              <span className="book-sale-badge" style={{ position: "static" }}>-{getSalePercent(original, sale)}%</span>
            </>
          ) : (
            <span className="book-price" style={{ fontSize: "1.1rem" }}>{formatPrice(original)}</span>
          )}
          <span className={`book-status-badge ${inStock ? "badge-in-stock" : "badge-out-stock"}`} style={{ position: "static" }}>
            {inStock ? "Còn hàng" : "Hết hàng"}
          </span>
          <button
            className="btn-add-cart"
            disabled={!inStock}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddCart(book); }}
          >
            <i className="fas fa-cart-plus" /> Thêm vào giỏ
          </button>
        </div>
      </div>
    </Link>
  );
}

// ─── Book Detail Modal ────────────────────────────────────────────────────────
function BookModal({ book, onClose, onAddCart }: {
  book: Book;
  onClose: () => void;
  onAddCart: (b: Book, qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const { sale, original } = getDisplayPrice(book);
  const inStock = book.quantity > 0;
  const imgUrl = getBookImageUrl(book.image_url, book.category_id)
    || "https://via.placeholder.com/300x420?text=No+Image";

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="book-modal-overlay" onClick={handleBackdrop}>
      <div className="book-modal" role="dialog" aria-modal="true" aria-label={book.title}>
        <div className="book-modal-header">
          <button className="modal-close-btn" onClick={onClose} aria-label="Đóng">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="book-modal-body">
          <img src={imgUrl} alt={book.title} className="book-modal-cover" />
          <div className="book-modal-info">
            <div className="book-category-tag" style={{ marginBottom: 6 }}>
              {book.categories?.name || book.category_id}
            </div>
            <h2>{book.title}</h2>
            <div className="book-modal-meta">
              <span className="meta-chip"><i className="fas fa-pen-nib" />{book.author}</span>
              {book.publisher && <span className="meta-chip"><i className="fas fa-building" />{book.publisher}</span>}
              {book.publish_year && <span className="meta-chip"><i className="fas fa-calendar" />{book.publish_year}</span>}
              <span className={`meta-chip ${inStock ? "" : "text-danger"}`}>
                <i className={`fas ${inStock ? "fa-check-circle" : "fa-times-circle"}`} style={{ color: inStock ? "#16a34a" : "#dc2626" }} />
                {inStock ? `Còn ${book.quantity} cuốn` : "Hết hàng"}
              </span>
            </div>

            <div className="book-modal-price-row">
              {sale != null ? (
                <>
                  <span className="modal-sale-price">{formatPrice(sale)}</span>
                  <span className="modal-original-price">{formatPrice(original)}</span>
                  <span className="modal-sale-tag">Tiết kiệm {getSalePercent(original, sale)}%</span>
                </>
              ) : (
                <span className="modal-price">{formatPrice(original)}</span>
              )}
            </div>

            {book.description && (
              <div className="book-modal-desc">{book.description}</div>
            )}

            <div className="book-modal-actions">
              {inStock && (
                <div className="qty-control">
                  <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                  <input
                    className="qty-input"
                    type="number"
                    min={1}
                    max={book.quantity}
                    value={qty}
                    onChange={e => setQty(Math.min(book.quantity, Math.max(1, Number(e.target.value))))}
                  />
                  <button className="qty-btn" onClick={() => setQty(q => Math.min(book.quantity, q + 1))}>+</button>
                </div>
              )}
              <button
                className="btn-modal-cart"
                disabled={!inStock}
                onClick={() => { onAddCart(book, qty); onClose(); }}
              >
                <i className="fas fa-cart-plus" />
                {inStock ? "Thêm vào giỏ hàng" : "Hết hàng"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search state (from URL)
  const [q, setQ]               = useState(searchParams.get("q") || "");
  const [searchBy, setSearchBy] = useState(searchParams.get("by") || "all");
  const [sort, setSort]         = useState(searchParams.get("sort") || "created_at-desc");
  const [categoryId, setCategoryId] = useState(searchParams.get("cat") || "");
  const [onlyInStock, setOnlyInStock] = useState(searchParams.get("stock") === "1");
  const [onlyOnSale, setOnlyOnSale]   = useState(searchParams.get("sale") === "1");
  const [minPrice, setMinPrice] = useState(searchParams.get("minP") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxP") || "");
  const [view, setView]         = useState<"grid" | "list">("grid");
  const [page, setPage]         = useState(1);

  // Data state
  const [allBooks, setAllBooks]       = useState<Book[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [toast, setToast]             = useState<string | null>(null);

  // Input state (before submit)
  const [inputQ, setInputQ]           = useState(q);
  const [inputSearchBy, setInputSearchBy] = useState(searchBy);

  // Sync khi URL params thay đổi (navigate từ trang khác, ví dụ /search?cat=VH)
  useEffect(() => {
    const newQ   = searchParams.get("q") || "";
    const newCat = searchParams.get("cat") || "";
    const newBy  = searchParams.get("by") || "all";
    setQ(newQ);
    setInputQ(newQ);
    setSearchBy(newBy);
    setInputSearchBy(newBy);
    setCategoryId(newCat);
    setPage(1);
  }, [searchParams]);

  // Load categories once
  useEffect(() => {
    apiFetch<{ items: Category[] }>("/categories")
      .then(r => setCategories(r.items || []))
      .catch(() => {});
  }, []);

  // Load books when filters change
  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) { params.set("search", q); params.set("searchBy", searchBy); }
      if (sort) params.set("sort", sort);
      // Truyền category_id lên API để filter server-side (chính xác hơn)
      if (categoryId) params.set("category_id", categoryId);
      const res = await apiFetch<{ items: Book[] }>(`/books?${params}`);
      setAllBooks(res.items || []);
      setPage(1);
    } catch {
      setAllBooks([]);
    } finally {
      setIsLoading(false);
    }
  }, [q, searchBy, sort, categoryId]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  // Client-side filter (price, stock, sale — category đã filter server-side)
  const filtered = useMemo(() => {
    let list = allBooks;
    if (onlyInStock) list = list.filter(b => b.quantity > 0);
    if (onlyOnSale)  list = list.filter(b => b.is_on_sale && b.sale_price != null);
    if (minPrice)    list = list.filter(b => {
      const p = b.is_on_sale && b.sale_price ? b.sale_price : b.price;
      return p >= Number(minPrice);
    });
    if (maxPrice)    list = list.filter(b => {
      const p = b.is_on_sale && b.sale_price ? b.sale_price : b.price;
      return p <= Number(maxPrice);
    });
    return list;
  }, [allBooks, onlyInStock, onlyOnSale, minPrice, maxPrice]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Category counts (từ backend trả về)
  const catCounts = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach(c => { map[c.category_id] = c.books?.[0]?.count || 0; });
    return map;
  }, [categories]);

  const totalBooksCount = useMemo(() => {
    return Object.values(catCounts).reduce((a, b) => a + b, 0);
  }, [catCounts]);

  // Active filter tags
  const activeTags = useMemo(() => {
    const tags: { label: string; clear: () => void }[] = [];
    if (q) tags.push({ label: `"${q}"`, clear: () => { setQ(""); setInputQ(""); } });
    if (categoryId) {
      const cat = categories.find(c => c.category_id === categoryId);
      tags.push({ label: cat?.name || categoryId, clear: () => setCategoryId("") });
    }
    if (onlyInStock) tags.push({ label: "Còn hàng", clear: () => setOnlyInStock(false) });
    if (onlyOnSale)  tags.push({ label: "Đang giảm giá", clear: () => setOnlyOnSale(false) });
    if (minPrice)    tags.push({ label: `Từ ${Number(minPrice).toLocaleString()}đ`, clear: () => setMinPrice("") });
    if (maxPrice)    tags.push({ label: `Đến ${Number(maxPrice).toLocaleString()}đ`, clear: () => setMaxPrice("") });
    return tags;
  }, [q, categoryId, onlyInStock, onlyOnSale, minPrice, maxPrice, categories]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(inputQ);
    setSearchBy(inputSearchBy);
    setPage(1);
  }

  function resetFilters() {
    setCategoryId(""); setOnlyInStock(false); setOnlyOnSale(false);
    setMinPrice(""); setMaxPrice("");
  }

  async function handleAddCart(book: Book, qty = 1) {
    await addToCart(book, qty);
    setToast(`Đã thêm "${book.title}" vào giỏ hàng`);
    setTimeout(() => setToast(null), 2500);
  }

  // Pagination buttons
  function renderPagination() {
    if (totalPages <= 1) return null;
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return (
      <div className="pagination-wrap">
        <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
          <i className="fas fa-chevron-left" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} style={{ padding: "0 4px", color: "#9ca3af" }}>…</span>
          ) : (
            <button key={p} className={`page-btn ${page === p ? "active" : ""}`} onClick={() => setPage(p as number)}>
              {p}
            </button>
          )
        )}
        <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
          <i className="fas fa-chevron-right" />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* ── Hero ── */}
      <section className="search-hero">
        <h1 className="search-hero-title">
          <i className="fas fa-book-open" style={{ marginRight: 12 }} />
          Tìm kiếm sách
        </h1>
        <p className="search-hero-sub">Khám phá hàng nghìn đầu sách từ nhiều thể loại</p>
        <div className="search-bar-wrap">
          <form onSubmit={handleSearch}>
            <div className="search-bar">
              <input
                type="text"
                value={inputQ}
                onChange={e => setInputQ(e.target.value)}
                placeholder="Nhập tên sách, tác giả, NXB..."
                autoComplete="off"
              />
              <div className="search-bar-divider" />
              <select value={inputSearchBy} onChange={e => setInputSearchBy(e.target.value)}>
                {SEARCH_BY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button type="submit">
                <i className="fas fa-search" /> Tìm kiếm
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="search-stats-bar">
        <div className="container">
          <div className="search-stats-inner">
            <span className="search-result-count">
              {isLoading ? "Đang tải..." : (
                <>Tìm thấy <strong>{filtered.length}</strong> cuốn sách</>
              )}
            </span>
            <div className="search-controls">
              <select className="sort-select" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="view-toggle">
                <button className={`view-btn ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")} title="Dạng lưới">
                  <i className="fas fa-th" />
                </button>
                <button className={`view-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")} title="Dạng danh sách">
                  <i className="fas fa-list" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="container">
        <div className="search-layout">

          {/* ── Sidebar ── */}
          <aside className="filter-sidebar">
            <div className="filter-sidebar-inner">

              {/* Categories */}
              <div className="filter-card">
                <div className="filter-card-title">
                  <i className="fas fa-layer-group" /> Thể loại
                </div>
                <div className="category-list">
                  <button
                    className={`category-pill ${categoryId === "" ? "active" : ""}`}
                    onClick={() => { setCategoryId(""); setPage(1); }}
                  >
                    <span>Tất cả</span>
                    <span className="cat-count">{totalBooksCount}</span>
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.category_id}
                      className={`category-pill ${categoryId === cat.category_id ? "active" : ""}`}
                      onClick={() => { setCategoryId(cat.category_id); setPage(1); }}
                    >
                      <span>{cat.name}</span>
                      <span className="cat-count">{catCounts[cat.category_id] || 0}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="filter-card">
                <div className="filter-card-title">
                  <i className="fas fa-tag" /> Khoảng giá
                </div>
                <div className="price-inputs">
                  <input
                    className="price-input"
                    type="number"
                    placeholder="Từ"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                    min={0}
                  />
                  <input
                    className="price-input"
                    type="number"
                    placeholder="Đến"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    min={0}
                  />
                </div>
              </div>

              {/* Other filters */}
              <div className="filter-card">
                <div className="filter-card-title">
                  <i className="fas fa-filter" /> Bộ lọc khác
                </div>
                <label className="filter-check">
                  <input type="checkbox" checked={onlyInStock} onChange={e => { setOnlyInStock(e.target.checked); setPage(1); }} />
                  Chỉ còn hàng
                </label>
                <label className="filter-check">
                  <input type="checkbox" checked={onlyOnSale} onChange={e => { setOnlyOnSale(e.target.checked); setPage(1); }} />
                  Đang giảm giá
                </label>
                <button className="filter-reset-btn" onClick={resetFilters}>
                  <i className="fas fa-undo" style={{ marginRight: 6 }} />Xóa bộ lọc
                </button>
              </div>

            </div>
          </aside>

          {/* ── Results ── */}
          <div>
            {/* Active filter tags */}
            {activeTags.length > 0 && (
              <div className="active-filters">
                {activeTags.map((tag, i) => (
                  <span key={i} className="active-filter-tag">
                    {tag.label}
                    <button onClick={tag.clear} aria-label="Xóa bộ lọc">
                      <i className="fas fa-times" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Books */}
            {isLoading ? (
              <SkeletonGrid />
            ) : paginated.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📚</div>
                <h4>Không tìm thấy sách nào</h4>
                <p>Thử thay đổi từ khóa hoặc bộ lọc của bạn.</p>
                <button className="filter-reset-btn" style={{ maxWidth: 200, margin: "12px auto 0" }} onClick={() => { setQ(""); setInputQ(""); resetFilters(); }}>
                  Xóa tất cả bộ lọc
                </button>
              </div>
            ) : view === "grid" ? (
              <div className="books-grid">
                {paginated.map(b => (
                  <BookCard key={b.book_id} book={b} onAddCart={b => handleAddCart(b)} />
                ))}
              </div>
            ) : (
              <div className="books-list">
                {paginated.map(b => (
                  <BookListItem key={b.book_id} book={b} onAddCart={b => handleAddCart(b)} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && renderPagination()}
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          background: "#1f2937", color: "white", padding: "12px 24px",
          borderRadius: 12, fontSize: "0.9rem", fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 99999,
          animation: "slideUp 0.2s ease",
          display: "flex", alignItems: "center", gap: 8,
          whiteSpace: "nowrap",
        }}>
          <i className="fas fa-check-circle" style={{ color: "#34d399" }} />
          {toast}
        </div>
      )}
    </>
  );
}
