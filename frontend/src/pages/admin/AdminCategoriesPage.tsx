import { useEffect, useState } from "react";
import { apiFetch } from "../../api";

export function AdminCategoriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [category_id, setId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiFetch<{ items: any[] }>("/categories");
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch("/admin/categories", { method: "POST", body: JSON.stringify({ category_id, name }) });
    setId("");
    setName("");
    await load();
  }

  async function remove(id: string) {
    await apiFetch(`/admin/categories/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>
          <i className="fas fa-tags me-2" />
          Quản lý thể loại sách
        </h1>
      </div>
      {error && <p className="text-danger">{error}</p>}
      <form onSubmit={create} style={{ display: "flex", gap: 8 }}>
        <input placeholder="Mã thể loại" value={category_id} onChange={(e) => setId(e.target.value)} />
        <input placeholder="Tên thể loại" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary" type="submit">
          Thêm thể loại
        </button>
      </form>
      <div className="table-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Mã thể loại</th>
                <th>Tên thể loại</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.category_id}>
                  <td>{c.category_id}</td>
                  <td>{c.name}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-danger" onClick={() => remove(c.category_id)}>
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

