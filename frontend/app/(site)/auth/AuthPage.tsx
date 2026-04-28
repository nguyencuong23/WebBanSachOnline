"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import "./auth-page.css";

type AuthMode = "login" | "register" | "forgot";

type AuthPageProps = {
  initialMode?: AuthMode;
};

export type { AuthMode };

const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9._]{2,28}[a-z0-9])?$/;
const FULL_NAME_REGEX = /^[\p{L}](?:[\p{L}\s'.-]{0,98}[\p{L}])?$/u;
const PHONE_REGEX = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/;

type FieldErrors = Partial<
  Record<"username" | "full_name" | "phone_number" | "email" | "password" | "login_email" | "login_password", string>
>;

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+84")) return `0${digits.slice(3)}`;
  if (digits.startsWith("84")) return `0${digits.slice(2)}`;
  return digits;
}

function getReadableAuthError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error || "");

  if (/Failed to fetch|fetch failed|network/i.test(message)) {
    return "Không thể kết nối đến máy chủ";
  }

  if (/invalid login credentials/i.test(message)) {
    return "Email hoặc mật khẩu không chính xác.";
  }

  if (/email not confirmed/i.test(message)) {
    return "Tài khoản chưa xác thực email.";
  }

  return message || fallback;
}

export function AuthPage({ initialMode = "login" }: AuthPageProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerUsername, setRegisterUsername] = useState("");
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccess(null);
  }, [initialMode]);

  const panelCopy = useMemo(() => {
    if (mode === "register") {
      return {
        title: "Tạo tài khoản mới",
        description: "Đăng ký nhanh để mua sách, theo dõi đơn hàng và quản lý hồ sơ cá nhân.",
      };
    }

    if (mode === "forgot") {
      return {
        title: "Khôi phục mật khẩu",
        description: "Nhập email đã đăng ký, hệ thống sẽ gửi liên kết đặt lại mật khẩu cho bạn.",
      };
    }

    return {
      title: "Chào mừng quay lại",
      description: "Đăng nhập để tiếp tục mua sắm, theo dõi đơn hàng và sử dụng đầy đủ tính năng của cửa hàng.",
    };
  }, [mode]);

  function resetNotice() {
    setError(null);
    setSuccess(null);
    setFieldErrors({});
  }

  function setFieldError(field: keyof FieldErrors, message: string) {
    setFieldErrors((current) => ({ ...current, [field]: message }));
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function validateRegisterForm() {
    const nextErrors: FieldErrors = {};
    const username = registerUsername.trim().toLowerCase();
    const fullName = collapseWhitespace(registerFullName);
    const phone = normalizePhoneNumber(registerPhone);
    const email = registerEmail.trim().toLowerCase();

    if (!USERNAME_REGEX.test(username)) {
      nextErrors.username = "Tên đăng nhập phải dài 4-30 ký tự, chỉ gồm chữ thường, số, dấu chấm hoặc dấu gạch dưới.";
    }

    if (!(fullName.length >= 2 && fullName.length <= 100 && FULL_NAME_REGEX.test(fullName))) {
      nextErrors.full_name = "Họ tên phải dài 2-100 ký tự và chỉ chứa chữ cái cùng các dấu cách hợp lệ.";
    }

    if (!PHONE_REGEX.test(phone)) {
      nextErrors.phone_number = "Số điện thoại phải là số di động Việt Nam hợp lệ.";
    }

    if (!email) {
      nextErrors.email = "Email không được để trống.";
    } else if (!EMAIL_REGEX.test(email)) {
      nextErrors.email = "Email không đúng định dạng.";
    }

    if (!PASSWORD_REGEX.test(registerPassword)) {
      nextErrors.password = "Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.";
    }

    setFieldErrors(nextErrors);
    return {
      isValid: Object.keys(nextErrors).length === 0,
      username,
      fullName,
      phone,
      email,
    };
  }

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetNotice();
    setIsSubmitting(true);

    try {
      const email = loginEmail.trim().toLowerCase();
      let hasFieldError = false;

      if (!email) {
        setFieldError("login_email", "Email không được để trống.");
        hasFieldError = true;
      } else if (!EMAIL_REGEX.test(email)) {
        setFieldError("login_email", "Email không đúng định dạng.");
        hasFieldError = true;
      }

      if (!loginPassword) {
        setFieldError("login_password", "Mật khẩu không được để trống.");
        hasFieldError = true;
      }

      if (hasFieldError) return;

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (error) {
        setError(getReadableAuthError(error, "Đăng nhập thất bại."));
        return;
      }

      router.push("/");
      router.refresh();
    } catch (submitError) {
      setError(getReadableAuthError(submitError, "Đăng nhập thất bại."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetNotice();
    const validation = validateRegisterForm();

    if (!validation.isValid) {
      setError("Vui lòng kiểm tra lại thông tin đăng ký.");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch<{
        message: string;
      }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: validation.username,
          full_name: validation.fullName,
          phone_number: validation.phone,
          email: validation.email,
          password: registerPassword,
        }),
      });

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: validation.email,
        password: registerPassword,
      });

      if (signInError) {
        setSuccess("Đăng ký thành công. Hãy đăng nhập để tiếp tục.");
        setMode("login");
        setLoginEmail(validation.email);
        return;
      }

      setSuccess("Đăng ký thành công. Bạn đã được đăng nhập.");
      router.push("/");
      router.refresh();
    } catch (submitError) {
      const message = getReadableAuthError(submitError, "Đăng ký thất bại.");
      const field =
        submitError instanceof ApiError &&
        submitError.details &&
        typeof submitError.details === "object" &&
        "field" in submitError.details
          ? (submitError.details.field as keyof FieldErrors)
          : undefined;

      if (field) {
        setFieldError(field, message);
      }

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetNotice();
    setIsSubmitting(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
        redirectTo,
      });

      if (error) {
        setError(getReadableAuthError(error, "Không thể gửi email đặt lại mật khẩu."));
        return;
      }

      setSuccess("Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn.");
    } catch (submitError) {
      setError(getReadableAuthError(submitError, "Không thể gửi email đặt lại mật khẩu."));
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderForm() {
    if (mode === "register") {
      return (
        <form className="auth-form" onSubmit={handleRegisterSubmit}>
          <div className="auth-form-grid">
            <label className="auth-field">
              <span>Tên đăng nhập</span>
              <input
                value={registerUsername}
                onChange={(event) => {
                  setRegisterUsername(event.target.value);
                  clearFieldError("username");
                }}
                placeholder="nhap_ten_dang_nhap"
                autoComplete="username"
                required
              />
              {fieldErrors.username && <small className="auth-field-error">{fieldErrors.username}</small>}
            </label>

            <label className="auth-field">
              <span>Họ và tên</span>
              <input
                value={registerFullName}
                onChange={(event) => {
                  setRegisterFullName(event.target.value);
                  clearFieldError("full_name");
                }}
                placeholder="Nguyen Van A"
                autoComplete="name"
                required
              />
              {fieldErrors.full_name && <small className="auth-field-error">{fieldErrors.full_name}</small>}
            </label>
          </div>

          <div className="auth-form-grid">
            <label className="auth-field">
              <span>Số điện thoại</span>
              <input
                value={registerPhone}
                onChange={(event) => {
                  setRegisterPhone(event.target.value);
                  clearFieldError("phone_number");
                }}
                placeholder="09xxxxxxxx"
                autoComplete="tel"
                required
              />
              {fieldErrors.phone_number && <small className="auth-field-error">{fieldErrors.phone_number}</small>}
            </label>

            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={registerEmail}
                onChange={(event) => {
                  setRegisterEmail(event.target.value);
                  clearFieldError("email");
                }}
                placeholder="ban@example.com"
                autoComplete="email"
                required
              />
              {fieldErrors.email && <small className="auth-field-error">{fieldErrors.email}</small>}
            </label>
          </div>

          <label className="auth-field">
            <span>Mật khẩu</span>
            <input
              type="password"
              value={registerPassword}
              onChange={(event) => {
                setRegisterPassword(event.target.value);
                clearFieldError("password");
              }}
              placeholder="ToiThichDocSach123"
              autoComplete="new-password"
              required
            />
            <small className="auth-field-hint">
              Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
            </small>
            {fieldErrors.password && <small className="auth-field-error">{fieldErrors.password}</small>}
          </label>

          <button type="submit" className="auth-primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký"}
          </button>
        </form>
      );
    }

    if (mode === "forgot") {
      return (
        <form className="auth-form" onSubmit={handleForgotSubmit}>
          <label className="auth-field">
            <span>Email đã đăng ký</span>
            <input
              type="email"
              value={forgotEmail}
              onChange={(event) => setForgotEmail(event.target.value)}
              placeholder="ban@example.com"
              autoComplete="email"
              required
            />
          </label>

          <button type="submit" className="auth-primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Đang gửi..." : "Gửi liên kết đặt lại"}
          </button>
        </form>
      );
    }

    return (
      <form className="auth-form" onSubmit={handleLoginSubmit}>
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            value={loginEmail}
            onChange={(event) => {
              setLoginEmail(event.target.value);
              clearFieldError("login_email");
            }}
            placeholder="ban@example.com"
            autoComplete="email"
            required
          />
          {fieldErrors.login_email && <small className="auth-field-error">{fieldErrors.login_email}</small>}
        </label>

        <label className="auth-field">
          <span>Mật khẩu</span>
          <input
            type="password"
            value={loginPassword}
            onChange={(event) => {
              setLoginPassword(event.target.value);
              clearFieldError("login_password");
            }}
            placeholder="Nhap mat khau"
            autoComplete="current-password"
            required
          />
          {fieldErrors.login_password && (
            <small className="auth-field-error">{fieldErrors.login_password}</small>
          )}
        </label>

        <div className="auth-inline-actions">
          <button type="submit" className="auth-primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          <button
            type="button"
            className="auth-text-button"
            onClick={() => {
              resetNotice();
              setForgotEmail(loginEmail);
              setMode("forgot");
            }}
          >
            Quên mật khẩu?
          </button>
        </div>
      </form>
    );
  }

  return (
    <section className="auth-shell">
      <div className="auth-background" />

      <div className="auth-card">
        <aside className="auth-panel">
          <div className="auth-brand">WebBanSachOnline</div>
          <h1>{panelCopy.title}</h1>
          <p>{panelCopy.description}</p>

          <div className="auth-panel-pills">
            <button
              type="button"
              className={mode === "login" ? "is-active" : ""}
              onClick={() => {
                resetNotice();
                setMode("login");
              }}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={mode === "register" ? "is-active" : ""}
              onClick={() => {
                resetNotice();
                setMode("register");
              }}
            >
              Đăng ký
            </button>
            <button
              type="button"
              className={mode === "forgot" ? "is-active" : ""}
              onClick={() => {
                resetNotice();
                setMode("forgot");
              }}
            >
              Quên mật khẩu
            </button>
          </div>

          <div className="auth-panel-note">
            {mode === "login" ? "Đăng nhập hiện hỗ trợ bằng email." : "Thong tin dang ky gom username, ho ten, so dien thoai, email va mat khau."}
          </div>
        </aside>

        <div className="auth-content">
          <div className="auth-content-header">
            <h2>
              {mode === "login" && "Đăng nhập tài khoản"}
              {mode === "register" && "Tạo tài khoản mới"}
              {mode === "forgot" && "Quên mật khẩu"}
            </h2>
            <p>
              {mode === "login" && "Nhập email và mật khẩu để tiếp tục."}
              {mode === "register" && "Điền đầy đủ thông tin để bắt đầu sử dụng hệ thống."}
              {mode === "forgot" && "Chúng tôi sẽ gửi liên kết đặt lại mật khẩu về email của bạn."}
            </p>
          </div>

          {(error || success) && (
            <div className={`auth-alert ${error ? "is-error" : "is-success"}`}>
              {error || success}
            </div>
          )}

          {renderForm()}

          <div className="auth-footer-links">
            {mode !== "login" && (
              <button
                type="button"
                className="auth-footer-button"
                onClick={() => {
                  resetNotice();
                  setMode("login");
                }}
              >
                Quay lại đăng nhập
              </button>
            )}

            {mode === "login" && (
              <button
                type="button"
                className="auth-footer-button"
                onClick={() => {
                  resetNotice();
                  setMode("register");
                }}
              >
                Chưa có tài khoản? Đăng ký ngay
              </button>
            )}

            <Link href="/" className="auth-home-link">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
