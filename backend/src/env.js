/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: env.js
 * Mục đích của file: Quản lý và cung cấp các biến môi trường cho toàn bộ ứng dụng.
 * Các chức năng chính: Load file .env, parse biến môi trường và cung cấp object config an toàn.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Environment Variables
 * Mục đích của module: Khởi tạo các cấu hình tĩnh (static configuration) từ hệ điều hành hoặc file .env.
 * Phạm vi xử lý: Nạp dữ liệu lúc khởi động, throw lỗi nếu thiếu cấu hình bắt buộc.
 * Các thành phần chính trong module: env object, required function.
 * Module liên quan: Tất cả các file gọi cấu hình (index.js, supabase.js, ...).
 * ============================================================================
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Thử load .env từ thư mục backend trước, nếu không có thì load từ root project
dotenv.config({ path: resolve(__dirname, "../../.env") });
dotenv.config(); // fallback: load .env trong thư mục hiện tại (backend/)

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  supabaseUrl: required("SUPABASE_URL"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  webOrigins: (process.env.WEB_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  gmailUser: process.env.GMAIL_USER || "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
};

