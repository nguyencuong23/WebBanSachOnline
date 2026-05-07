/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: AuthPage.tsx
 * Mục đích của file: Giao diện và logic xử lý chính cho Đăng nhập, Đăng ký, Quên mật khẩu.
 * Các chức năng chính: Xử lý Form đăng nhập, form đăng ký, form quên mật khẩu (gửi OTP, đổi mật khẩu). Tương tác với Supabase Auth.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Auth Forms Component
 * Mục đích của module: Module chứa tất cả logic liên quan đến xác thực phía Client.
 * Phạm vi xử lý: Client Component, API routes `/auth/*`.
 * Các thành phần chính trong module: AuthPage, ForgotPasswordForm, PasswordField, OTPInput.
 * Module liên quan: api.ts, supabase.ts, useSessionProfile.ts.
 * ============================================================================
 */
"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/auth";
import { useSessionProfile } from "../_hooks/useSessionProfile";
import "./auth-page.css";

// ─── Types & Constants ────────────────────────────────────────────────────────
/**
 * Tên class/interface: AuthMode
 * Mục đích của class/interface: Các chế độ của trang auth.
 */
type AuthMode = "login" | "register" | "forgot";
export type { AuthMode };

type ForgotStep = "email" | "otp" | "newpass";

const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9._]{2,28}[a-z0-9])?$/;
const FULL_NAME_REGEX = /^[\p{L}](?:[\p{L}\s'.-]{0,98}[\p{L}])?$/u;
const PHONE_REGEX = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/;

type FieldErrors = Partial<Record<
  "username"|"full_name"|"phone_number"|"email"|"password"|"login_email"|"login_password", string
>>;

/**
 * Tên function: collapseWhitespace
 * Mục đích của function: Xóa khoảng trắng thừa trong chuỗi.
 */
function collapseWhitespace(v: string) { return v.trim().replace(/\s+/g, " "); }

/**
 * Tên function: normalizePhone
 * Mục đích của function: Chuẩn hóa số điện thoại về định dạng bắt đầu bằng số 0.
 */
function normalizePhone(v: string) {
  const d = v.replace(/[^\d+]/g, "");
  if (d.startsWith("+84")) return `0${d.slice(3)}`;
  if (d.startsWith("84"))  return `0${d.slice(2)}`;
  return d;
}
function readableError(err: unknown, fallback: string) {
  const msg = err instanceof Error ? err.message : String(err || "");
  if (/Failed to fetch|fetch failed|network/i.test(msg)) return "Không thể kết nối đến máy chủ.";
  if (/invalid login credentials/i.test(msg)) return "Email hoặc mật khẩu không chính xác.";
  if (/email not confirmed/i.test(msg)) return "Tài khoản chưa xác thực email.";
  return msg || fallback;
}
function pwStrength(pw: string): 0|1|2|3 {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z\d]/.test(pw)) s++;
  return s as 0|1|2|3;
}

// ─── OTP Input Component ──────────────────────────────────────────────────────
/**
 * Tên function: OTPInput
 * Mục đích của function: Component nhập mã OTP gồm 6 ô số.
 * Tham số đầu vào: value, onChange, hasError.
 * Giá trị trả về: JSX Element.
 * Điều kiện xử lý: Xử lý paste, điều hướng bằng phím mũi tên/backspace.
 */
