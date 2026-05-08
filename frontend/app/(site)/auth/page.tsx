/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      page.tsx (auth)
 * Mục đích:      Route handler cho trang xác thực tại "/auth".
 *                Đọc query param "mode" để xác định tab mặc định
 *                (login | register | forgot).
 *
 * Tên module:    Auth Route
 * Module liên quan: AuthPage.tsx
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { AuthPage, type AuthMode } from "./AuthPage";

type AuthPageRouteProps = {
  searchParams?: {
    mode?: string;
  };
};

const VALID_MODES: AuthMode[] = ["login", "register", "forgot"];

export default function Page({ searchParams }: AuthPageRouteProps) {
  const mode = VALID_MODES.includes(searchParams?.mode as AuthMode)
    ? (searchParams?.mode as AuthMode)
    : "login";

  return <AuthPage initialMode={mode} />;
}
