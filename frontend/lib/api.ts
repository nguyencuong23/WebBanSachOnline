/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      api.ts
 * Mục đích:      Cung cấp hàm tiện ích `apiFetch` để gọi backend API với
 *                xác thực JWT tự động, và class `ApiError` để xử lý lỗi
 *                có cấu trúc nhất quán trên toàn bộ frontend.
 * Các chức năng chính:
 *   - ApiError  : Class lỗi mang theo HTTP status, error code và details
 *   - apiFetch  : Wrapper của fetch — tự động đính kèm JWT, parse JSON,
 *                 ném ApiError nếu response không thành công
 *
 * Tên module:    API Client
 * Module liên quan: lib/supabase.ts (lấy JWT), tất cả component gọi API
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       API_BASE được đọc từ biến môi trường NEXT_PUBLIC_API_BASE_URL.
 *                Tất cả request đều gửi kèm Content-Type: application/json.
 * ============================================================================
 */

import { supabase } from "./supabase";

// URL gốc của backend API, ví dụ: http://localhost:4000
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL as string;

/**
 * @class ApiError
 * @description Class lỗi tùy chỉnh cho các lỗi HTTP từ backend API.
 *              Mang theo status code, error code và details để component
 *              có thể xử lý từng loại lỗi một cách cụ thể.
 */
export class ApiError extends Error {
  code?: string;
  details?: unknown;
  status: number;

  /**
   * @param {string}  message - Thông điệp lỗi hiển thị cho người dùng.
   * @param {number}  status  - HTTP status code (ví dụ: 400, 401, 404, 500).
   * @param {string}  [code]  - Mã lỗi dạng snake_case từ backend (ví dụ: "not_found").
   * @param {unknown} [details] - Thông tin bổ sung từ backend (thường là validation errors).
   */
  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Lấy JWT access token của phiên đăng nhập hiện tại từ Supabase Auth.
 * Trả về null nếu người dùng chưa đăng nhập.
 *
 * @async
 * @returns {Promise<string | null>} JWT access token hoặc null.
 */
async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Gọi backend API với xác thực JWT tự động.
 * Tự động đính kèm Bearer token nếu người dùng đã đăng nhập,
 * parse JSON response và ném ApiError nếu response không thành công.
 *
 * @async
 * @template T - Kiểu dữ liệu của response body mong đợi.
 * @param {string}       path - Đường dẫn API (ví dụ: "/books", "/cart"). Sẽ được nối với API_BASE.
 * @param {RequestInit}  [init] - Tùy chọn fetch (method, body, headers, v.v.).
 * @returns {Promise<T>} Promise resolve với dữ liệu đã parse từ JSON response.
 * @throws {ApiError} Ném ApiError nếu HTTP status không thành công (4xx, 5xx).
 *
 * @example
 * const data = await apiFetch<{ items: Book[] }>("/books?limit=10");
 * await apiFetch("/cart", { method: "POST", body: JSON.stringify({ book_id: "VH-001", quantity: 1 }) });
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, json?.error?.code, json?.error?.details);
  }
  return json as T;
}
