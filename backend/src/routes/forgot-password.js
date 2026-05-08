/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      forgot-password.js
 * Mục đích:      Định tuyến luồng quên mật khẩu 3 bước: kiểm tra email →
 *                gửi OTP qua Gmail → xác minh OTP → đặt lại mật khẩu mới.
 * Các chức năng chính:
 *   - POST /auth/check-email      : Kiểm tra email có tồn tại trong hệ thống
 *   - POST /auth/forgot-password  : Gửi mã OTP 6 chữ số về email
 *   - POST /auth/verify-otp       : Xác minh OTP, trả về reset token nếu đúng
 *   - POST /auth/reset-password   : Đặt mật khẩu mới sau khi xác minh OTP
 *
 * Tên module:    Forgot Password
 * Module liên quan: supabase.js, env.js, http/errors.js
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       OTP được lưu in-memory (Map) — sẽ mất khi server restart.
 *                Phù hợp cho môi trường đơn server; cần Redis nếu scale ngang.
 * ============================================================================
 */

import express from "express";
import nodemailer from "nodemailer";
import { createSupabaseAdmin } from "../supabase.js";
import { HttpError, assert } from "../http/errors.js";
import { env } from "../env.js";

export const forgotPasswordRouter = express.Router();

// Lưu OTP tạm thời trong bộ nhớ: { email -> { otp, createdAt, expiresAt, attempts, verified } }
// Dùng Map để tra cứu O(1) và dễ xóa entry sau khi dùng xong
const otpStore = new Map();

// Thời gian OTP có hiệu lực: 10 phút tính bằng milliseconds
const OTP_TTL_MS      = 10 * 60 * 1000;
// Số lần nhập OTP sai tối đa trước khi bị khóa
const MAX_ATTEMPTS    = 5;
// Thời gian chờ tối thiểu giữa 2 lần gửi OTP: 1 phút
const RESEND_COOLDOWN = 60 * 1000;

/**
 * Tạo mã OTP ngẫu nhiên 6 chữ số.
 *
 * @returns {string} Chuỗi 6 chữ số (ví dụ: "482931").
 */
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Kiểm tra email có tồn tại trong hệ thống không.
 * Dùng ở bước đầu của luồng quên mật khẩu để thông báo sớm cho người dùng
 * thay vì chờ đến bước gửi OTP mới biết email không hợp lệ.
 *
 * @route   POST /auth/check-email
 * @access  Public
 * @async
 * @param {import("express").Request} req - Request body: `{ email: string }`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ exists: boolean }`.
 * @throws {HttpError} 400 nếu thiếu email.
 */
// ── POST /auth/check-email ─────────────────────────────────────────────────
forgotPasswordRouter.post("/auth/check-email", async (req, res) => {
  const { email } = req.body || {};
  assert(email && typeof email === "string", 400, "Email không được để trống.", "missing_email");

  const normalizedEmail = email.trim().toLowerCase();
  const sb = createSupabaseAdmin();

  const { data: profile } = await sb
    .from("profiles")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  res.json({ exists: !!profile });
});

/**
 * Tạo Nodemailer transporter dùng Gmail với App Password.
 * Ném lỗi ngay nếu chưa cấu hình để phát hiện sớm khi khởi động.
 *
 * @returns {import("nodemailer").Transporter} Nodemailer transporter đã cấu hình.
 * @throws {Error} Nếu GMAIL_USER hoặc GMAIL_APP_PASSWORD chưa được cấu hình.
 */
function createTransporter() {
  if (!env.gmailUser || !env.gmailAppPassword) {
    throw new Error(
      `Gmail chưa được cấu hình. GMAIL_USER="${env.gmailUser || "(trống)"}", GMAIL_APP_PASSWORD="${env.gmailAppPassword ? "(đã set)" : "(trống)"}"`
    );
  }
  // Bỏ spaces trong App Password (Google hiển thị có spaces nhưng nodemailer cần liền)
  const appPassword = env.gmailAppPassword.replace(/\s+/g, "");
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.gmailUser,
      pass: appPassword,
    },
  });
}

/**
 * Gửi email chứa mã OTP đến địa chỉ email của người dùng.
 *
 * @async
 * @param {string} toEmail   - Địa chỉ email người nhận.
 * @param {string} otp       - Mã OTP 6 chữ số cần gửi.
 * @param {string} [siteTitle="Cửa hàng sách"] - Tên site hiển thị trong email.
 * @returns {Promise<void>}
 * @throws {Error} Nếu gửi email thất bại.
 */
async function sendOTPEmail(toEmail, otp, siteTitle = "Cửa hàng sách") {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"${siteTitle}" <${env.gmailUser}>`,
    to: toEmail,
    subject: `[${siteTitle}] Mã OTP đặt lại mật khẩu`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
        <h2 style="color:#0f172a;margin:0 0 8px;">Đặt lại mật khẩu</h2>
        <p style="color:#475569;margin:0 0 24px;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <div style="background:#fff;border:2px solid #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#64748b;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Mã OTP của bạn</p>
          <div style="font-size:40px;font-weight:900;letter-spacing:12px;color:#2563eb;">${otp}</div>
          <p style="color:#94a3b8;font-size:12px;margin:12px 0 0;">Mã có hiệu lực trong <strong>10 phút</strong></p>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin:0;">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.</p>
      </div>
    `,
  });
}

/**
 * Gửi mã OTP về email để bắt đầu luồng đặt lại mật khẩu.
 * Luôn trả về success dù email có tồn tại hay không (chống email enumeration attack).
 * Kiểm tra cooldown để tránh spam gửi OTP liên tục.
 *
 * @route   POST /auth/forgot-password
 * @access  Public
 * @async
 * @param {import("express").Request} req - Request body: `{ email: string }`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ ok: true, message: string }`.
 * @throws {HttpError} 400 nếu thiếu email.
 * @throws {HttpError} 429 nếu gửi lại quá sớm (trong vòng 60 giây).
 */
