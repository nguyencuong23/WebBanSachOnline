/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: NotificationBell.tsx
 * Mục đích của file: Component Chuông thông báo trên Header.
 * Các chức năng chính: Hiển thị số lượng thông báo chưa đọc, danh sách thông báo dạng Dropdown, Popup xem chi tiết.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Notification UI
 * Mục đích của module: Thông báo các sự kiện (đơn hàng, khuyến mãi) cho người dùng.
 * Phạm vi xử lý: Client Component, gọi API `/notifications`.
 * Các thành phần chính trong module: NotificationBell.
 * Module liên quan: useSessionProfile.ts, api.ts.
 * ============================================================================
 */
"use client";

import { useEffect, useState, useRef } from "react";
import { useSessionProfile } from "../_hooks/useSessionProfile";
import { apiFetch } from "@/lib/api";

/**
 * Tên class/interface: Notification
 * Mục đích của class/interface: Cấu trúc dữ liệu của một thông báo.
 * Vai trò trong hệ thống: Interface Type.
 */
interface Notification {
  id: number;
  title: string;
  message: string;
  link: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Tên function: NotificationBell
 * Mục đích của function: Render chuông thông báo và logic dropdown.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: JSX Element hoặc null (nếu chưa đăng nhập).
 */
export function NotificationBell() {
  const { profile } = useSessionProfile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeNotif, setActiveNotif] = useState<Notification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!profile) return;
    fetchNotifications();
  }, [profile]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Tên function: fetchNotifications
   * Mục đích của function: Gọi API lấy danh sách thông báo của User.
   */
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{ items: Notification[] }>("/notifications");
      setNotifications(data.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Tên function: markAsRead
   * Mục đích của function: Đánh dấu một thông báo cụ thể là đã đọc.
   * Tham số đầu vào: id (Mã thông báo)
   */
  const markAsRead = async (id: number) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * Tên function: markAllAsRead
   * Mục đích của function: Đánh dấu tất cả thông báo là đã đọc.
   */
  const markAllAsRead = async () => {
    try {
      await apiFetch("/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * Tên function: handleItemClick
   * Mục đích của function: Xử lý khi user click vào một dòng thông báo. Mở popup chi tiết và đánh dấu đã đọc.
   * Tham số đầu vào: n (Notification)
   */
  const handleItemClick = (n: Notification) => {
    setActiveNotif(n);
    setShowDropdown(false);
    if (!n.is_read) markAsRead(n.id);
  };

  /**
   * Tên function: closeModal
   * Mục đích của function: Đóng popup thông báo chi tiết.
   */
  const closeModal = () => setActiveNotif(null);

  if (!profile) return null;

  return (
    <>
      <div className="position-relative" ref={dropdownRef}>
        {/* ===== BELL ICON ===== */}
        <div
          className="py-2 px-2 position-relative"
          style={{ cursor: "pointer", color: "white" }}
          onClick={() => {
            setShowDropdown(!showDropdown);
            if (!showDropdown && notifications.length === 0) fetchNotifications();
          }}
        >
          <i className="fas fa-bell fs-5"></i>
          {unreadCount > 0 && (
            <span
              className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
              style={{ fontSize: "0.6rem" }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>

        {/* ===== DROPDOWN DANH SÁCH ===== */}
        {showDropdown && (
          <div
            className="position-absolute end-0 pt-2"
            style={{ top: "100%", width: "320px", zIndex: 1050 }}
          >
            <div className="bg-white shadow-lg rounded border overflow-hidden">
              {/* Header */}
              <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-light">
                <h6 className="mb-0 fw-bold text-dark">Thông báo</h6>
                {unreadCount > 0 && (
                  <button
                    className="btn btn-sm btn-link text-decoration-none p-0 text-primary"
                    style={{ fontSize: "0.8rem" }}
                    onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                  >
                    Đọc tất cả
                  </button>
                )}
              </div>

              {/* List */}
              <div style={{ maxHeight: "380px", overflowY: "auto" }}>
                {loading && notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted">
                    <i className="fas fa-spinner fa-spin me-2" />Đang tải...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted">
                    <i className="fas fa-bell-slash mb-2 d-block fs-4 opacity-50" />
                    Không có thông báo nào.
                  </div>
                ) : (
                  <ul className="list-group list-group-flush mb-0">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`list-group-item list-group-item-action px-3 py-2 ${!n.is_read ? "unread-notif" : ""}`}
                        style={{ 
                          cursor: "pointer", 
                          borderLeft: !n.is_read ? "3px solid #3b82f6" : "3px solid transparent",
                          backgroundColor: !n.is_read ? "#f0f7ff" : "transparent"
                        }}
                        onClick={() => handleItemClick(n)}
                      >
                        <div className="d-flex align-items-start gap-2">
                          {/* Dot chưa đọc */}
                          <div className="pt-1 flex-shrink-0">
                            {!n.is_read
                              ? <span className="badge rounded-pill bg-primary p-1" style={{ width: 8, height: 8, display: "inline-block" }}></span>
                              : <span style={{ width: 8, height: 8, display: "inline-block" }}></span>
                            }
                          </div>
                          <div className="flex-grow-1 overflow-hidden">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className={`fw-semibold text-truncate me-2 ${!n.is_read ? "text-primary-emphasis" : "text-dark"}`} style={{ fontSize: "0.875rem", maxWidth: 180 }}>
                                {n.title}
                              </span>
                              <small className="text-muted flex-shrink-0" style={{ fontSize: "0.72rem" }}>
                                {new Date(n.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                              </small>
                            </div>
                            <p className="mb-0 text-muted text-truncate" style={{ fontSize: "0.8rem" }}>
                              {n.message}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== MODAL CHI TIẾT ===== */}
      {activeNotif && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1060 }}
            onClick={closeModal}
          />
          <div
            className="modal fade show d-block"
            style={{ zIndex: 1070 }}
            onClick={closeModal}
          >
            <div
              className="modal-dialog modal-dialog-centered"
              style={{ maxWidth: 480 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                {/* Header */}
                <div className="modal-header border-0 pb-0 px-4 pt-4">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className={`badge ${
                        activeNotif.type === "order" ? "bg-warning text-dark" :
                        activeNotif.type === "promotion" ? "bg-success" :
                        "bg-primary"
                      }`} style={{ fontSize: "0.7rem" }}>
                        {activeNotif.type === "order" ? "Đơn hàng" :
                         activeNotif.type === "promotion" ? "Khuyến mãi" :
                         activeNotif.type === "system" ? "Hệ thống" : activeNotif.type}
                      </span>
                      <small className="text-muted" style={{ fontSize: "0.78rem" }}>
                        {new Date(activeNotif.created_at).toLocaleString("vi-VN")}
                      </small>
                    </div>
                    <h5 className="modal-title fw-bold text-dark mb-0">{activeNotif.title}</h5>
                  </div>
                  <button
                    className="btn-close ms-3"
                    onClick={closeModal}
                  />
                </div>

                {/* Body */}
                <div className="modal-body px-4 pb-4 pt-3">
                  {/* Ảnh đính kèm (Chỉ hiển thị nếu link là định dạng ảnh) */}
                  {activeNotif.link && (activeNotif.link.match(/\.(jpeg|jpg|gif|png|webp)$/i) || activeNotif.link.includes("supabase.co/storage")) ? (
                    <div className="mb-3 rounded-3 overflow-hidden border">
                      <img
                        src={activeNotif.link}
                        alt="Notification"
                        style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }}
                      />
                    </div>
                  ) : null}
                  
                  {/* Link chuyển hướng (Nếu không phải ảnh) */}
                  {activeNotif.link && !(activeNotif.link.match(/\.(jpeg|jpg|gif|png|webp)$/i) || activeNotif.link.includes("supabase.co/storage")) && (
                    <div className="mb-3">
                      <a
                        href={activeNotif.link}
                        className="notif-action-link"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#2563eb",
                          color: "#fff",
                          borderRadius: 50,
                          padding: "6px 16px",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          textDecoration: "none",
                          border: "none",
                          outline: "none",
                          position: "static",
                        }}
                        onClick={closeModal}
                      >
                        <i className="fas fa-external-link-alt" />
                        Xem chi tiết liên quan
                      </a>
                    </div>
                  )}

                  {/* Nội dung */}
                  <p className="text-secondary mb-0" style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
                    {activeNotif.message}
                  </p>
                </div>

                {/* Footer */}
                <div className="modal-footer border-0 pt-0 px-4 pb-4">
                  <button className="btn btn-primary w-100 rounded-3" onClick={closeModal}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
