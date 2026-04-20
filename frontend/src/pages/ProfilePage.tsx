import { useEffect, useState } from "react";
import { apiFetch } from "../api";

export function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ profile: any }>("/me")
      .then((r) => setProfile(r.profile))
      .catch((e) => setError(String(e.message || e)));
  }, []);

  if (error) return <p className="text-danger">{error}</p>;
  if (!profile) return <p>Đang tải...</p>;

  return (
    <div className="container py-5">
      <div className="row">
        <div className="col-12 mb-4">
          <h2 className="fw-bold text-dark">
            <i className="fa fa-user-circle me-2" />
            Thông tin cá nhân
          </h2>
          <p className="text-muted">Quản lý thông tin tài khoản của bạn</p>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-4 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-body text-center p-4">
              <div className="mb-4 text-center">
                <i className="fa fa-user-circle text-primary" style={{ fontSize: 100 }} />
              </div>
              <h4 className="fw-bold text-dark mb-2">{profile.full_name || profile.email}</h4>
              <span className={`badge ${profile.role === "admin" ? "bg-danger" : "bg-primary"} mb-3 px-3 py-2`}>
                <i className="fa fa-shield-alt me-1" />
                {profile.role}
              </span>
              <div className="mt-4 text-start">
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Email</small>
                  <strong>{profile.email}</strong>
                </div>
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Số điện thoại</small>
                  <strong>{profile.phone || "Đang cập nhật"}</strong>
                </div>
                <div>
                  <small className="text-muted d-block mb-1">Trạng thái</small>
                  <span className={`badge ${profile.is_active ? "bg-success" : "bg-secondary"}`}>
                    {profile.is_active ? "Hoạt động" : "Tạm khóa"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0 fw-bold">
                <i className="fa fa-info-circle me-2" />
                Chi tiết tài khoản
              </h5>
            </div>
            <div className="card-body p-4">
              <pre style={{ background: "#f8f9fa", borderRadius: 8, padding: 12, overflow: "auto" }}>
                {JSON.stringify(profile, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

