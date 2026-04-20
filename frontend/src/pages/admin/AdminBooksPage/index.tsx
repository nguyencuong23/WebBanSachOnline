import { useEffect, useState } from "react";
import { apiFetch } from "../../../api";

export function AdminBooksPage() {
  const [items, setItems] = useState<any[]>([]);
  const [bookNumber, setBookNumber] = useState("");
  const [bookNumberError, setBookNumberError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [form, setForm] = useState<any>({
    book_id: "",
    title: "",
    author: "",
    category_id: "",
    price: 0,
    publish_year: 2024,
    quantity: 0
  });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiFetch<{ items: any[] }>("/books");
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const categoryId = String(form.category_id || "").trim();
    const number = bookNumber.trim();

    if (!categoryId || !number) {
      setBookNumberError(null);
      setForm((f: any) => ({ ...f, book_id: "" }));
      return;
    }

    if (!/^\d{4}$/.test(number)) {
      setBookNumberError("Phải nhập đúng 4 chữ số");
      setForm((f: any) => ({ ...f, book_id: "" }));
      return;
    }

    setBookNumberError(null);
    setForm((f: any) => ({ ...f, book_id: `${categoryId}-${number}` }));
  }, [form.category_id, bookNumber]);

  async function createBook(e: React.FormEvent) {
    e.preventDefault();
    if (!form.book_id) {
      setBookNumberError("Vui lòng nhập mã thể loại và 4 chữ số để tạo mã sách.");
      return;
    }
    await apiFetch("/admin/books", { method: "POST", body: JSON.stringify({ ...form, is_published: true }) });
    setForm({ book_id: "", title: "", author: "", category_id: "", price: 0, publish_year: 2024, quantity: 0 });
    setBookNumber("");
    setBookNumberError(null);
    await load();
  }

  async function remove(bookId: string) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${bookId}"?`)) return;
    await apiFetch(`/admin/books/${bookId}`, { method: "DELETE" });
    await load();
  }

  const filteredItems = items.filter((b) => {
    const k = keyword.trim().toLowerCase();
    if (!k) return true;
    return [b.book_id, b.title, b.author].some((v) => String(v || "").toLowerCase().includes(k));
  });

  return (
    <div>
      <div className="page-header">
        <h1>
          <i className="fas fa-book me-2" />
          Quản lý sách
        </h1>
      </div>
      {error && <p className="text-danger">{error}</p>}
      <form onSubmit={createBook} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          placeholder="Mã sách"
          value={form.book_id}
          readOnly
        />
        <input
          placeholder="Tên sách"
          value={form.title}
          onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))}
        />
        <input
          placeholder="Tác giả"
          value={form.author}
          onChange={(e) => setForm((f: any) => ({ ...f, author: e.target.value }))}
        />
        <input
          placeholder="Mã thể loại"
          value={form.category_id}
          onChange={(e) => setForm((f: any) => ({ ...f, category_id: e.target.value }))}
        />
        <input
          placeholder="4 chữ số (vd: 0001)"
          value={bookNumber}
          onChange={(e) => setBookNumber(e.target.value.replace(/\D/g, "").slice(0, 4))}
        />
        <input
          type="number"
          placeholder="Giá"
          value={form.price}
          onChange={(e) => setForm((f: any) => ({ ...f, price: Number(e.target.value) }))}
        />
        <input
          type="number"
          placeholder="Năm XB"
          value={form.publish_year}
          onChange={(e) => setForm((f: any) => ({ ...f, publish_year: Number(e.target.value) }))}
        />
        <input
          type="number"
          placeholder="Số lượng"
          value={form.quantity}
          onChange={(e) => setForm((f: any) => ({ ...f, quantity: Number(e.target.value) }))}
        />
        <button className="btn btn-primary" type="submit">
          Thêm sách
        </button>
      </form>
      {bookNumberError && <p className="text-danger">{bookNumberError}</p>}
      <div style={{ marginBottom: 12 }}>
        <input
          id="searchInput"
          className="form-control"
          placeholder="Tìm theo mã sách, tên sách, tác giả..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      <div className="table-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Mã sách</th>
                <th>Tên sách</th>
                <th>Tác giả</th>
                <th className="text-center">Số lượng</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((b) => (
                <tr key={b.book_id}>
                  <td>{b.book_id}</td>
                  <td>{b.title}</td>
                  <td>{b.author}</td>
                  <td className="text-center">{b.quantity}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-danger" onClick={() => remove(b.book_id)}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

