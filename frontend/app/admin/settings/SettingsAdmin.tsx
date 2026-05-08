"use client";

/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      SettingsAdmin.tsx
 * Mục đích:      Trang cài đặt hệ thống trong khu vực admin — cho phép cấu hình
 *                các thông số toàn cục của website qua giao diện tab.
 * Các chức năng chính:
 *   - Tab "Chung": tiêu đề, mô tả SEO, logo, favicon
 *   - Tab "Bán hàng": phí ship, ngưỡng freeship, QR chuyển khoản
 *   - Tab "Liên hệ": hotline, email, địa chỉ, mạng xã hội
 *   - Tab "Hệ thống": chế độ bảo trì, thông báo top bar, tracking scripts
 *   - Upload ảnh (logo, favicon, QR) lên Supabase Storage
 *   - Lưu tất cả cài đặt bằng một lần gọi API (upsert hàng loạt)
 *
 * Tên module:    Admin System Settings
 * Module liên quan: lib/api.ts, routes/settings.js (backend)
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Danh sách định nghĩa các trường cài đặt hệ thống.
 * Mỗi item chứa key (tên trong DB), label (hiển thị), type (loại input) và tab (nhóm).
 * @type {Array<{key: string, label: string, type: string, tab: string}>}
 */
const EXPECTED_SETTINGS = [
  { key: "SiteTitle", label: "Tiêu đề trang web (hiển thị trên tab trình duyệt)", type: "text", tab: "general" },
  { key: "SiteDescription", label: "Mô tả trang web (SEO)", type: "textarea", tab: "general" },
  { key: "LogoUrl", label: "Logo trang web", type: "image", tab: "general" },
  { key: "FaviconUrl", label: "Favicon (icon trên tab trình duyệt)", type: "image", tab: "general" },

  { key: "DefaultShippingFee", label: "Phí giao hàng mặc định (VNĐ)", type: "number", tab: "sales" },
  { key: "FreeShippingThreshold", label: "Mua trên bao nhiêu thì Freeship (VNĐ)", type: "number", tab: "sales" },
  { key: "BankTransferInfo", label: "Ảnh QR chuyển khoản ngân hàng", type: "image", tab: "sales" },

  { key: "Hotline", label: "Số điện thoại Hotline", type: "text", tab: "contact" },
  { key: "SupportEmail", label: "Email hỗ trợ", type: "text", tab: "contact" },
  { key: "StoreAddress", label: "Địa chỉ cửa hàng", type: "textarea", tab: "contact" },
  { key: "WorkingHours", label: "Thời gian làm việc", type: "text", tab: "contact" },
  { key: "FacebookLink", label: "Link Facebook", type: "text", tab: "contact" },
  { key: "YoutubeLink", label: "Link YouTube", type: "text", tab: "contact" },
  { key: "TiktokLink", label: "Link TikTok", type: "text", tab: "contact" },

  { key: "MaintenanceMode", label: "Bật chế độ bảo trì", type: "checkbox", tab: "system" },
  { key: "MaintenanceMessage", label: "Lời nhắn khi bảo trì", type: "textarea", tab: "system" },
  { key: "TopAnnouncement", label: "Thanh thông báo nổi bật (Top bar)", type: "text", tab: "system" },
  { key: "TrackingScripts", label: "Mã Google Analytics / FB Pixel", type: "textarea", tab: "system" },
];

/**
 * @component AdminSettingsPage
 * @description Trang cài đặt hệ thống trong khu vực admin.
 *              Hiển thị các trường cài đặt theo tab và cho phép lưu hàng loạt.
 */
