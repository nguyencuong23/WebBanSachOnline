"use client";

/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      ProfilePage.tsx
 * Mục đích:      Trang hồ sơ cá nhân — cho phép người dùng xem và chỉnh sửa
 *                thông tin cá nhân, upload/xóa ảnh đại diện và đổi mật khẩu.
 * Các chức năng chính:
 *   - Hiển thị avatar, tên, username, role, điểm tích lũy
 *   - Form chỉnh sửa: họ tên, email, SĐT, địa chỉ mặc định
 *   - Upload ảnh đại diện (chuyển sang Base64 rồi gửi lên API)
 *   - Xóa ảnh đại diện
 *   - Modal đổi mật khẩu (xác minh mật khẩu cũ trước)
 *   - Toast notification cho phản hồi thành công/lỗi
 *
 * Tên module:    Profile Page
 * Module liên quan: lib/api.ts, lib/avatar.ts
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getAvatarUrl } from "@/lib/avatar";
import "./profile.css";

const FULL_NAME_REGEX = /^[\p{L}](?:[\p{L}\s'.-]{0,98}[\p{L}])?$/u;
const PHONE_REGEX = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/;

export function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "danger" } | null>(null);

  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const showToast = (message: string, type: "success" | "danger" = "success") => {
    console.log(`[Toast] ${type}: ${message}`);
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Form states
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    default_address: "",
    email: "",
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ profile: any }>("/me");
      setProfile(res.profile);
      setFormData({
        full_name: res.profile.full_name || "",
        phone_number: res.profile.phone_number || "",
        default_address: res.profile.default_address || "",
        email: res.profile.email || "",
      });
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!FULL_NAME_REGEX.test(formData.full_name)) {
      showToast("Họ tên không hợp lệ (2-100 ký tự, chỉ gồm chữ cái).", "danger");
      return;
    }
    if (!EMAIL_REGEX.test(formData.email)) {
      showToast("Email không đúng định dạng.", "danger");
      return;
    }
    if (formData.phone_number && !PHONE_REGEX.test(formData.phone_number)) {
      showToast("Số điện thoại không hợp lệ (di động Việt Nam).", "danger");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch<{ profile: any }>("/me", {
        method: "PATCH",
        body: JSON.stringify(formData),
      });
      setProfile(res.profile);
      setIsEditing(false);
      showToast("Cập nhật thông tin thành công!", "success");
    } catch (e: any) {
      showToast(e.message || String(e), "danger");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Kích thước ảnh không được vượt quá 2MB", "danger");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setSaving(true);
      try {
        const res = await apiFetch<any>("/me/avatar", {
          method: "POST",
          body: JSON.stringify({ image: base64 }),
        });
        setProfile(res.profile);
        showToast("Cập nhật ảnh đại diện thành công", "success");
      } catch (e: any) {
        showToast(e.message || String(e), "danger");
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAvatar = async () => {
    if (!confirm("Bạn có chắc muốn xóa ảnh đại diện?")) return;
    setSaving(true);
    try {
      const res = await apiFetch<any>("/me/avatar", { method: "DELETE" });
      setProfile(res.profile);
      showToast("Đã xóa ảnh đại diện", "success");
    } catch (e: any) {
      showToast(e.message || String(e), "danger");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_REGEX.test(passwordData.newPassword)) {
      showToast("Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.", "danger");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast("Mật khẩu xác nhận không khớp", "danger");
      return;
    }

    setChangingPassword(true);
    try {
      await apiFetch("/me/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      showToast("Đổi mật khẩu thành công", "success");
      closePasswordModal();
    } catch (e: any) {
      showToast(e.message || String(e), "danger");
    } finally {
      setChangingPassword(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-3 text-muted">Đang tải thông tin cá nhân...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-primary rounded-pill" onClick={fetchProfile}>Thử lại</button>
      </div>
    );
  }

  return (
    <>
      <div className="container py-5 animate-fade-in">

      <div className="row justify-content-center">
        <div className="col-lg-4 mb-4">
          <div className="card border-0 shadow-sm text-center h-100 overflow-hidden profile-side-card">
            <div className="card-body p-5">
              <div className="avatar-wrapper mb-4 mx-auto position-relative" style={{ width: "fit-content" }}>
                <div 
                  className="avatar-container shadow-lg cursor-pointer position-relative overflow-hidden group"
                  onClick={() => document.getElementById("avatarInput")?.click()}
                  style={{ cursor: "pointer" }}
                >
                  {(() => {
                    const url = getAvatarUrl(profile.avatar_url);
                    return profile.avatar_url ? (
                      <img 
                        src={url} 
                        alt="Avatar" 
                        className="rounded-circle w-100 h-100" 
                        style={{ objectFit: "cover", display: "block" }} 
                        onError={(e) => {
                          console.error("Avatar load error for URL:", url);
                          e.currentTarget.style.display = "none";
                          // Hiển thị icon thay thế nếu lỗi
                          const parent = e.currentTarget.parentElement;
                          if (parent && !parent.querySelector(".avatar-fallback")) {
                            const icon = document.createElement("i");
                            icon.className = "fa-solid fa-user-tie avatar-fallback";
                            icon.style.fontSize = "80px";
                            parent.appendChild(icon);
                          }
                        }}
                      />
                    ) : (
                      <i className="fa-solid fa-user-tie" />
                    );
                  })()}
                  <div className="avatar-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 opacity-0 transition-all" style={{ opacity: 0 }}>
                    <i className="fas fa-camera text-white fs-4" />
                  </div>
                </div>
                {profile.avatar_url && (
                  <button 
                    className="btn btn-sm btn-danger rounded-circle position-absolute top-0 end-0 shadow-sm"
                    style={{ width: "32px", height: "32px", padding: 0, marginTop: "-5px", marginRight: "-5px", zIndex: 10 }}
                    onClick={handleDeleteAvatar}
                    title="Xóa ảnh đại diện"
                  >
                    <i className="fas fa-times" />
                  </button>
                )}
                <input 
                  type="file" 
                  id="avatarInput" 
                  hidden 
                  accept="image/*" 
                  onChange={handleAvatarChange}
                />
              </div>
              <h3 className="fw-bold mb-1">{profile.full_name || profile.username}</h3>
              <p className="text-muted small mb-3">@{profile.username}</p>
              
              <div className="d-flex justify-content-center gap-2 mb-4">
                <span className={`badge rounded-pill ${profile.role === "admin" ? "bg-danger" : "bg-primary"} px-3 py-2`}>
                  <i className="fas fa-shield-halved me-2" />
                  {profile.role === "admin" ? "Quản trị viên" : "Thành viên"}
                </span>
                <span className="badge rounded-pill bg-success px-3 py-2">
                  <i className="fas fa-check-circle me-2" />
                  Hoạt động
                </span>
              </div>

              <div className="loyalty-points-card p-3 rounded-4 mb-4" style={{ background: "linear-gradient(135deg, #fff9e6 0%, #fff0b3 100%)", border: "1px solid #ffe066" }}>
                <div className="text-muted small fw-bold text-uppercase mb-1" style={{ letterSpacing: "1px" }}>Điểm tích lũy</div>
                <div className="fs-3 fw-bold text-warning-emphasis">
                  <i className="fas fa-coins me-2" />
                  {(profile.loyalty_points || 0).toLocaleString()}
                </div>
              </div>

              <hr className="my-4 opacity-10" />
              
              <div className="text-start">
                <div className="d-flex align-items-center mb-3">
                  <div className="icon-box-sm bg-light rounded-circle me-3">
                    <i className="fas fa-envelope text-primary" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-muted small">Email</div>
                    <div className="fw-semibold text-truncate">{profile.email}</div>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <div className="icon-box-sm bg-light rounded-circle me-3">
                    <i className="fas fa-phone text-primary" />
                  </div>
                  <div>
                    <div className="text-muted small">Số điện thoại</div>
                    <div className="fw-semibold">{profile.phone_number || "Chưa cập nhật"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white p-4 border-bottom-0 d-flex justify-content-between align-items-center">
              <h4 className="mb-0 fw-bold"><i className="fas fa-user-edit me-2 text-primary" />Chi tiết hồ sơ</h4>
              {!isEditing && (
                <button className="btn btn-primary btn-sm rounded-pill px-4" onClick={() => setIsEditing(true)}>
                  <i className="fas fa-edit me-2" />Chỉnh sửa
                </button>
              )}
            </div>
            
            <div className="card-body p-4 pt-0">
              <form onSubmit={handleUpdate}>
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label">Tên đăng nhập</label>
                    <div className="form-control-plaintext border rounded px-3 py-2 bg-light text-muted">
                      {profile.username}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="Nhập địa chỉ email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="col-md-6">
                    <label className="form-label">Họ và tên</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Nhập họ và tên"
                      value={formData.full_name}
                      onChange={e => setFormData({...formData, full_name: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Số điện thoại</label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      placeholder="Số điện thoại liên hệ"
                      value={formData.phone_number}
                      onChange={e => setFormData({...formData, phone_number: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Địa chỉ nhận hàng mặc định</label>
                    <textarea 
                      className="form-control" 
                      rows={3}
                      placeholder="Địa chỉ giao hàng mặc định của bạn..."
                      value={formData.default_address}
                      onChange={e => setFormData({...formData, default_address: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-5 d-flex gap-2">
                    <button type="submit" className="btn btn-primary px-5 rounded-pill" disabled={saving}>
                      {saving ? <><i className="fas fa-spinner fa-spin me-2" />Đang lưu...</> : "Lưu thay đổi"}
                    </button>
                    <button type="button" className="btn btn-light px-4 rounded-pill" onClick={() => setIsEditing(false)} disabled={saving}>
                      Hủy bỏ
                    </button>
                  </div>
                )}
              </form>

              <div className="mt-5 pt-4 border-top">
                <h5 className="fw-bold mb-3"><i className="fas fa-shield-alt me-2 text-warning" />Bảo mật & Hệ thống</h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="p-3 border rounded-3 bg-light d-flex align-items-center h-100">
                      <div className="bg-white p-2 rounded shadow-sm me-3">
                        <i className="fas fa-key text-primary" />
                      </div>
                      <div>
                        <div className="fw-bold small">Mật khẩu</div>
                        <div className="text-muted small">Đã cập nhật: {new Date(profile.updated_at || profile.created_at).toLocaleDateString("vi-VN")}</div>
                      </div>
                      <button 
                        className="btn btn-sm btn-outline-primary ms-auto rounded-pill px-3"
                        onClick={() => setShowPasswordModal(true)}
                      >
                        Thay đổi
                      </button>
                    </div>
                  </div>
                  {profile.customer_note && (
                    <div className="col-12">
                      <div className="p-3 border border-info rounded-3 bg-info bg-opacity-10 d-flex align-items-start">
                        <div className="bg-white p-2 rounded shadow-sm me-3">
                          <i className="fas fa-sticky-note text-info" />
                        </div>
                        <div>
                          <div className="fw-bold small text-info-emphasis">Ghi chú từ hệ thống</div>
                          <div className="text-muted small">{profile.customer_note}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Password Change Modal - Đặt ở đây để tránh bị ảnh hưởng bởi transform của container cha */}
      {showPasswordModal && (
        <div className="modal-overlay position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center px-3" 
             style={{ zIndex: 2000, background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(12px)" }}
             onClick={closePasswordModal}>
          <div className="modal-dialog w-100 animate-fade-in" style={{ maxWidth: "420px" }} onClick={e => e.stopPropagation()}>
            {/* ... Modal content remains the same ... */}
            <div className="modal-content border-0 shadow-2xl rounded-5 overflow-hidden" 
                 style={{ background: "#fff", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
              
              <div className="p-4 text-center border-bottom border-light">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 shadow-sm" 
                     style={{ width: "60px", height: "60px", background: "var(--primary-light)", color: "var(--primary-color)" }}>
                  <i className="fas fa-shield-alt fs-3" />
                </div>
                <h4 className="fw-bold text-dark mb-1">Thay đổi mật khẩu</h4>
                <p className="text-muted small mb-0">Bảo mật tài khoản của bạn bằng mật khẩu mạnh</p>
              </div>

              <form onSubmit={handleChangePassword}>
                <div className="modal-body p-4">
                  <div className="mb-4">
                    <label className="form-label text-dark small fw-bold mb-2">Mật khẩu hiện tại</label>
                    <div className="input-group input-group-merge">
                      <span className="input-group-text bg-light border-end-0 rounded-start-pill ps-3">
                        <i className="fas fa-lock-open text-muted small" />
                      </span>
                      <input 
                        type={showCurrent ? "text" : "password"} 
                        className="form-control border-start-0 border-end-0 bg-white" 
                        placeholder="Nhập mật khẩu cũ"
                        required 
                        value={passwordData.currentPassword}
                        onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      />
                      <button 
                        type="button" 
                        className="input-group-text bg-white border-start-0 rounded-end-pill pe-3 text-muted"
                        style={{ cursor: "pointer", borderLeft: "none" }}
                        onClick={() => setShowCurrent(!showCurrent)}
                      >
                        <i className={`fas ${showCurrent ? "fa-eye-slash" : "fa-eye"} small`} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label text-dark small fw-bold mb-2">Mật khẩu mới</label>
                    <div className="input-group input-group-merge">
                      <span className="input-group-text bg-light border-end-0 rounded-start-pill ps-3">
                        <i className="fas fa-key text-muted small" />
                      </span>
                      <input 
                        type={showNew ? "text" : "password"} 
                        className="form-control border-start-0 border-end-0 bg-white" 
                        placeholder="Tối thiểu 6 ký tự"
                        required 
                        minLength={6}
                        value={passwordData.newPassword}
                        onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                      />
                      <button 
                        type="button" 
                        className="input-group-text bg-white border-start-0 rounded-end-pill pe-3 text-muted"
                        style={{ cursor: "pointer", borderLeft: "none" }}
                        onClick={() => setShowNew(!showNew)}
                      >
                        <i className={`fas ${showNew ? "fa-eye-slash" : "fa-eye"} small`} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-0">
                    <label className="form-label text-dark small fw-bold mb-2">Xác nhận mật khẩu mới</label>
                    <div className="input-group input-group-merge">
                      <span className="input-group-text bg-light border-end-0 rounded-start-pill ps-3">
                        <i className="fas fa-check-circle text-muted small" />
                      </span>
                      <input 
                        type={showConfirm ? "text" : "password"} 
                        className="form-control border-start-0 border-end-0 bg-white" 
                        placeholder="Nhập lại mật khẩu mới"
                        required 
                        value={passwordData.confirmPassword}
                        onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      />
                      <button 
                        type="button" 
                        className="input-group-text bg-white border-start-0 rounded-end-pill pe-3 text-muted"
                        style={{ cursor: "pointer", borderLeft: "none" }}
                        onClick={() => setShowConfirm(!showConfirm)}
                      >
                        <i className={`fas ${showConfirm ? "fa-eye-slash" : "fa-eye"} small`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 d-flex gap-3">
                  <button type="button" 
                          className="btn btn-light rounded-pill px-4 flex-grow-1 fw-bold text-muted" 
                          style={{ transition: "all 0.3s" }}
                          onClick={closePasswordModal}>
                    Hủy
                  </button>
                  <button type="submit" 
                          className="btn btn-primary rounded-pill px-4 flex-grow-1 fw-bold" 
                          disabled={changingPassword}>
                    {changingPassword ? <><i className="fas fa-spinner fa-spin me-2" />Đang xử lý...</> : "Cập nhật ngay"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification - Đặt ngoài cùng để không bị ảnh hưởng bởi transform */}
      {toast && (
        <div className={`alert alert-${toast.type} shadow-lg position-fixed top-0 start-50 translate-middle-x mt-4 animate-fade-in`} style={{ zIndex: 9999, borderRadius: "12px", minWidth: "300px", border: "none" }}>
          <div className="d-flex align-items-center">
            <i className={`fas fa-${toast.type === "success" ? "check-circle" : "exclamation-circle"} me-2 fs-5`} />
            <div className="fw-semibold">{toast.message}</div>
          </div>
        </div>
      )}
    </>
  );
}
