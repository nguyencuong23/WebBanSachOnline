import { useEffect, useState } from "react";
import { apiFetch } from "../../api";

export function AdminSettingsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ items: any[] }>("/settings")
      .then((r) => setItems(r.items || []))
      .catch((e: any) => setError(e.message || String(e)));
  }, []);

  async function save() {
    setSaved(null);
    await apiFetch<{ items: any[] }>("/admin/settings", { method: "PUT", body: JSON.stringify({ items }) });
    setSaved("Saved");
  }

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white border-bottom">
            <h5 className="mb-0 fw-bold">
              <i className="fas fa-cog me-2 text-primary" />
              Cài đặt chung
            </h5>
          </div>
          <div className="card-body p-4">
            {error && <p className="text-danger">{error}</p>}
            {saved && <p className="text-success">{saved}</p>}
            <table className="table" cellPadding={8}>
        <thead>
          <tr>
            <th align="left">Key</th>
            <th align="left">Value</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s, i) => (
            <tr key={s.key}>
              <td>{s.key}</td>
              <td>
                <input
                  value={s.value ?? ""}
                  onChange={(e) =>
                    setItems((old) => old.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
            </table>
            <button className="btn btn-primary" onClick={save}>
              Lưu cài đặt
            </button>
          </div>
        </div>
      </div>
      <div className="col-lg-4">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white border-bottom">
            <h5 className="mb-0 fw-bold">
              <i className="fas fa-server me-2 text-info" />
              Trạng thái hệ thống
            </h5>
          </div>
          <div className="card-body">
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Trạng thái</span>
              <span className="badge bg-success">Hoạt động</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Phiên bản</span>
              <span className="fw-semibold">v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

