/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: auth.js
 * Mục đích của file: Định nghĩa API phục vụ xác thực người dùng.
 * Các chức năng chính: Đăng ký tài khoản (register) và tìm kiếm identifier (resolve-identifier).
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Auth API Route
 * Mục đích của module: Quản lý các route liên quan đến xác thực chưa yêu cầu đăng nhập.
 * Phạm vi xử lý: Nhận request, tạo user trên Supabase Auth và lưu thông tin profile.
 * Các thành phần chính trong module: Express Router, Zod validation, Supabase Admin client.
 * Module liên quan: verify.js (Middleware), supabase.js (DB client).
 * ============================================================================
 */
import express from "express";
import { z } from "zod";
import { HttpError } from "../http/errors.js";
import { createSupabaseAdmin } from "../supabase.js";

export const authRouter = express.Router(); // Ý nghĩa: Đối tượng quản lý các route API xác thực; Giá trị: Express Router instance

const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9._]{2,28}[a-z0-9])?$/; // Ý nghĩa: Regex kiểm tra tên đăng nhập; Giá trị: chuỗi regex
const FULL_NAME_REGEX = /^[\p{L}](?:[\p{L}\s'.-]{0,98}[\p{L}])?$/u; // Ý nghĩa: Regex kiểm tra họ tên; Giá trị: chuỗi regex unicode
const PHONE_REGEX = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/; // Ý nghĩa: Regex kiểm tra số điện thoại VN; Giá trị: chuỗi regex
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/; // Ý nghĩa: Regex kiểm tra mật khẩu mạnh; Giá trị: chuỗi regex

/**
 * Tên function: collapseWhitespace
 * Mục đích của function: Xóa khoảng trắng thừa ở đầu/cuối và rút gọn nhiều khoảng trắng liên tiếp thành một.
 * Tham số đầu vào: value (string).
 * Giá trị trả về: Chuỗi đã được chuẩn hóa.
 * Điều kiện xử lý: Input phải là chuỗi hợp lệ.
 * Lỗi có thể phát sinh: Không có (với chuỗi hợp lệ).
 */
function collapseWhitespace(value) {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Tên function: normalizePhoneNumber
 * Mục đích của function: Chuẩn hóa số điện thoại về định dạng bắt đầu bằng số 0 (bỏ mã quốc gia +84 hoặc 84).
 * Tham số đầu vào: value (string).
 * Giá trị trả về: Chuỗi số điện thoại chuẩn.
 * Điều kiện xử lý: Chỉ giữ lại các chữ số và dấu +.
 * Lỗi có thể phát sinh: Không có.
 */
function normalizePhoneNumber(value) {
  const digits = value.replace(/[^\d+]/g, ""); // Ý nghĩa: Loại bỏ ký tự không phải số hoặc dấu +; Giá trị: chuỗi số
  if (digits.startsWith("+84")) return `0${digits.slice(3)}`;
  if (digits.startsWith("84")) return `0${digits.slice(2)}`;
  return digits;
}

/**
 * Tên function: mapRegisterError
 * Mục đích của function: Chuyển đổi lỗi từ Supabase Auth thành HttpError với thông báo thân thiện cho frontend.
 * Tham số đầu vào: error (Object - lỗi trả về từ Supabase).
 * Giá trị trả về: HttpError instance.
 * Điều kiện xử lý: Dựa trên message của lỗi để phân loại.
 * Lỗi có thể phát sinh: Luôn trả về HttpError.
 */
function mapRegisterError(error) {
  const message = String(error?.message || ""); // Ý nghĩa: Chuỗi thông báo lỗi gốc; Giá trị: string

  if (/already been registered|already exists|duplicate/i.test(message)) {
    return new HttpError(409, "Email da ton tai.", "duplicate_email", { field: "email" });
  }

  if (/password/i.test(message)) {
    return new HttpError(
      400,
      "Mat khau phai co it nhat 8 ky tu, gom chu hoa, chu thuong, so va ky tu dac biet.",
      "invalid_password",
      { field: "password" }
    );
  }

  return new HttpError(400, "Khong the tao tai khoan luc nay.", "register_failed", message);
}

/**
 * Tên function: POST /auth/register
 * Mục đích của function: Xử lý đăng ký tài khoản mới cho người dùng.
 * Tham số đầu vào: req (body chứa username, full_name, phone_number, email, password), res.
 * Giá trị trả về: JSON object báo thành công và thông tin user.
 * Điều kiện xử lý: Validate dữ liệu đầu vào. Kiểm tra trùng lặp email/username/phone.
 * Lỗi có thể phát sinh:
 *  - 400: Dữ liệu không hợp lệ hoặc lỗi từ Supabase Auth.
 *  - 409: Trùng thông tin (email/phone/username).
 *  - 500: Lỗi hệ thống khi tương tác với DB.
 */
authRouter.post("/auth/register", async (req, res) => {
  const schema = z.object({
    username: z
      .string()
      .transform((value) => value.trim().toLowerCase())
      .refine((value) => USERNAME_REGEX.test(value), {
        message: "Ten dang nhap phai dai 4-30 ky tu, chi gom chu thuong, so, dau cham va dau gach duoi."
      }),
    full_name: z
      .string()
      .transform(collapseWhitespace)
      .refine((value) => value.length >= 2 && value.length <= 100 && FULL_NAME_REGEX.test(value), {
        message: "Ho ten chi duoc chua chu cai va cac dau cach hop le, do dai 2-100 ky tu."
      }),
    phone_number: z
      .string()
      .transform(normalizePhoneNumber)
      .refine((value) => PHONE_REGEX.test(value), {
        message: "So dien thoai phai la so di dong Viet Nam hop le."
      }),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Email khong dung dinh dang.")
      .max(100, "Email khong duoc vuot qua 100 ky tu."),
    password: z.string().refine((value) => PASSWORD_REGEX.test(value), {
      message: "Mat khau phai co it nhat 8 ky tu, gom chu hoa, chu thuong, so va ky tu dac biet."
    })
  }); // Ý nghĩa: Schema kiểm tra dữ liệu đăng ký; Giá trị: Zod object

  const parsed = schema.safeParse(req.body ?? {}); // Ý nghĩa: Kết quả phân tích body request; Giá trị: object parse result

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new HttpError(400, issue.message, "validation_error", { field: String(issue.path[0] || "") });
  }

  const body = parsed.data;
  const sbAdmin = createSupabaseAdmin();

  const [usernameCheck, phoneCheck, emailCheck] = await Promise.all([
    sbAdmin.from("profiles").select("user_id").eq("username", body.username).maybeSingle(),
    sbAdmin.from("profiles").select("user_id").eq("phone_number", body.phone_number).maybeSingle(),
    sbAdmin.from("profiles").select("user_id").eq("email", body.email).maybeSingle()
  ]);

  if (usernameCheck.error) {
    throw new HttpError(500, "Khong the kiem tra ten dang nhap.", "username_check_failed", usernameCheck.error.message);
  }

  if (phoneCheck.error) {
    throw new HttpError(500, "Khong the kiem tra so dien thoai.", "phone_check_failed", phoneCheck.error.message);
  }

  if (emailCheck.error) {
    throw new HttpError(500, "Khong the kiem tra email.", "email_check_failed", emailCheck.error.message);
  }

  if (usernameCheck.data) {
    throw new HttpError(409, "Ten dang nhap da ton tai.", "duplicate_username", { field: "username" });
  }

  if (phoneCheck.data) {
    throw new HttpError(409, "So dien thoai da duoc su dung.", "duplicate_phone_number", {
      field: "phone_number"
    });
  }

  if (emailCheck.data) {
    throw new HttpError(409, "Email da ton tai.", "duplicate_email", { field: "email" });
  }

  const { data: created, error: createError } = await sbAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      username: body.username,
      full_name: body.full_name,
      phone_number: body.phone_number,
      role: "user"
    }
  });

  if (createError || !created.user) {
    throw mapRegisterError(createError);
  }

  const profilePayload = {
    user_id: created.user.id,
    username: body.username,
    full_name: body.full_name,
    email: body.email,
    phone_number: body.phone_number,
    role: "user",
    is_active: true
  };

  const { error: profileError } = await sbAdmin.from("profiles").insert(profilePayload);

  if (profileError) {
    await sbAdmin.auth.admin.deleteUser(created.user.id).catch(() => undefined);

    if (/username/i.test(profileError.message)) {
      throw new HttpError(409, "Ten dang nhap da ton tai.", "duplicate_username", { field: "username" });
    }

    if (/phone/i.test(profileError.message)) {
      throw new HttpError(409, "So dien thoai da duoc su dung.", "duplicate_phone_number", {
        field: "phone_number"
      });
    }

    if (/email/i.test(profileError.message)) {
      throw new HttpError(409, "Email da ton tai.", "duplicate_email", { field: "email" });
    }

    throw new HttpError(500, "Khong the luu thong tin nguoi dung.", "profile_create_failed", profileError.message);
  }

  res.status(201).json({
    message: "Dang ky thanh cong.",
    user: {
      id: created.user.id,
      email: body.email,
      username: body.username,
      full_name: body.full_name,
      phone_number: body.phone_number
    }
  });
});

