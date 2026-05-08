/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      me.js
 * Mục đích:      Định tuyến các API quản lý thông tin cá nhân của người dùng
 *                đang đăng nhập — xem, cập nhật hồ sơ, avatar và mật khẩu.
 * Các chức năng chính:
 *   - GET    /me                  : Lấy thông tin user và profile hiện tại
 *   - PATCH  /me                  : Cập nhật họ tên, email, SĐT, địa chỉ mặc định
 *   - POST   /me/avatar           : Upload ảnh đại diện (Base64)
 *   - DELETE /me/avatar           : Xóa ảnh đại diện
 *   - POST   /me/change-password  : Đổi mật khẩu (yêu cầu mật khẩu hiện tại)
 *
 * Tên module:    User Profile
 * Module liên quan: supabase.js, auth/verify.js, http/errors.js
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       Tất cả các route đều yêu cầu xác thực (requireUser).
 *                Khi cập nhật email, đồng bộ cả Supabase Auth lẫn bảng profiles.
 * ============================================================================
 */

import express from "express";
import { z } from "zod";
import { requireUser } from "../auth/verify.js";
import { createSupabaseUser, createSupabaseAdmin } from "../supabase.js";
import { assert, HttpError } from "../http/errors.js";

export const meRouter = express.Router();

// Regex kiểm tra họ tên: chỉ chữ cái Unicode và dấu cách hợp lệ, 2-100 ký tự
const FULL_NAME_REGEX = /^[\p{L}](?:[\p{L}\s'.-]{0,98}[\p{L}])?$/u;
// Regex kiểm tra số điện thoại di động Việt Nam
const PHONE_REGEX = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;

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
 * Chuẩn hóa số điện thoại về định dạng 0xxxxxxxxx.
 *
 * @param {string} value - Số điện thoại cần chuẩn hóa.
 * @returns {string} Số điện thoại đã chuẩn hóa.
 */
function normalizePhoneNumber(value) {
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+84")) return `0${digits.slice(3)}`;
  if (digits.startsWith("84")) return `0${digits.slice(2)}`;
  return digits;
}

/**
 * Lấy thông tin user và profile của người dùng đang đăng nhập.
 *
 * @route   GET /me
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Request object, chứa `req.auth.user` và `req.profile`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ user: AuthUser, profile: Profile }`.
 */
meRouter.get("/me", requireUser, async (req, res) => {
  res.json({
    user: req.auth.user,
    profile: req.profile
  });
});

/**
 * Cập nhật thông tin hồ sơ cá nhân của người dùng.
 * Nếu email thay đổi, đồng bộ cả Supabase Auth (auth.users) lẫn bảng profiles.
 * Chỉ cập nhật các trường được gửi lên (partial update).
 *
 * @route   PATCH /me
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Request body (tất cả tùy chọn):
 *   @param {string} [req.body.full_name]       - Họ và tên mới.
 *   @param {string} [req.body.email]           - Email mới.
 *   @param {string} [req.body.phone_number]    - Số điện thoại mới.
 *   @param {string} [req.body.default_address] - Địa chỉ giao hàng mặc định.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ profile: Profile }` với dữ liệu đã cập nhật.
 * @throws {HttpError} 400 nếu validation thất bại hoặc lỗi DB.
 * @throws {HttpError} 403 nếu RLS ngăn cập nhật.
 * @throws {HttpError} 404 nếu không tìm thấy profile.
 */
meRouter.patch("/me", requireUser, async (req, res) => {
  const schema = z.object({
    full_name: z
      .string()
      .transform(collapseWhitespace)
      .refine((value) => value.length >= 2 && value.length <= 100 && FULL_NAME_REGEX.test(value), {
        message: "Ho ten chi duoc chua chu cai va cac dau cach hop le, do dai 2-100 ky tu."
      })
      .optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Email khong dung dinh dang.")
      .max(100, "Email khong duoc vuot qua 100 ky tu.")
      .optional(),
    phone_number: z
      .string()
      .transform(normalizePhoneNumber)
      .refine((value) => PHONE_REGEX.test(value), {
        message: "So dien thoai phai la so di dong Viet Nam hop le."
      })
      .optional(),
    default_address: z.string().trim().max(500).optional()
  });

  const body = schema.parse(req.body ?? {});
  const sbUser = createSupabaseUser(req.auth.jwt);

  // Nếu email thay đổi, cập nhật trong Supabase Auth trước để đảm bảo nhất quán
  if (body.email && body.email !== req.profile?.email) {
    const sbAdmin = createSupabaseAdmin();
    const { error: authError } = await sbAdmin.auth.admin.updateUserById(req.auth.user.id, {
      email: body.email,
      email_confirm: true // Xác nhận email ngay, không cần verify
    });

    if (authError) {
      throw new HttpError(400, `Lỗi cập nhật email tài khoản: ${authError.message}`, "auth_update_failed");
    }
  }

  // Chỉ đưa vào object update các trường thực sự được gửi lên (tránh ghi đè null)
  const { data, error } = await sbUser
    .from("profiles")
    .update({
      ...(body.full_name !== undefined ? { full_name: body.full_name } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.phone_number !== undefined ? { phone_number: body.phone_number } : {}),
      ...(body.default_address !== undefined ? { default_address: body.default_address } : {})
    })
    .eq("user_id", req.auth.user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new HttpError(400, `Lỗi database (${error.code}): ${error.message}`, "profile_update_failed", error);
  }

  if (!data) {
    // Phân biệt lỗi "không tìm thấy" và lỗi "bị RLS chặn" để debug dễ hơn
    const sbAdmin = createSupabaseAdmin();
    const { data: adminCheck } = await sbAdmin.from("profiles").select("user_id").eq("user_id", req.auth.user.id).maybeSingle();

    if (!adminCheck) {
      throw new HttpError(404, "Không tìm thấy hồ sơ người dùng trong hệ thống.", "profile_not_found");
    } else {
      throw new HttpError(403, "Bạn không có quyền cập nhật hồ sơ này (Lỗi RLS).", "forbidden_rls");
    }
  }

  res.json({ profile: data });
});

/**
 * Upload ảnh đại diện mới cho người dùng.
 * Nhận ảnh dạng Base64 Data URL, upload lên Supabase Storage bucket "avatars",
 * xóa ảnh cũ nếu có, rồi cập nhật avatar_url trong profile.
 *
 * @route   POST /me/avatar
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Request body: `{ image: string }` — chuỗi Base64 Data URL.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ message, avatar_url, profile }`.
 * @throws {HttpError} 400 nếu thiếu ảnh, định dạng Base64 không hợp lệ, hoặc lỗi upload.
 */
meRouter.post("/me/avatar", requireUser, async (req, res) => {
  const { image } = req.body;
  assert(image, 400, "Thiếu dữ liệu hình ảnh (Base64)", "missing_image");

  const sbUser = createSupabaseUser(req.auth.jwt);
  const userId = req.auth.user.id;

  // Parse Data URL: "data:image/png;base64,<data>"
  const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
  assert(matches, 400, "Định dạng Base64 không hợp lệ", "invalid_base64");

  const contentType = matches[1];
  const extension = contentType.split("/")[1];
  const buffer = Buffer.from(matches[2], "base64");
  // Đặt tên file theo userId để dễ quản lý và tránh trùng lặp
  const fileName = `${userId}.${extension}`;

  // Xóa ảnh cũ trước khi upload ảnh mới để tránh tích lũy file rác
  const { data: existingFiles } = await sbUser.storage.from("avatars").list("", { search: userId });

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map(f => f.name);
    await sbUser.storage.from("avatars").remove(filesToDelete);
  }

  const { error: uploadError } = await sbUser.storage
    .from("avatars")
    .upload(fileName, buffer, { contentType, upsert: true });

  if (uploadError) {
    throw new HttpError(400, `Lỗi tải ảnh lên: ${uploadError.message}`, "upload_failed");
  }

  const { data: profile, error: dbError } = await sbUser
    .from("profiles")
    .update({ avatar_url: fileName })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (dbError) {
    throw new HttpError(400, `Lỗi cập nhật hồ sơ: ${dbError.message}`, "db_update_failed");
  }

  res.json({ message: "Cập nhật ảnh đại diện thành công", avatar_url: fileName, profile });
});

/**
 * Xóa ảnh đại diện của người dùng.
 * Xóa file khỏi Supabase Storage và đặt avatar_url về null trong profile.
 *
 * @route   DELETE /me/avatar
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Request object, chứa `req.auth.user.id`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ message, profile }`.
 * @throws {HttpError} 400 nếu lỗi DB.
 */
meRouter.delete("/me/avatar", requireUser, async (req, res) => {
  const sbUser = createSupabaseUser(req.auth.jwt);
  const userId = req.auth.user.id;

  // Xóa tất cả file avatar của user trong Storage
  const { data: existingFiles } = await sbUser.storage.from("avatars").list("", { search: userId });

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map(f => f.name);
    await sbUser.storage.from("avatars").remove(filesToDelete);
  }

  const { data: profile, error: dbError } = await sbUser
    .from("profiles")
    .update({ avatar_url: null })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (dbError) {
    throw new HttpError(400, `Lỗi cập nhật hồ sơ: ${dbError.message}`, "db_update_failed");
  }

  res.json({ message: "Đã xóa ảnh đại diện", profile });
});

