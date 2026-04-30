import express from "express";
import { z } from "zod";
import { requireUser } from "../auth/verify.js";
import { createSupabaseUser, createSupabaseAdmin } from "../supabase.js";
import { assert, HttpError } from "../http/errors.js";

export const meRouter = express.Router();

const FULL_NAME_REGEX = /^[\p{L}](?:[\p{L}\s'.-]{0,98}[\p{L}])?$/u;
const PHONE_REGEX = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;

function collapseWhitespace(value) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizePhoneNumber(value) {
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+84")) return `0${digits.slice(3)}`;
  if (digits.startsWith("84")) return `0${digits.slice(2)}`;
  return digits;
}

meRouter.get("/me", requireUser, async (req, res) => {
  res.json({
    user: req.auth.user,
    profile: req.profile
  });
});

meRouter.patch("/me", requireUser, async (req, res) => {
  console.log("Profile Update Request:", req.body);
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

  // If email is changing, update it in Supabase Auth too
  if (body.email && body.email !== req.profile?.email) {
    console.log("Updating Auth Email to:", body.email);
    const sbAdmin = createSupabaseAdmin();
    const { error: authError } = await sbAdmin.auth.admin.updateUserById(req.auth.user.id, { 
      email: body.email,
      email_confirm: true // Force confirm to avoid desync
    });
    
    if (authError) {
      console.error("Auth Update Error:", authError);
      throw new HttpError(400, `Lỗi cập nhật email tài khoản: ${authError.message}`, "auth_update_failed");
    }
  }

  console.log("Updating Profiles table for user_id:", req.auth.user.id);
  const { data, error, count } = await sbUser
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
    console.error("Profiles Table Update Error:", error);
    throw new HttpError(400, `Lỗi database (${error.code}): ${error.message}`, "profile_update_failed", error);
  }

  if (!data) {
    console.warn("No profile found or updated for user_id:", req.auth.user.id);
    // Try with admin to see if it's RLS
    const sbAdmin = createSupabaseAdmin();
    const { data: adminCheck } = await sbAdmin.from("profiles").select("user_id").eq("user_id", req.auth.user.id).maybeSingle();
    
    if (!adminCheck) {
      throw new HttpError(404, "Không tìm thấy hồ sơ người dùng trong hệ thống.", "profile_not_found");
    } else {
      throw new HttpError(403, "Bạn không có quyền cập nhật hồ sơ này (Lỗi RLS).", "forbidden_rls");
    }
  }

  console.log("Profile updated successfully:", data.user_id);
  res.json({ profile: data });
});

/**
 * @api {post} /me/avatar Cập nhật ảnh đại diện
 */
meRouter.post("/me/avatar", requireUser, async (req, res) => {
  const { image } = req.body;
  assert(image, 400, "Thiếu dữ liệu hình ảnh (Base64)", "missing_image");

  const sbUser = createSupabaseUser(req.auth.jwt);
  const userId = req.auth.user.id;

  // Xử lý base64
  const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
  assert(matches, 400, "Định dạng Base64 không hợp lệ", "invalid_base64");

  const contentType = matches[1];
  const extension = contentType.split("/")[1];
  const buffer = Buffer.from(matches[2], "base64");
  const fileName = `${userId}.${extension}`;

  console.log("Cleaning up old avatars for:", userId);
  
  // Tìm và xóa tất cả ảnh cũ có tên bắt đầu bằng userId (để dọn dẹp các đuôi file khác nhau)
  const { data: existingFiles } = await sbUser.storage.from("avatars").list("", {
    search: userId
  });
  
  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map(f => f.name);
    await sbUser.storage.from("avatars").remove(filesToDelete);
    console.log("Deleted old avatar files:", filesToDelete);
  }

  console.log("Uploading new avatar:", fileName);

  // Upload lên storage
  const { data: uploadData, error: uploadError } = await sbUser.storage
    .from("avatars")
    .upload(fileName, buffer, {
      contentType,
      upsert: true
    });

  if (uploadError) {
    console.error("Avatar Upload Error:", uploadError);
    throw new HttpError(400, `Lỗi tải ảnh lên: ${uploadError.message}`, "upload_failed");
  }

  // Cập nhật database (chỉ lưu tên file để frontend tự xử lý URL)
  const { data: profile, error: dbError } = await sbUser
    .from("profiles")
    .update({ avatar_url: fileName })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (dbError) {
    console.error("Database Update Error:", dbError);
    throw new HttpError(400, `Lỗi cập nhật hồ sơ: ${dbError.message}`, "db_update_failed");
  }

  res.json({ message: "Cập nhật ảnh đại diện thành công", avatar_url: fileName, profile });
});

/**
 * @api {delete} /me/avatar Xóa ảnh đại diện
 */
meRouter.delete("/me/avatar", requireUser, async (req, res) => {
  const sbUser = createSupabaseUser(req.auth.jwt);
  const userId = req.auth.user.id;

  console.log("Deleting avatar for:", userId);

  // 1. Tìm và xóa file trong storage
  const { data: existingFiles } = await sbUser.storage.from("avatars").list("", {
    search: userId
  });

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map(f => f.name);
    await sbUser.storage.from("avatars").remove(filesToDelete);
  }

  // 2. Cập nhật database
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
 * @api {post} /me/change-password Đổi mật khẩu
 */
meRouter.post("/me/change-password", requireUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  assert(currentPassword && newPassword, 400, "Thiếu thông tin mật khẩu", "missing_passwords");
  assert(newPassword.length >= 6, 400, "Mật khẩu mới phải có ít nhất 6 ký tự", "password_too_short");

  const sbAdmin = createSupabaseAdmin();
  const email = req.profile.email;

  console.log("Verifying current password for:", email);

  // Xác minh mật khẩu hiện tại bằng cách thử đăng nhập
  const { error: signInError } = await sbAdmin.auth.signInWithPassword({
    email,
    password: currentPassword
  });

  if (signInError) {
    console.warn("Password verification failed:", signInError.message);
    throw new HttpError(401, "Mật khẩu hiện tại không chính xác", "invalid_current_password");
  }

  console.log("Updating password for user_id:", req.auth.user.id);

  // Cập nhật mật khẩu mới (dùng Admin để chắc chắn thành công)
  const { error: updateError } = await sbAdmin.auth.admin.updateUserById(req.auth.user.id, {
    password: newPassword
  });

  if (updateError) {
    console.error("Password Update Error:", updateError);
    throw new HttpError(400, `Lỗi cập nhật mật khẩu: ${updateError.message}`, "password_update_failed");
  }

  res.json({ message: "Đổi mật khẩu thành công" });
});

