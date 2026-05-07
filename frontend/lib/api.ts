/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: api.ts
 * Mục đích của file: Cung cấp hàm fetch chung (wrapper) để gọi API backend.
 * Các chức năng chính: Gọi HTTP request, tự động đính kèm Supabase Access Token, xử lý lỗi API.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: API Utils
 * Mục đích của module: Quản lý giao tiếp với Backend API.
 * Phạm vi xử lý: Client-side.
 * Các thành phần chính trong module: apiFetch, ApiError.
 * Module liên quan: supabase.ts.
 * ============================================================================
 */
import { supabase } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL as string;

/**
 * Tên class/interface: ApiError
 * Mục đích của class/interface: Lớp lỗi tùy chỉnh chứa thông tin chi tiết từ Backend trả về (status, code, details).
 */
export class ApiError extends Error {
  code?: string;
  details?: unknown;
  status: number;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Tên function: getAccessToken
 * Mục đích của function: Lấy access_token hiện tại từ Supabase session.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: Chuỗi token hoặc null.
 */
async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Tên function: apiFetch
 * Mục đích của function: Wrapper cho hàm fetch mặc định, tự động cấu hình header Authorization và xử lý ApiError.
 * Tham số đầu vào: path (API route), init (RequestInit config).
 * Giá trị trả về: Promise kiểu T chứa dữ liệu JSON từ API.
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