// ── POST /auth/forgot-password ─────────────────────────────────────────────
// Gửi OTP về email
forgotPasswordRouter.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  assert(email && typeof email === "string", 400, "Email không được để trống.", "missing_email");

  const normalizedEmail = email.trim().toLowerCase();
  const sb = createSupabaseAdmin();

  // Kiểm tra email có tồn tại trong hệ thống không
  const { data: profile } = await sb
    .from("profiles")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  // Luôn trả về success để tránh email enumeration attack
  // nhưng chỉ gửi email nếu tài khoản tồn tại
  if (!profile) {
    return res.json({ ok: true, message: "Nếu email tồn tại, OTP đã được gửi." });
  }

  // Kiểm tra cooldown
  const existing = otpStore.get(normalizedEmail);
  if (existing && Date.now() - existing.createdAt < RESEND_COOLDOWN) {
    const waitSec = Math.ceil((RESEND_COOLDOWN - (Date.now() - existing.createdAt)) / 1000);
    throw new HttpError(429, `Vui lòng chờ ${waitSec} giây trước khi gửi lại.`, "rate_limited");
  }

  // Lấy SiteTitle từ settings để dùng trong email
  const { data: settings } = await sb.from("settings").select("key,value").eq("key", "SiteTitle").maybeSingle();
  const siteTitle = settings?.value || "Cửa hàng sách";

  const otp = generateOTP();
  otpStore.set(normalizedEmail, {
    otp,
    createdAt: Date.now(),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });

  // Gửi email (không await để response nhanh hơn)
  sendOTPEmail(normalizedEmail, otp, siteTitle).catch((err) => {
    console.error("[OTP] Failed to send email:", err.message);
  });

  res.json({ ok: true, message: "Nếu email tồn tại, OTP đã được gửi." });
});

/**
 * Xác minh mã OTP người dùng nhập vào.
 * Nếu đúng, trả về reset token (Base64 của email + expiry) để dùng ở bước tiếp theo.
 * Giới hạn số lần thử để chống brute-force.
 *
 * @route   POST /auth/verify-otp
 * @access  Public
 * @async
 * @param {import("express").Request} req - Request body: `{ email: string, otp: string }`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ ok: true, resetToken: string }`.
 * @throws {HttpError} 400 nếu OTP không hợp lệ, hết hạn hoặc sai.
 * @throws {HttpError} 429 nếu vượt quá số lần thử cho phép.
 */