/**
 * Tên function: POST /auth/resolve-identifier
 * Mục đích của function: Tìm kiếm email của tài khoản dựa trên identifier (có thể là email hoặc username).
 * Tham số đầu vào: req (body chứa `identifier`), res.
 * Giá trị trả về: JSON `{ email: "..." }`.
 * Điều kiện xử lý: Tìm trong bảng profiles.
 * Lỗi có thể phát sinh: 
 *  - 400: Thiếu tham số.
 *  - 404: Không tìm thấy tài khoản.
 */
authRouter.post("/auth/resolve-identifier", async (req, res) => {
  const { identifier } = req.body || {}; // Ý nghĩa: Thông tin định danh nhập vào; Giá trị: chuỗi email hoặc username
  if (!identifier) {
    throw new HttpError(400, "Vui long nhap Email hoac Ten dang nhap.");
  }

  const sbAdmin = createSupabaseAdmin(); // Ý nghĩa: Khởi tạo admin client; Lý do: Bypass RLS để tra cứu email
  const { data, error } = await sbAdmin
    .from("profiles")
    .select("email")
    .or(`email.eq.${identifier},username.eq.${identifier}`)
    .maybeSingle();

  if (error || !data) {
    throw new HttpError(404, "Tai khoan khong ton tai.");
  }

  res.json({ email: data.email });
});
