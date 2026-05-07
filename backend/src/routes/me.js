/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: me.js
 * Mục đích của file: Quản lý thông tin hồ sơ (profile) của người dùng đang đăng nhập.
 * Các chức năng chính: Lấy thông tin, cập nhật thông tin cá nhân, tải lên/xóa ảnh đại diện, đổi mật khẩu.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Me API Route
 * Mục đích của module: Cung cấp API để người dùng tự quản lý tài khoản của mình.
 * Phạm vi xử lý: Yêu cầu đăng nhập (requireUser), validate Zod, cập nhật DB và Storage Supabase.
 * Các thành phần chính trong module: Express Router, Zod validation, Supabase client/admin.
 * Module liên quan: verify.js (Xác thực user), supabase.js (DB/Storage client).
 * ============================================================================
 */
import express from "express";
import { z } from "zod";
import { requireUser } from "../auth/verify.js";
import { createSupabaseUser, createSupabaseAdmin } from "../supabase.js";
import { assert, HttpError } from "../http/errors.js";

export const meRouter = express.Router(); // Ý nghĩa: Router cho các endpoint /me; Giá trị: Express Router instance

const FULL_NAME_REGEX = /^[\p{L}](?:[\p{L}\s'.-]{0,98}[\p{L}])?$/u; // Ý nghĩa: Regex kiểm tra họ tên hợp lệ
const PHONE_REGEX = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/; // Ý nghĩa: Regex kiểm tra số điện thoại hợp lệ

/**
 * Tên function: collapseWhitespace
 * Mục đích của function: Xóa khoảng trắng thừa ở đầu/cuối và rút gọn khoảng trắng liên tiếp.
 * Tham số đầu vào: value (string)
 * Giá trị trả về: Chuỗi đã rút gọn khoảng trắng.
 * Điều kiện xử lý: Input là chuỗi.
 * Lỗi có thể phát sinh: Không.
 */
function collapseWhitespace(value) {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Tên function: normalizePhoneNumber
 * Mục đích của function: Chuyển đổi số điện thoại về định dạng bắt đầu bằng 0.
 * Tham số đầu vào: value (string)
 * Giá trị trả về: Chuỗi số điện thoại định dạng chuẩn.
 * Điều kiện xử lý: Lọc bỏ ký tự đặc biệt, thay mã vùng quốc gia.
 * Lỗi có thể phát sinh: Không.
 */
function normalizePhoneNumber(value) {
  const digits = value.replace(/[^\d+]/g, ""); // Ý nghĩa: Số điện thoại chỉ giữ lại số và dấu +
  if (digits.startsWith("+84")) return `0${digits.slice(3)}`;
  if (digits.startsWith("84")) return `0${digits.slice(2)}`;
  return digits;
}

/**
 * Tên function: GET /me
 * Mục đích của function: Lấy thông tin user và profile của người dùng hiện tại.
 * Tham số đầu vào: req, res
 * Giá trị trả về: JSON `{ user: Object, profile: Object }`
 * Điều kiện xử lý: Phải vượt qua middleware requireUser.
 * Lỗi có thể phát sinh: 401 nếu chưa đăng nhập.
 */
meRouter.get("/me", requireUser, async (req, res) => {
  res.json({
    user: req.auth.user, // Ý nghĩa: Dữ liệu user từ Supabase Auth
    profile: req.profile // Ý nghĩa: Dữ liệu profile từ bảng profiles (đính kèm bởi middleware)
  });
});

/**
 * Tên function: PATCH /me
 * Mục đích của function: Cập nhật thông tin hồ sơ người dùng (tên, email, số điện thoại, địa chỉ).
 * Tham số đầu vào: req (body), res
 * Giá trị trả về: JSON `{ profile: Object }`
 * Điều kiện xử lý: Validate các trường gửi lên, nếu có email thì phải update Auth trước.
 * Lỗi có thể phát sinh: 400 (Lỗi validate, lỗi update), 403 (Lỗi quyền), 404.
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

  if (body.email && body.email !== req.profile?.email) {
    const sbAdmin = createSupabaseAdmin();
    const { error: authError } = await sbAdmin.auth.admin.updateUserById(req.auth.user.id, {
      email: body.email,
      email_confirm: true
    });

    if (authError) {
      throw new HttpError(400, `Lỗi cập nhật email tài khoản: ${authError.message}`, "auth_update_failed");
    }
  }

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
 * Tên function: POST /me/avatar
 * Mục đích của function: Tải lên và cập nhật ảnh đại diện người dùng.
 * Tham số đầu vào: req (body: `image` chuẩn Base64), res
 * Giá trị trả về: JSON báo thành công và URL ảnh mới.
 * Điều kiện xử lý: Ảnh phải là chuỗi base64 hợp lệ, ghi đè lên ảnh cũ nếu có trong Supabase Storage.
 * Lỗi có thể phát sinh: 400 nếu dữ liệu lỗi hoặc upload thất bại.
 */
meRouter.post("/me/avatar", requireUser, async (req, res) => {
  const { image } = req.body;
  assert(image, 400, "Thiếu dữ liệu hình ảnh (Base64)", "missing_image");

  const sbUser = createSupabaseUser(req.auth.jwt);
  const userId = req.auth.user.id;

  const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
  assert(matches, 400, "Định dạng Base64 không hợp lệ", "invalid_base64");

  const contentType = matches[1];
  const extension = contentType.split("/")[1];
  const buffer = Buffer.from(matches[2], "base64");
  const fileName = `${userId}.${extension}`;

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
 * Tên function: DELETE /me/avatar
 * Mục đích của function: Xóa ảnh đại diện hiện tại của người dùng.
 * Tham số đầu vào: req, res
 * Giá trị trả về: JSON báo thành công.
 * Điều kiện xử lý: Xóa file trong Storage và set avatar_url trong DB thành null.
 * Lỗi có thể phát sinh: 400 nếu có lỗi thao tác DB.
 */
meRouter.delete("/me/avatar", requireUser, async (req, res) => {
  const sbUser = createSupabaseUser(req.auth.jwt);
  const userId = req.auth.user.id;

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
 * Tên function: POST /me/change-password
 * Mục đích của function: Đổi mật khẩu của người dùng.
 * Tham số đầu vào: req (body: `currentPassword`, `newPassword`), res
 * Giá trị trả về: JSON báo thành công.
 * Điều kiện xử lý: Mật khẩu cũ phải đúng, mật khẩu mới đủ dài (>= 6).
 * Lỗi có thể phát sinh: 400 (Thiếu mật khẩu, cập nhật lỗi), 401 (Sai mật khẩu cũ).
 */
meRouter.post("/me/change-password", requireUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  assert(currentPassword && newPassword, 400, "Thiếu thông tin mật khẩu", "missing_passwords");
  assert(newPassword.length >= 6, 400, "Mật khẩu mới phải có ít nhất 6 ký tự", "password_too_short");

  const sbAdmin = createSupabaseAdmin();
  const email = req.profile.email;

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
