/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      env.js
 * Mục đích:      Tải và xác thực các biến môi trường cần thiết cho ứng dụng.
 *                Export object `env` tập trung để các module khác sử dụng
 *                thay vì truy cập trực tiếp vào process.env.
 * Các chức năng chính:
 *   - Tải file .env từ thư mục gốc project hoặc thư mục backend
 *   - Kiểm tra sự tồn tại của các biến bắt buộc, ném lỗi nếu thiếu
 *   - Export object `env` chứa tất cả cấu hình đã được parse
 *
 * Tên module:    Configuration
 * Module liên quan: supabase.js, routes/forgot-password.js, routes/chat.js
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Thử load .env từ thư mục backend trước, nếu không có thì load từ root project
dotenv.config({ path: resolve(__dirname, "../../.env") });
dotenv.config(); // fallback: load .env trong thư mục hiện tại (backend/)

/**
 * Lấy giá trị của một biến môi trường bắt buộc.
 * Ném lỗi ngay khi khởi động nếu biến chưa được cấu hình,
 * giúp phát hiện lỗi cấu hình sớm thay vì lúc runtime.
 *
 * @param {string} name - Tên biến môi trường cần lấy.
 * @returns {string} Giá trị của biến môi trường.
 * @throws {Error} Ném lỗi nếu biến môi trường không tồn tại hoặc rỗng.
 */
function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

/**
 * Object tập trung chứa toàn bộ cấu hình môi trường của ứng dụng.
 * Các module khác nên import từ đây thay vì dùng process.env trực tiếp.
 *
 * @type {{
 *   port: number,
 *   nodeEnv: string,
 *   supabaseUrl: string,
 *   supabaseAnonKey: string,
 *   supabaseServiceRoleKey: string,
 *   webOrigins: string[],
 *   gmailUser: string,
 *   gmailAppPassword: string,
 *   groqApiKey: string
 * }}
 */
export const env = {
  // Cổng HTTP server lắng nghe, mặc định 4000 nếu không cấu hình
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  // Các biến Supabase bắt buộc — ném lỗi ngay nếu thiếu
  supabaseUrl: required("SUPABASE_URL"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  // Danh sách origin được phép CORS, tách bởi dấu phẩy trong WEB_ORIGINS
  webOrigins: (process.env.WEB_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // Thông tin Gmail để gửi email OTP quên mật khẩu (tùy chọn)
  gmailUser: process.env.GMAIL_USER || "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "",
  // API key của Groq để chạy tính năng chat AI (tùy chọn)
  groqApiKey: process.env.GROQ_API_KEY || "",
};