// ── POST /auth/verify-otp ──────────────────────────────────────────────────
// Xác minh OTP, trả về reset token nếu đúng
forgotPasswordRouter.post("/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body || {};
  assert(email && otp, 400, "Thiếu email hoặc OTP.", "missing_fields");

  const normalizedEmail = email.trim().toLowerCase();
  const entry = otpStore.get(normalizedEmail);

  assert(entry, 400, "OTP không hợp lệ hoặc đã hết hạn.", "invalid_otp");
  assert(Date.now() < entry.expiresAt, 400, "OTP đã hết hạn. Vui lòng yêu cầu mã mới.", "otp_expired");
  assert(entry.attempts < MAX_ATTEMPTS, 429, "Quá nhiều lần thử. Vui lòng yêu cầu mã mới.", "too_many_attempts");

  entry.attempts += 1;

  if (entry.otp !== String(otp).trim()) {
    const remaining = MAX_ATTEMPTS - entry.attempts;
    throw new HttpError(
      400,
      remaining > 0 ? `OTP không đúng. Còn ${remaining} lần thử.` : "OTP không đúng. Vui lòng yêu cầu mã mới.",
      "wrong_otp"
    );
  }

  // OTP đúng — tạo reset token (dùng lại OTP entry, đánh dấu verified)
  entry.verified = true;
  // Reset token = email + timestamp hash đơn giản (chỉ dùng nội bộ)
  const resetToken = Buffer.from(`${normalizedEmail}:${entry.expiresAt}`).toString("base64");

  res.json({ ok: true, resetToken });
});

/**
 * Đặt lại mật khẩu mới sau khi đã xác minh OTP thành công.
 * Xác thực reset token, kiểm tra độ mạnh mật khẩu, cập nhật trong Supabase Auth
 * và xóa OTP khỏi store.
 *
 * @route   POST /auth/reset-password
 * @access  Public
 * @async
 * @param {import("express").Request} req - Request body:
 *   @param {string} req.body.email       - Email của tài khoản cần đặt lại mật khẩu.
 *   @param {string} req.body.resetToken  - Token nhận được từ bước verify-otp.
 *   @param {string} req.body.newPassword - Mật khẩu mới (phải đủ mạnh).
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ ok: true, message: string }`.
 * @throws {HttpError} 400 nếu thiếu thông tin, token không hợp lệ, mật khẩu yếu.
 * @throws {HttpError} 404 nếu không tìm thấy tài khoản.
 * @throws {HttpError} 500 nếu lỗi cập nhật mật khẩu.
 */
// ── POST /auth/reset-password ──────────────────────────────────────────────
// Đặt mật khẩu mới sau khi xác minh OTP
forgotPasswordRouter.post("/auth/reset-password", async (req, res) => {
  const { email, resetToken, newPassword } = req.body || {};
  assert(email && resetToken && newPassword, 400, "Thiếu thông tin.", "missing_fields");

  const normalizedEmail = email.trim().toLowerCase();

  // Xác minh reset token
  let decoded;
  try {
    decoded = Buffer.from(resetToken, "base64").toString("utf8");
  } catch {
    throw new HttpError(400, "Token không hợp lệ.", "invalid_token");
  }

  const [tokenEmail, tokenExpiry] = decoded.split(":");
  assert(tokenEmail === normalizedEmail, 400, "Token không hợp lệ.", "invalid_token");
  assert(Number(tokenExpiry) > Date.now(), 400, "Token đã hết hạn. Vui lòng bắt đầu lại.", "token_expired");

  const entry = otpStore.get(normalizedEmail);
  assert(entry?.verified, 400, "Chưa xác minh OTP.", "not_verified");

  // Validate mật khẩu mới
  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/;
  assert(
    PASSWORD_REGEX.test(newPassword),
    400,
    "Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
    "weak_password"
  );

  const sb = createSupabaseAdmin();

  // Tìm user theo email
  const { data: users } = await sb.auth.admin.listUsers();
  const user = users?.users?.find((u) => u.email === normalizedEmail);
  assert(user, 404, "Tài khoản không tồn tại.", "user_not_found");

  // Cập nhật mật khẩu
  const { error } = await sb.auth.admin.updateUserById(user.id, { password: newPassword });
  assert(!error, 500, "Không thể cập nhật mật khẩu.", "update_failed", error?.message);

  // Xóa OTP khỏi store
  otpStore.delete(normalizedEmail);

  res.json({ ok: true, message: "Mật khẩu đã được cập nhật thành công." });
});
