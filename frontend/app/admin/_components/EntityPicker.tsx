"use client";

/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      EntityPicker.tsx
 * Mục đích:      Component tìm kiếm và chọn entity (người dùng hoặc sách) với
 *                dropdown kết quả realtime — dùng trong các form admin cần
 *                chọn user_id hoặc book_id từ danh sách có sẵn.
 * Các chức năng chính:
 *   - Tìm kiếm debounced (300ms) theo nhiều tiêu chí
 *   - Hiển thị dropdown kết quả với avatar/ảnh bìa sách
 *   - Đóng dropdown khi click ra ngoài
 *   - Hỗ trợ 2 loại entity: "users" và "books"
 *
 * Tên module:    Admin Entity Picker
 * Module liên quan: lib/api.ts, lib/bookImage.ts
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { getBookImageUrl } from "@/lib/bookImage";

/**
 * Loại entity mà picker hỗ trợ tìm kiếm.
 * - "users": tìm kiếm người dùng theo username, email, SĐT
 * - "books": tìm kiếm sách theo ID, tên sách
 */
type EntityType = "users" | "books";

/**
 * Props của EntityPicker.
 * @typedef {object} EntityPickerProps
 * @property {EntityType} entityType  - Loại entity cần tìm kiếm ("users" hoặc "books").
 * @property {string}     value       - Giá trị hiện tại (user_id hoặc book_id).
 * @property {Function}   onChange    - Callback khi giá trị thay đổi (nhận string).
 * @property {Function}   [onSelect]  - Callback khi chọn một item từ dropdown (nhận object entity đầy đủ).
 * @property {string}     [placeholder] - Placeholder cho input tìm kiếm.
 */
interface Props {
  entityType: EntityType;
  value: string;
  onChange: (val: string) => void;
  onSelect?: (entity: any) => void;
  placeholder?: string;
}

export function EntityPicker({ entityType, value, onChange, onSelect, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync display when value is cleared from outside
  useEffect(() => {
    if (!value) setQuery("");
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Thực hiện tìm kiếm entity từ API dựa trên query và searchBy.
   * Giới hạn kết quả tối đa 20 item để tránh dropdown quá dài.
   *
   * @async
   * @param {string} q  - Từ khóa tìm kiếm.
   * @param {string} by - Trường tìm kiếm (all, username, email, book_id, title, ...).
   * @returns {Promise<void>}
   */
  const performSearch = useCallback(async (q: string, by: string) => {
    setLoading(true);
    try {
      const qs = q ? `search=${encodeURIComponent(q)}&searchBy=${by}` : "";
      if (entityType === "users") {
        const res = await apiFetch<any>(`/admin/users?${qs}`);
        setResults((res.items || []).slice(0, 20));
      } else {
        const res = await apiFetch<any>(`/books?${qs}`);
        setResults((res.items || []).slice(0, 20));
      }
    } catch (e) {
      console.error("EntityPicker search error:", e);
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  // Debounced search whenever query or searchBy changes — only when dropdown is open
  useEffect(() => {
    if (!showDropdown) return;
    const timer = setTimeout(() => {
      performSearch(query, searchBy);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchBy, showDropdown, performSearch]);

  // Show dropdown & immediately fetch on focus
  const handleFocus = () => {
    setShowDropdown(true);
    performSearch(query, searchBy);
  };

  const handleSelect = (item: any) => {
    const id = entityType === "users" ? item.user_id : item.book_id;
    setQuery(id);
    onChange(id);
    if (onSelect) onSelect(item);
    setShowDropdown(false);
  };

  const userSearchOptions = [
    { value: "all", label: "Tất cả" },
    { value: "username", label: "Username" },
    { value: "email", label: "Email" },
    { value: "phone_number", label: "SĐT" },
  ];

  const bookSearchOptions = [
    { value: "all", label: "Tất cả" },
    { value: "book_id", label: "ID" },
    { value: "title", label: "Tên sách" },
  ];

  const searchOptions = entityType === "users" ? userSearchOptions : bookSearchOptions;

  return (
    <div className="position-relative" ref={wrapperRef}>
      <div className="input-group">
        <select
          className="form-select flex-shrink-0"
          style={{ maxWidth: "115px" }}
          value={searchBy}
          onChange={e => {
            setSearchBy(e.target.value);
            setShowDropdown(true);
          }}
        >
          {searchOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <input
          type="text"
          className="form-control"
          placeholder={placeholder || `Tìm ${entityType === "users" ? "người dùng" : "sách"}...`}
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={handleFocus}
        />

        {loading && (
          <span className="input-group-text bg-white border-start-0">
            <i className="fas fa-spinner fa-spin text-muted" style={{ fontSize: "0.8rem" }} />
          </span>
        )}
      </div>

      {showDropdown && (
        <div
          className="shadow border-0 bg-white rounded"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxHeight: "300px",
            overflowY: "auto",
            zIndex: 1060,
            border: "1px solid #dee2e6",
          }}
        >
          {loading && results.length === 0 && (
            <div className="text-center py-3 text-muted small">
              <i className="fas fa-spinner fa-spin me-2" />Đang tìm...
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="text-center py-3 text-muted small">Không tìm thấy kết quả</div>
          )}
          {results.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="w-100 d-flex align-items-center gap-2 px-3 py-2 border-0 bg-transparent text-start"
              style={{ borderBottom: "1px solid #f1f3f5", cursor: "pointer" }}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
            >
              {entityType === "users" ? (
                <>
                  <div
                    className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                    style={{ width: 36, height: 36, fontSize: "0.9rem" }}
                  >
                    {(item.full_name || item.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ overflow: "hidden", minWidth: 0 }}>
                    <div className="fw-semibold text-truncate">{item.full_name || "Chưa cập nhật tên"}</div>
                    <div className="text-muted text-truncate" style={{ fontSize: "0.8rem" }}>
                      {item.email}
                      {item.phone_number ? <> · {item.phone_number}</> : null}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ width: 30, height: 44, background: "#f8f9fa", borderRadius: 4, overflow: "hidden", flexShrink: 0, border: "1px solid #dee2e6" }}>
                    {item.image_url && (
                      <img
                        src={getBookImageUrl(item.image_url, item.category_id)}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                  </div>
                  <div style={{ overflow: "hidden", minWidth: 0 }}>
                    <div className="fw-semibold" style={{ fontSize: "0.85rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {item.title}
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                      ID: {item.book_id} ·{" "}
                      <span className="text-danger fw-semibold">
                        {Number(item.is_on_sale ? item.sale_price : item.price).toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