function OTPInput({ value, onChange, hasError }: {
  value: string; onChange: (v: string) => void; hasError: boolean;
}) {
  const inputs = useRef<(HTMLInputElement|null)[]>([]);

  // Luôn đảm bảo mảng digits có đúng 6 phần tử
  const digits: string[] = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  function handleChange(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = digits.map((c, idx) => (idx === i ? d : c)).join("");
    onChange(next);
    if (d && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace") {
      if (digits[i]) {
        // Xóa ký tự ở ô hiện tại
        const next = digits.map((c, idx) => (idx === i ? "" : c)).join("");
        onChange(next);
      } else if (i > 0) {
        // Ô hiện tại trống → lùi về ô trước và xóa
        inputs.current[i - 1]?.focus();
        const next = digits.map((c, idx) => (idx === i - 1 ? "" : c)).join("");
        onChange(next);
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = Array.from({ length: 6 }, (_, i) => pasted[i] ?? "").join("");
    onChange(next);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div className="auth-otp-wrap">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          className={`auth-otp-input${d ? " filled" : ""}${hasError ? " error" : ""}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

// ─── Password Field ───────────────────────────────────────────────────────────
/**
 * Tên function: PasswordField
 * Mục đích của function: Component nhập mật khẩu, hỗ trợ hiện/ẩn và đánh giá độ mạnh.
 */
function PasswordField({ label, value, onChange, placeholder, autoComplete, showStrength, error, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string;
  showStrength?: boolean; error?: string; hint?: string;
}) {
  const [show, setShow] = useState(false);
  const strength = showStrength ? pwStrength(value) : 0;
  const strengthLabel = ["", "Yếu", "Trung bình", "Mạnh"][strength];
  const strengthClass = ["", "weak", "medium", "strong"][strength];

  return (
    <label className="auth-field">
      <span className="auth-field-label">{label}</span>
      <div className="auth-input-wrap">
        <i className="fas fa-lock auth-input-icon" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={error ? "has-error" : ""}
          style={{ paddingRight: 40 }}
        />
        <button type="button" className="auth-pw-toggle" onClick={() => setShow(s => !s)} tabIndex={-1}>
          <i className={`fas ${show ? "fa-eye-slash" : "fa-eye"}`} />
        </button>
      </div>
      {showStrength && value && (
        <>
          <div className="auth-pw-strength">
            {[1,2,3].map(n => (
              <div key={n} className={`auth-pw-bar${strength >= n ? ` ${strengthClass}` : ""}`} />
            ))}
          </div>
          <span className="auth-field-hint">{strengthLabel}</span>
        </>
      )}
      {hint && !error && <span className="auth-field-hint">{hint}</span>}
      {error && <span className="auth-field-error"><i className="fas fa-exclamation-circle" />{error}</span>}
    </label>
  );
}

// ─── Forgot Password Flow ─────────────────────────────────────────────────────
/**
 * Tên function: ForgotPasswordForm
 * Mục đích của function: Form xử lý quy trình 3 bước Quên mật khẩu (Nhập Email -> Nhập OTP -> Mật khẩu mới).
 * Tham số đầu vào: onBack (hàm quay lại).
 * Giá trị trả về: JSX Element.
 */
function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<ForgotStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const [otpError, setOtpError] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  /**
   * Tên function: handleSendOTP
   * Mục đích của function: Gửi yêu cầu OTP đến email.
   */
  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email.trim())) { setError("Email không đúng định dạng."); return; }
    setError(null); setSubmitting(true);
    try {
      // Kiểm tra email có tồn tại trong hệ thống không
      const { exists } = await apiFetch<{ exists: boolean }>("/auth/check-email", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!exists) {
        setError("Email này chưa được đăng ký trong hệ thống.");
        return;
      }
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setStep("otp");
      setCountdown(60);
      setSuccess("Mã OTP đã được gửi vào email của bạn.");
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Tên function: handleResend
   * Mục đích của function: Gửi lại mã OTP.
   */
  async function handleResend() {
    if (countdown > 0) return;
    setError(null); setSubmitting(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setCountdown(60);
      setSuccess("Đã gửi lại mã OTP.");
      setOtp("");
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Tên function: handleVerifyOTP
   * Mục đích của function: Gửi mã OTP lên server để xác minh.
   */
  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    const otpDigits = otp.replace(/[^0-9]/g, "");
    if (otpDigits.length < 6) { setError("Vui lòng nhập đủ 6 chữ số."); return; }
    setError(null); setOtpError(false); setSubmitting(true);
    try {
      const res = await apiFetch<{ resetToken: string }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otpDigits }),
      });
      setResetToken(res.resetToken);
      setStep("newpass");
      setSuccess(null);
    } catch (err: any) {
      setOtpError(true);
      setError(err.message || "OTP không đúng.");
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Tên function: handleResetPassword
   * Mục đích của function: Đặt lại mật khẩu với token trả về từ server.
   */
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!PASSWORD_REGEX.test(newPass)) {
      setError("Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.");
      return;
    }
    if (newPass !== confirmPass) { setError("Mật khẩu xác nhận không khớp."); return; }
    setError(null); setSubmitting(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), resetToken, newPassword: newPass }),
      });
      setSuccess("Mật khẩu đã được đặt lại thành công!");
      setTimeout(() => onBack(), 2000);
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  }

  const stepIndex = { email: 0, otp: 1, newpass: 2 }[step];

  return (
    <div>
      {/* Step indicator */}
      <div className="auth-step-indicator">
        {(["email","otp","newpass"] as ForgotStep[]).map((s, i) => (
          <React.Fragment key={s}>
            <div className={`auth-step${stepIndex === i ? " active" : stepIndex > i ? " done" : ""}`}>
              <div className="auth-step-num">
                {stepIndex > i ? <i className="fas fa-check" style={{fontSize:10}} /> : i+1}
              </div>
              <span>{["Nhập email","Xác minh OTP","Mật khẩu mới"][i]}</span>
            </div>
            {i < 2 && <div className={`auth-step-line${stepIndex > i ? " done" : ""}`} />}
          </React.Fragment>
        ))}
      </div>

      {error   && <div className="auth-alert is-error mb-3"><i className="fas fa-exclamation-circle" />{error}</div>}
      {success && <div className="auth-alert is-success mb-3"><i className="fas fa-check-circle" />{success}</div>}

      {/* Step 1: Email */}
      {step === "email" && (
        <form className="auth-form" onSubmit={handleSendOTP}>
          <label className="auth-field">
            <span className="auth-field-label">Email đã đăng ký</span>
            <div className="auth-input-wrap">
              <i className="fas fa-envelope auth-input-icon" />
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(null); }}
                placeholder="ban@example.com" autoComplete="email" required />
            </div>
          </label>
          <button type="submit" className="auth-submit-btn" disabled={submitting}>
            {submitting ? <><i className="fas fa-spinner fa-spin" /> Đang gửi...</> : <><i className="fas fa-paper-plane" /> Gửi mã OTP</>}
          </button>
        </form>
      )}

      {/* Step 2: OTP */}
      {step === "otp" && (
        <form className="auth-form" onSubmit={handleVerifyOTP}>
          <p style={{ fontSize: 14, color: "#475569", margin: "0 0 4px" }}>
            Nhập mã 6 chữ số đã gửi đến <strong>{email}</strong>
          </p>
          <OTPInput value={otp} onChange={v => { setOtp(v); setOtpError(false); setError(null); }} hasError={otpError} />
          <div className="auth-otp-timer">
            {countdown > 0
              ? <>Gửi lại sau <span>{countdown}s</span></>
              : <button type="button" className="auth-link-btn" onClick={handleResend} disabled={submitting}>Gửi lại mã</button>
            }
          </div>
          <button type="submit" className="auth-submit-btn" disabled={submitting || otp.replace(/[^0-9]/g,"").length < 6}>
            {submitting ? <><i className="fas fa-spinner fa-spin" /> Đang xác minh...</> : <><i className="fas fa-shield-alt" /> Xác minh OTP</>}
          </button>
        </form>
      )}

      {/* Step 3: New password */}
      {step === "newpass" && (
        <form className="auth-form" onSubmit={handleResetPassword}>
          <PasswordField label="Mật khẩu mới" value={newPass} onChange={v => { setNewPass(v); setError(null); }}
            placeholder="Mật khẩu mới" autoComplete="new-password" showStrength
            hint="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt." />
          <PasswordField label="Xác nhận mật khẩu" value={confirmPass} onChange={v => { setConfirmPass(v); setError(null); }}
            placeholder="Nhập lại mật khẩu" autoComplete="new-password"
            error={confirmPass && confirmPass !== newPass ? "Mật khẩu không khớp." : undefined} />
          <button type="submit" className="auth-submit-btn"
            disabled={submitting || !PASSWORD_REGEX.test(newPass) || newPass !== confirmPass}>
            {submitting ? <><i className="fas fa-spinner fa-spin" /> Đang cập nhật...</> : <><i className="fas fa-key" /> Đặt lại mật khẩu</>}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Main AuthPage ────────────────────────────────────────────────────────────
/**
 * Tên function: AuthPage
 * Mục đích của function: Component chính bọc toàn bộ giao diện Auth, quản lý logic login và register.
 * Tham số đầu vào: initialMode.
 * Giá trị trả về: JSX Element.
 */
export function AuthPage({ initialMode = "login" }: { initialMode?: AuthMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { email: sessionEmail, profile, isLoading } = useSessionProfile();

  useEffect(() => {
    if (!isLoading && sessionEmail) {
      const qs = new URLSearchParams(window.location.search);
      const redir = qs.get("redirect");
      // Chỉ dùng redirect param nếu có, còn không thì về trang chủ
      // Việc redirect admin sang /admin khi bảo trì do GlobalAuthLockGuard xử lý
      router.replace(redir || "/");
    }
  }, [sessionEmail, profile, isLoading, router]);

  useEffect(() => { setMode(initialMode); setError(null); setSuccess(null); }, [initialMode]);

  // Login state
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");

  // Register state
  const [regUsername, setRegUsername] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw, setRegPw] = useState("");

  function reset() { setError(null); setSuccess(null); setFieldErrors({}); }
  function setFE(f: keyof FieldErrors, m: string) { setFieldErrors(p => ({ ...p, [f]: m })); }
  function clearFE(f: keyof FieldErrors) { setFieldErrors(p => { const n = { ...p }; delete n[f]; return n; }); }

  /**
   * Tên function: handleLogin
   * Mục đích của function: Xử lý submit form đăng nhập.
   */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); reset();
    const id = loginId.trim().toLowerCase();
    if (!id) { setFE("login_email", "Không được để trống."); return; }
    if (!loginPw) { setFE("login_password", "Không được để trống."); return; }
    setSubmitting(true);
    try {
      let emailForAuth = id;
      if (!id.includes("@")) {
        try {
          const r = await apiFetch<{ email: string }>("/auth/resolve-identifier", {
            method: "POST", body: JSON.stringify({ identifier: id }),
          });
          emailForAuth = r.email;
        } catch { setError("Tài khoản không tồn tại."); return; }
      }
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: emailForAuth, password: loginPw });
      if (signErr) { setError(readableError(signErr, "Đăng nhập thất bại.")); return; }
      const p = await getProfile();
      const qs = new URLSearchParams(window.location.search);
      const redir = qs.get("redirect");
      // Chỉ dùng redirect param nếu có, còn không thì về trang chủ
      // Việc redirect admin sang /admin khi bảo trì do GlobalAuthLockGuard xử lý
      router.push(redir || "/");
      router.refresh();
    } catch (err) { setError(readableError(err, "Đăng nhập thất bại.")); }
    finally { setSubmitting(false); }
  }

  /**
   * Tên function: handleRegister
   * Mục đích của function: Xử lý submit form đăng ký.
   */
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); reset();
    const errs: FieldErrors = {};
    const username = regUsername.trim().toLowerCase();
    const fullName = collapseWhitespace(regFullName);
    const phone = normalizePhone(regPhone);
    const email = regEmail.trim().toLowerCase();
    if (!USERNAME_REGEX.test(username)) errs.username = "4-30 ký tự, chỉ chữ thường, số, dấu chấm/gạch dưới.";
    if (!(fullName.length >= 2 && fullName.length <= 100 && FULL_NAME_REGEX.test(fullName))) errs.full_name = "2-100 ký tự, chỉ chữ cái và dấu cách hợp lệ.";
    if (!PHONE_REGEX.test(phone)) errs.phone_number = "Số điện thoại Việt Nam không hợp lệ.";
    if (!email || !EMAIL_REGEX.test(email)) errs.email = "Email không đúng định dạng.";
    if (!PASSWORD_REGEX.test(regPw)) errs.password = "Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.";
    if (Object.keys(errs).length) { setFieldErrors(errs); setError("Vui lòng kiểm tra lại thông tin."); return; }
    setSubmitting(true);
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, full_name: fullName, phone_number: phone, email, password: regPw }),
      });
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password: regPw });
      if (signErr) { setSuccess("Đăng ký thành công. Hãy đăng nhập."); setMode("login"); setLoginId(email); return; }
      router.push("/"); router.refresh();
    } catch (err: any) {
      const field = err instanceof ApiError && typeof err.details === "object" && err.details && "field" in err.details
        ? (err.details.field as keyof FieldErrors) : undefined;
      if (field) setFE(field, err.message);
      setError(readableError(err, "Đăng ký thất bại."));
    } finally { setSubmitting(false); }
  }

  const panelInfo = {
    login:    { icon: "fa-sign-in-alt",  title: "Chào mừng quay lại",   desc: "Đăng nhập để tiếp tục mua sắm và theo dõi đơn hàng." },
    register: { icon: "fa-user-plus",    title: "Tạo tài khoản mới",    desc: "Đăng ký để mua sách, theo dõi đơn hàng và nhiều hơn nữa." },
    forgot:   { icon: "fa-key",          title: "Khôi phục mật khẩu",   desc: "Đặt lại mật khẩu qua mã OTP gửi về email của bạn." },
  }[mode];

  return (
    <section className="auth-shell">
      <div className="auth-card">
        {/* Left panel */}
        <aside className="auth-panel">
          <div className="auth-brand">
            <i className="fas fa-book-open" />
            <span>Cửa hàng sách</span>
          </div>
          <h1 className="auth-panel-heading">{panelInfo.title}</h1>
          <p className="auth-panel-desc">{panelInfo.desc}</p>
          <div className="auth-tabs">
            {([
              { key: "login",    icon: "fa-sign-in-alt", label: "Đăng nhập" },
              { key: "register", icon: "fa-user-plus",   label: "Đăng ký" },
              { key: "forgot",   icon: "fa-key",         label: "Quên mật khẩu" },
            ] as { key: AuthMode; icon: string; label: string }[]).map(t => (
              <button key={t.key} type="button"
                className={`auth-tab-btn${mode === t.key ? " active" : ""}`}
                onClick={() => { reset(); setMode(t.key); }}>
                <i className={`fas ${t.icon}`} />
                {t.label}
              </button>
            ))}
          </div>
          <div className="auth-panel-footer">
            Thông tin của bạn được bảo mật và mã hóa an toàn.
          </div>
        </aside>

        {/* Right content */}
        <div className="auth-content">
          <div className="auth-content-header">
            <h2>
              {mode === "login"    && "Đăng nhập tài khoản"}
              {mode === "register" && "Tạo tài khoản mới"}
              {mode === "forgot"   && "Đặt lại mật khẩu"}
            </h2>
            <p>
              {mode === "login"    && "Nhập thông tin đăng nhập để tiếp tục."}
              {mode === "register" && "Điền đầy đủ thông tin để bắt đầu."}
              {mode === "forgot"   && "Xác minh danh tính qua OTP để đặt lại mật khẩu."}
            </p>
          </div>

          {error   && <div className="auth-alert is-error"  style={{marginBottom:16}}><i className="fas fa-exclamation-circle" />{error}</div>}
          {success && <div className="auth-alert is-success" style={{marginBottom:16}}><i className="fas fa-check-circle" />{success}</div>}

          {/* LOGIN */}
          {mode === "login" && (
            <form className="auth-form" onSubmit={handleLogin}>
              <label className="auth-field">
                <span className="auth-field-label">Email hoặc Tên đăng nhập</span>
                <div className="auth-input-wrap">
                  <i className="fas fa-user auth-input-icon" />
                  <input type="text" value={loginId}
                    onChange={e => { setLoginId(e.target.value); clearFE("login_email"); }}
                    placeholder="ban@example.com hoặc username"
                    autoComplete="username"
                    className={fieldErrors.login_email ? "has-error" : ""}
                  />
                </div>
                {fieldErrors.login_email && <span className="auth-field-error"><i className="fas fa-exclamation-circle" />{fieldErrors.login_email}</span>}
              </label>
              <PasswordField label="Mật khẩu" value={loginPw}
                onChange={v => { setLoginPw(v); clearFE("login_password"); }}
                placeholder="Mật khẩu của bạn" autoComplete="current-password"
                error={fieldErrors.login_password} />
              <button type="submit" className="auth-submit-btn" disabled={submitting}>
                {submitting ? <><i className="fas fa-spinner fa-spin" /> Đang đăng nhập...</> : <><i className="fas fa-sign-in-alt" /> Đăng nhập</>}
              </button>
            </form>
          )}

          {/* REGISTER */}
          {mode === "register" && (
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="auth-form-grid">
                <label className="auth-field">
                  <span className="auth-field-label">Tên đăng nhập</span>
                  <div className="auth-input-wrap">
                    <i className="fas fa-at auth-input-icon" />
                    <input value={regUsername} onChange={e => { setRegUsername(e.target.value); clearFE("username"); }}
                      placeholder="ten_dang_nhap" autoComplete="username"
                      className={fieldErrors.username ? "has-error" : ""} />
                  </div>
                  {fieldErrors.username && <span className="auth-field-error"><i className="fas fa-exclamation-circle" />{fieldErrors.username}</span>}
                </label>
                <label className="auth-field">
                  <span className="auth-field-label">Họ và tên</span>
                  <div className="auth-input-wrap">
                    <i className="fas fa-user auth-input-icon" />
                    <input value={regFullName} onChange={e => { setRegFullName(e.target.value); clearFE("full_name"); }}
                      placeholder="Nguyễn Văn A" autoComplete="name"
                      className={fieldErrors.full_name ? "has-error" : ""} />
                  </div>
                  {fieldErrors.full_name && <span className="auth-field-error"><i className="fas fa-exclamation-circle" />{fieldErrors.full_name}</span>}
                </label>
              </div>
              <div className="auth-form-grid">
                <label className="auth-field">
                  <span className="auth-field-label">Số điện thoại</span>
                  <div className="auth-input-wrap">
                    <i className="fas fa-phone auth-input-icon" />
                    <input value={regPhone} onChange={e => { setRegPhone(e.target.value); clearFE("phone_number"); }}
                      placeholder="09xxxxxxxx" autoComplete="tel"
                      className={fieldErrors.phone_number ? "has-error" : ""} />
                  </div>
                  {fieldErrors.phone_number && <span className="auth-field-error"><i className="fas fa-exclamation-circle" />{fieldErrors.phone_number}</span>}
                </label>
                <label className="auth-field">
                  <span className="auth-field-label">Email</span>
                  <div className="auth-input-wrap">
                    <i className="fas fa-envelope auth-input-icon" />
                    <input type="email" value={regEmail} onChange={e => { setRegEmail(e.target.value); clearFE("email"); }}
                      placeholder="ban@example.com" autoComplete="email"
                      className={fieldErrors.email ? "has-error" : ""} />
                  </div>
                  {fieldErrors.email && <span className="auth-field-error"><i className="fas fa-exclamation-circle" />{fieldErrors.email}</span>}
                </label>
              </div>
              <PasswordField label="Mật khẩu" value={regPw}
                onChange={v => { setRegPw(v); clearFE("password"); }}
                placeholder="Mật khẩu mạnh" autoComplete="new-password" showStrength
                hint="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt."
                error={fieldErrors.password} />
              <button type="submit" className="auth-submit-btn" disabled={submitting}>
                {submitting ? <><i className="fas fa-spinner fa-spin" /> Đang tạo tài khoản...</> : <><i className="fas fa-user-plus" /> Đăng ký</>}
              </button>
            </form>
          )}

          {/* FORGOT */}
          {mode === "forgot" && (
            <ForgotPasswordForm onBack={() => { reset(); setMode("login"); }} />
          )}

          {/* Footer */}
          <div className="auth-footer">
            {mode === "login" && (
              <>
                <button type="button" className="auth-link-btn" onClick={() => { reset(); setMode("register"); }}>
                  Chưa có tài khoản? Đăng ký
                </button>
                <button type="button" className="auth-link-btn" onClick={() => { reset(); setMode("forgot"); }}>
                  Quên mật khẩu?
                </button>
              </>
            )}
            {mode === "register" && (
              <button type="button" className="auth-link-btn" onClick={() => { reset(); setMode("login"); }}>
                Đã có tài khoản? Đăng nhập
              </button>
            )}
            {mode === "forgot" && (
              <button type="button" className="auth-link-btn" onClick={() => { reset(); setMode("login"); }}>
                <i className="fas fa-arrow-left" style={{marginRight:4}} />Quay lại đăng nhập
              </button>
            )}
            <Link href="/" className="auth-home-link">
              <i className="fas fa-home" style={{marginRight:4}} />Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
