import { useEffect, useState } from "react";
import { apiFetch } from "../../api";
import { addToCart } from "../../cart";
import "./search.css";

export function SearchPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);

  async function load(keyword = "") {
    const res = await apiFetch<{ items: any[] }>(`/books?search=${encodeURIComponent(keyword)}`);
    setItems(res.items || []);
  }

  useEffect(() => {
    load("");
  }, []);

  return (
    <>
      <section className="doc-lookup-hero">
        <div className="container text-center">
          <h1 className="hero-title">KHO TÀI LIỆU SỐ & THƯ VIỆN</h1>
          <p className="hero-subtitle">Tra cứu vị trí sách và tài liệu trong toàn bộ hệ thống</p>
          <div className="search-box-wrapper animate-slide-down">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                load(q);
              }}
            >
              <div className="search-input-group">
                <div className="input-divider" />
                <input
                  type="text"
                  className="search-input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nhập tên sách, tác giả để tìm kiếm"
                />
                <button type="submit" className="btn-search-doc">
                  <i className="fa-solid fa-magnifying-glass" /> Tìm kiếm
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <div className="container py-5">
        {!items.length ? (
          <div id="emptyState" className="text-center py-5">
            <img
              src="https://cdn-icons-png.flaticon.com/512/6195/6195678.png"
              width={100}
              style={{ opacity: 0.6, marginBottom: 20 }}
            />
            <h5>Không tìm thấy tài liệu nào</h5>
            <p className="text-muted">Vui lòng thử lại với từ khóa khác.</p>
          </div>
        ) : (
          <div id="resultGrid" className="row g-4">
            {items.map((b) => {
              const isAvailable = Number(b.quantity) > 0;
              return (
                <div className="col-lg-3 col-md-4 col-sm-6 animate-fade-in" key={b.book_id}>
                  <div className="book-card">
                    <div className="book-cover-wrapper">
                      {isAvailable ? (
                        <span className="book-badge badge-avail">
                          <i className="fa-solid fa-check" /> Sẵn sàng
                        </span>
                      ) : (
                        <span className="book-badge badge-out">
                          <i className="fa-solid fa-xmark" /> Hết sách
                        </span>
                      )}
                      <img
                        src={b.image_url || "https://via.placeholder.com/300x450?text=No+Image"}
                        className="book-cover"
                        alt={b.title}
                        loading="lazy"
                      />
                    </div>
                    <div className="book-info">
                      <h3 className="book-title" title={b.title}>
                        {b.title}
                      </h3>
                      <p className="book-author">
                        <i className="fa-solid fa-pen-nib" /> {b.author}
                      </p>
                      <p>{Number(b.sale_price ?? b.price).toLocaleString()}đ</p>
                      <button onClick={() => addToCart(b, 1)}>Thêm vào giỏ</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

