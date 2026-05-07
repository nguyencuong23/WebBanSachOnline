/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: page.tsx
 * Mục đích của file: Entry point cho trang Xác thực (Đăng nhập, Đăng ký, Quên mật khẩu).
 * Các chức năng chính: Đọc URL tham số `mode` và truyền vào AuthPage.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Auth Page Route
 * Mục đích của module: Xử lý định tuyến cho trang xác thực.
 * Phạm vi xử lý: Server Component.
 * Các thành phần chính trong module: Page.
 * Module liên quan: AuthPage.tsx.
 * ============================================================================
 */
import { AuthPage, type AuthMode } from "./AuthPage";

/**
 * Tên class/interface: AuthPageRouteProps
 * Mục đích của class/interface: Định nghĩa kiểu dữ liệu cho tham số của Page.
 */
type AuthPageRouteProps = {
  searchParams?: {
    mode?: string;
  };
};

const VALID_MODES: AuthMode[] = ["login", "register", "forgot"];

/**
 * Tên function: Page
 * Mục đích của function: Render trang Auth và định tuyến mode theo tham số URL.
 * Tham số đầu vào: searchParams (object chứa tham số URL).
 * Giá trị trả về: JSX Element.
 * Điều kiện xử lý: Mặc định fallback về `login` nếu `mode` không hợp lệ.
 */
export default function Page({ searchParams }: AuthPageRouteProps) {
  const mode = VALID_MODES.includes(searchParams?.mode as AuthMode)
    ? (searchParams?.mode as AuthMode)
    : "login";

  return <AuthPage initialMode={mode} />;
}