/**
 * Đổi mật khẩu của người dùng đang đăng nhập.
 * Yêu cầu xác minh mật khẩu hiện tại trước khi cho phép đổi.
 *
 * @route   POST /me/change-password
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Request body:
 *   @param {string} req.body.currentPassword - Mật khẩu hiện tại để xác minh danh tính.
 *   @param {string} req.body.newPassword     - Mật khẩu mới (tối thiểu 6 ký tự).
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ message: string }`.
 * @throws {HttpError} 400 nếu thiếu thông tin hoặc mật khẩu mới quá ngắn.
 * @throws {HttpError} 401 nếu mật khẩu hiện tại không chính xác.
 */
meRouter.post("/me/change-password", requireUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  assert(currentPassword && newPassword, 400, "Thiếu thông tin mật khẩu", "missing_passwords");
  assert(newPassword.length >= 6, 400, "Mật khẩu mới phải có ít nhất 6 ký tự", "password_too_short");

  const sbAdmin = createSupabaseAdmin();
  const email = req.profile.email;

  // Xác minh mật khẩu hiện tại bằng cách thử đăng nhập
  const { error: signInError } = await sbAdmin.auth.signInWithPassword({
    email,
    password: currentPassword
  });

  if (signInError) {
    throw new HttpError(401, "Mật khẩu hiện tại không chính xác", "invalid_current_password");
  }

  const { error: updateError } = await sbAdmin.auth.admin.updateUserById(req.auth.user.id, {
    password: newPassword
  });

  if (updateError) {
    throw new HttpError(400, `Lỗi cập nhật mật khẩu: ${updateError.message}`, "password_update_failed");
  }

  res.json({ message: "Đổi mật khẩu thành công" });
});
