/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      MaintenancePage.tsx
 * Mục đích:      Trang thông báo bảo trì hệ thống — hiển thị khi admin bật
 *                chế độ MaintenanceMode trong cài đặt. Tự động fetch thông điệp
 *                bảo trì và tên site từ API để hiển thị động.
 * Các chức năng chính:
 *   - Hiển thị thông điệp bảo trì từ cài đặt hệ thống
 *   - Giao diện glassmorphism với animation pulse
 *
 * Tên module:    Maintenance
 * Module liên quan: app/(site)/_components/GlobalAuthLockGuard.tsx (điều hướng đến đây)
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL as string;

export function MaintenancePage() {
  const [message, setMessage] = useState<string>("");
  const [siteTitle, setSiteTitle] = useState<string>("Cửa hàng sách");

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((r) => r.json())
      .then((data) => {
        const items: { key: string; value: string }[] = data.items || [];
        const get = (key: string) => items.find((i) => i.key === key)?.value ?? "";
        setMessage(get("MaintenanceMessage"));
        setSiteTitle(get("SiteTitle") || "Cửa hàng sách");
      })
      .catch(() => {});
  }, []);

  return (
    <div className="maintenance-shell">
      <div className="maintenance-card">
        {/* Icon */}
        <div className="maintenance-icon">
          <i className="fas fa-tools" />
        </div>

        {/* Title */}
        <h1 className="maintenance-title">{siteTitle}</h1>
        <h2 className="maintenance-subtitle">Đang bảo trì hệ thống</h2>

        {/* Message */}
        <p className="maintenance-message">
          {message ||
            "Chúng tôi đang nâng cấp hệ thống để mang lại trải nghiệm tốt hơn cho bạn. Vui lòng quay lại sau."}
        </p>

        {/* Divider */}
        <div className="maintenance-divider" />
      </div>

      <style>{`
        .maintenance-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .maintenance-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 3rem 2.5rem;
          max-width: 520px;
          width: 100%;
          text-align: center;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
          animation: fadeInUp 0.5s ease;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .maintenance-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          font-size: 32px;
          color: white;
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
          animation: pulse 2.5s infinite ease-in-out;
        }

        @keyframes pulse {
          0%, 100% { box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4); }
          50%       { box-shadow: 0 8px 36px rgba(102, 126, 234, 0.7); }
        }

        .maintenance-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.55);
          margin: 0 0 0.4rem;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .maintenance-subtitle {
          font-size: 1.75rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 1.25rem;
        }

        .maintenance-message {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.7;
          margin: 0;
          white-space: pre-wrap;
        }

        .maintenance-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 2rem 0 0;
        }
      `}</style>
    </div>
  );
}
