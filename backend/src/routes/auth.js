/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      auth.js
 * Mục đích:      Định tuyến các API xác thực người dùng — đăng ký tài khoản
 *                và tra cứu email từ username/email (dùng cho luồng đăng nhập).
 * Các chức năng chính:
 *   - POST /auth/register            : Đăng ký tài khoản mới với đầy đủ validation
 *   - POST /auth/resolve-identifier  : Tra cứu email từ username hoặc email
 *
 * Tên module:    Authentication
 * Module liên quan: supabase.js, http/errors.js, routes/forgot-password.js
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       Đăng nhập thực tế được xử lý trực tiếp bởi Supabase Auth
 *                ở phía frontend (supabase.auth.signInWithPassword).
 * ============================================================================
 */

import express from "express";
import { z } from "zod";
import { HttpError } from "../http/errors.js";
import { createSupabaseAdmin } from "../supabase.js";

export const authRouter = express.Router();

// Regex kiểm tra định dạng username: 4-30 ký tự, chữ thường/số/dấu chấm/gạch dưới
const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9._]{2,28}[a-z0-9])?$/;
// Regex kiểm tra họ tên: chỉ chữ cái Unicode và dấu cách hợp lệ, 2-100 ký tự
const FULL_NAME_REGEX = /^[\p{L}](?:[\p{L}\s'.-]{0,98}[\p{L}])?$/u;
// Regex kiểm tra số điện thoại di động Việt Nam (đầu số 03x, 05x, 07x, 08x, 09x)
const PHONE_REGEX = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;
// Regex kiểm tra mật khẩu mạnh: 8-64 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/;

/**
 * Chuẩn hóa chuỗi: xóa khoảng trắng đầu/cuối và gộp nhiều khoảng trắng liên tiếp thành một.
 *
 * @param {string} value - Chuỗi cần chuẩn hóa.
 * @returns {string} Chuỗi đã được chuẩn hóa khoảng trắng.
 */
function collapseWhitespace(value) {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Chuẩn hóa số điện thoại về định dạng 0xxxxxxxxx (10 chữ số).
 * Hỗ trợ các định dạng đầu vào: +84xxxxxxxxx, 84xxxxxxxxx, 0xxxxxxxxx.
 *
 * @param {string} value - Số điện thoại cần chuẩn hóa.
 * @returns {string} Số điện thoại đã chuẩn hóa về dạng 0xxxxxxxxx.
 */
function normalizePhoneNumber(value) {
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+84")) return `0${digits.slice(3)}`;
  if (digits.startsWith("84")) return `0${digits.slice(2)}`;
  return digits;
}

/**
 * Chuyển đổi lỗi từ Supabase Auth thành HttpError có thông điệp thân thiện.
 * Dùng để xử lý các lỗi không được bắt trước bởi validation thủ công.
 *
 * @param {object|null} error - Object lỗi từ Supabase Auth.
 * @returns {HttpError} HttpError tương ứng với loại lỗi.
 */
function mapRegisterError(error) {
  const message = String(error?.message || "");

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
 * Đăng ký tài khoản người dùng mới.
 * Quy trình: validate → kiểm tra trùng lặp → tạo auth user → tạo profile.
 * Nếu tạo profile thất bại, tự động rollback bằng cách xóa auth user vừa tạo.
 *
 * @route   POST /auth/register
 * @access  Public
 * @async
 * @param {import("express").Request} req - Request body gồm:
 *   @param {string} req.body.username     - Tên đăng nhập (4-30 ký tự).
 *   @param {string} req.body.full_name    - Họ và tên đầy đủ (2-100 ký tự).
 *   @param {string} req.body.phone_number - Số điện thoại di động Việt Nam.
 *   @param {string} req.body.email        - Địa chỉ email hợp lệ.
 *   @param {string} req.body.password     - Mật khẩu mạnh (8-64 ký tự).
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} HTTP 201 với thông tin user vừa tạo.
 * @throws {HttpError} 400 nếu dữ liệu không hợp lệ.
 * @throws {HttpError} 409 nếu username, email hoặc số điện thoại đã tồn tại.
 * @throws {HttpError} 500 nếu lỗi hệ thống.
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
  });

  const parsed = schema.safeParse(req.body ?? {});

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new HttpError(400, issue.message, "validation_error", { field: String(issue.path[0] || "") });
  }

  const body = parsed.data;
  const sbAdmin = createSupabaseAdmin();

  // Kiểm tra trùng lặp username, số điện thoại và email song song để tiết kiệm thời gian
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

  // Tạo user trong Supabase Auth — email_confirm: true để bỏ qua bước xác thực email
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
    // Rollback: xóa auth user nếu tạo profile thất bại để tránh dữ liệu không nhất quán
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
 * Tra cứu địa chỉ email từ username hoặc email.
 * Dùng trong luồng đăng nhập ở frontend: người dùng nhập username,
 * frontend gọi API này để lấy email rồi mới gọi Supabase signIn.
 *
 * @route   POST /auth/resolve-identifier
 * @access  Public
 * @async
 * @param {import("express").Request} req - Request body gồm `{ identifier: string }`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ email: string }`.
 * @throws {HttpError} 400 nếu thiếu identifier.
 * @throws {HttpError} 404 nếu không tìm thấy tài khoản.
 */
authRouter.post("/auth/resolve-identifier", async (req, res) => {
  const { identifier } = req.body || {};
  if (!identifier) {
    throw new HttpError(400, "Vui long nhap Email hoac Ten dang nhap.");
  }

  const sbAdmin = createSupabaseAdmin();
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
