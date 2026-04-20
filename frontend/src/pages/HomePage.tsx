import { useEffect, useState } from "react";
import { apiFetch } from "../api";

type Book = {
  book_id: string;
  title: string;
  author: string;
  quantity: number;
  price: number;
  sale_price?: number | null;
};

export function HomePage() {
  const [items, setItems] = useState<Book[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ items: Book[] }>("/books/latest?limit=10")
      .then((r) => setItems(r.items))
      .catch((e) => setError(String(e.message || e)));
  }, []);

  return (
    <>
      <section className="hero-modern">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-10 text-center">
              <h1 className="hero-title">
                Thư viện <span>Đại học Đại Nam</span>
                <br />
                Kết nối tri thức - Kiến tạo tương lai
              </h1>
              <p className="hero-desc">
                Hệ thống thư viện hiện đại, nguồn tài liệu phong phú, không gian học tập đầy cảm hứng dành cho sinh viên
                DNU.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="book-section">
        <div className="container">
          <div className="text-center">
            <h3 className="section-title">Sách & Giáo trình mới nhất</h3>
            <p className="section-subtitle">Cập nhật liên tục các đầu sách phục vụ đào tạo và nghiên cứu</p>
          </div>
          {error && <p className="text-danger text-center">{error}</p>}
          <div className="row g-4 mt-2">
            {items.map((b) => (
              <div className="col-lg-3 col-md-4 col-sm-6" key={b.book_id}>
                <div className="book-card d-block h-100">
                  <div style={{ height: 320, overflow: "hidden", position: "relative", background: "#f8f9fa" }}>
                    <img
                      src="https://via.placeholder.com/300x450?text=Book"
                      alt={b.title}
                      style={{ height: "100%", width: "100%", objectFit: "contain" }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 15,
                        right: 15,
                        background: "var(--primary-color)",
                        color: "white",
                        padding: "5px 12px",
                        borderRadius: 20,
                        fontSize: "0.8rem",
                        fontWeight: "bold"
                      }}
                    >
                      Mới
                    </div>
                  </div>
                  <div className="p-3">
                    <h6 className="fw-bold text-truncate mb-1">{b.title}</h6>
                    <span className="d-block text-secondary small text-truncate">
                      <i className="fas fa-user-edit me-2 text-primary" />
                      {b.author}
                    </span>
                    <span className="d-block mt-2">Còn lại: {b.quantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