export function AdminSettingsPage() {
  const [items, setItems] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    apiFetch<{ items: any[] }>("/settings")
      .then((r) => {
        const loaded: Record<string, string> = {};
        for (const item of (r.items || [])) {
          loaded[item.key] = item.value;
        }
        setItems(loaded);
      })
      .catch((e: any) => setError(e.message || String(e)));
  }, []);

  /**
   * Lưu tất cả cài đặt hiện tại lên server bằng một lần gọi API (upsert hàng loạt).
   *
   * @async
   * @returns {Promise<void>}
   */
  async function save() {
    setError(null);
    setSaved(null);
    const payload = Object.keys(items).map(key => ({ key, value: items[key] }));
    try {
      await apiFetch<{ items: any[] }>("/admin/settings", { method: "PUT", body: JSON.stringify({ items: payload }) });
      setSaved("Lưu cài đặt thành công!");
      setTimeout(() => setSaved(null), 3000);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  /**
   * Cập nhật giá trị của một cài đặt trong state local.
   *
   * @param {string} key   - Key của cài đặt cần cập nhật.
   * @param {string} value - Giá trị mới.
   */
  function updateValue(key: string, value: string) {
    setItems(old => ({ ...old, [key]: value }));
  }

  /**
   * Upload file ảnh lên Supabase Storage thông qua API backend.
   * Đọc file dưới dạng Base64 rồi gửi lên server để xử lý.
   *
   * @async
   * @param {string} key  - Key cài đặt liên quan (dùng để đặt tên file).
   * @param {File}   file - File ảnh cần upload.
   * @returns {Promise<void>}
   */
  async function handleFileUpload(key: string, file: File) {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await apiFetch<{ url: string }>("/admin/settings/upload-image", {
            method: "POST",
            body: JSON.stringify({ base64, contentType: file.type, key }),
          });
          updateValue(key, res.url);
        } catch (e: any) {
          alert("Lỗi tải ảnh: " + e.message);
        }
      };
    } catch (e: any) {
      alert("Lỗi đọc file: " + e.message);
    }
  }

  /**
   * Render một trường cài đặt dựa trên định nghĩa (type: text, textarea, image, checkbox, number).
   *
   * @param {object} def - Định nghĩa trường cài đặt từ EXPECTED_SETTINGS.
   * @returns {JSX.Element} Element input tương ứng với loại trường.
   */
  const renderField = (def: any) => {
    const val = items[def.key] ?? "";
    if (def.type === "image") {
      return (
        <div className="mb-3" key={def.key}>
          <label className="form-label fw-bold small">{def.label}</label>
          <div className="d-flex align-items-start gap-3">
            {val && (
              <img src={val} alt="Preview" style={{ width: 120, height: 120, objectFit: "contain", border: "1px solid #ccc", borderRadius: 8, background: "#fff" }} />
            )}
            <div className="flex-grow-1">
              <input type="file" className="form-control mb-2" accept="image/*" onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(def.key, e.target.files[0]);
              }} />
              <input type="text" className="form-control form-control-sm" value={val} onChange={e => updateValue(def.key, e.target.value)} placeholder="Hoặc dán URL ảnh trực tiếp vào đây" />
            </div>
          </div>
        </div>
      );
    }
    if (def.type === "textarea") {
      return (
        <div className="mb-3" key={def.key}>
          <label className="form-label fw-bold small">{def.label}</label>
          <textarea className="form-control" rows={3} value={val} onChange={e => updateValue(def.key, e.target.value)} />
        </div>
      );
    }
    if (def.type === "checkbox") {
      return (
        <div className="form-check form-switch mb-3" key={def.key}>
          <input className="form-check-input" type="checkbox" id={def.key} checked={val === "true"} onChange={e => updateValue(def.key, e.target.checked ? "true" : "false")} />
          <label className="form-check-label fw-bold small" htmlFor={def.key}>{def.label}</label>
        </div>
      );
    }
    return (
      <div className="mb-3" key={def.key}>
        <label className="form-label fw-bold small">{def.label}</label>
        <input type={def.type} className="form-control" value={val} onChange={e => updateValue(def.key, e.target.value)} />
      </div>
    );
  };

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white border-bottom p-0">
            <ul className="nav nav-tabs nav-fill border-0" style={{ cursor: "pointer" }}>
              <li className="nav-item">
                <a className={`nav-link border-0 border-bottom rounded-0 fw-bold p-3 ${activeTab === 'general' ? 'active border-primary text-primary' : 'text-muted'}`} onClick={() => setActiveTab('general')}>
                  <i className="fas fa-info-circle me-2"></i>Chung
                </a>
              </li>
              <li className="nav-item">
                <a className={`nav-link border-0 border-bottom rounded-0 fw-bold p-3 ${activeTab === 'sales' ? 'active border-primary text-primary' : 'text-muted'}`} onClick={() => setActiveTab('sales')}>
                  <i className="fas fa-shopping-cart me-2"></i>Bán hàng
                </a>
              </li>
              <li className="nav-item">
                <a className={`nav-link border-0 border-bottom rounded-0 fw-bold p-3 ${activeTab === 'contact' ? 'active border-primary text-primary' : 'text-muted'}`} onClick={() => setActiveTab('contact')}>
                  <i className="fas fa-address-book me-2"></i>Liên hệ
                </a>
              </li>
              <li className="nav-item">
                <a className={`nav-link border-0 border-bottom rounded-0 fw-bold p-3 ${activeTab === 'system' ? 'active border-primary text-primary' : 'text-muted'}`} onClick={() => setActiveTab('system')}>
                  <i className="fas fa-cogs me-2"></i>Hệ thống
                </a>
              </li>
            </ul>
          </div>
          <div className="card-body p-4">
            {error && <div className="alert alert-danger">{error}</div>}
            {saved && <div className="alert alert-success">{saved}</div>}

            <div className="settings-form">
              {EXPECTED_SETTINGS.filter(s => s.tab === activeTab).map(renderField)}
            </div>

            <div className="mt-4 pt-3 border-top">
              <button className="btn btn-primary px-4" onClick={save}>
                <i className="fas fa-save me-2"></i>Lưu cài đặt
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-4">
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-white border-bottom">
            <h5 className="mb-0 fw-bold">
              <i className="fas fa-server me-2 text-info" />
              Trạng thái hệ thống
            </h5>
          </div>
          <div className="card-body">
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Trạng thái web</span>
              <span className={`badge ${items["MaintenanceMode"] === "true" ? "bg-warning" : "bg-success"}`}>
                {items["MaintenanceMode"] === "true" ? "Bảo trì" : "Hoạt động"}
              </span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Phiên bản</span>
              <span className="fw-semibold">v1.1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

