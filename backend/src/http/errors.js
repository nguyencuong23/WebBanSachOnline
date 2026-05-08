/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      errors.js
 * Mục đích:      Định nghĩa lớp lỗi HTTP tùy chỉnh và hàm tiện ích `assert`
 *                để ném lỗi có cấu trúc nhất quán trong toàn bộ ứng dụng.
 * Các chức năng chính:
 *   - HttpError : Class lỗi mang theo HTTP status code, error code và details
 *   - assert    : Hàm kiểm tra điều kiện, ném HttpError nếu điều kiện sai
 *
 * Tên module:    HTTP Error Handling
 * Module liên quan: http/middleware.js (xử lý HttpError trong errorHandler)
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

/**
 * @class HttpError
 * @description Lớp lỗi tùy chỉnh mang theo thông tin HTTP để middleware
 *              errorHandler có thể trả về response lỗi có cấu trúc nhất quán.
 *              Kế thừa từ Error để tương thích với cơ chế try/catch và
 *              express-async-errors.
 */
export class HttpError extends Error {
  /**
   * @param {number} status   - HTTP status code (ví dụ: 400, 401, 403, 404, 500).
   * @param {string} message  - Thông điệp lỗi hiển thị cho client.
   * @param {string} [code="error"] - Mã lỗi dạng snake_case để client xử lý theo loại lỗi.
   * @param {*} [details]     - Thông tin bổ sung tùy ý (object, string, v.v.).
   */
  constructor(status, message, code = "error", details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Kiểm tra một điều kiện và ném HttpError nếu điều kiện là falsy.
 * Dùng như một guard clause ngắn gọn thay cho if/throw dài dòng.
 *
 * @param {*} condition  - Điều kiện cần kiểm tra. Ném lỗi nếu falsy.
 * @param {number} status   - HTTP status code của lỗi.
 * @param {string} message  - Thông điệp lỗi.
 * @param {string} code     - Mã lỗi dạng snake_case.
 * @param {*} [details]     - Thông tin bổ sung (thường là error message từ DB).
 * @throws {HttpError} Ném HttpError nếu `condition` là falsy.
 *
 * @example
 * assert(user, 404, "User not found", "not_found");
 * assert(!error, 400, "DB error", "db_failed", error?.message);
 */
export function assert(condition, status, message, code, details) {
  if (!condition) throw new HttpError(status, message, code, details);
}
