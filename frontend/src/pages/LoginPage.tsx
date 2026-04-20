import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);
    nav("/");
  }

  return (
    <div>
      <div className="bg-scene" />
      <div className="book-container">
        <div className="back-cover" />
        <div className="flipping-page">
          <div className="page-front">
            <div className="header-text">
              <h2>ĐĂNG NHẬP</h2>
              <span>Thư viện Đại Nam</span>
            </div>

            <div className="text-center mb-4">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/d/d3/Logo_DAI_NAM.png"
                style={{ width: 80, opacity: 0.8 }}
              />
            </div>

            <form onSubmit={submit} autoComplete="off">
              <label className="form-label">Tài khoản Email</label>
              <input
                name="Username"
                className="form-control"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <label className="form-label">Mật khẩu</label>
              <input
                name="Password"
                type="password"
                className="form-control"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button type="submit" className="btn btn-main btn-login">
                ĐĂNG NHẬP
              </button>
            </form>

            {error && <p className="text-danger mt-3">{error}</p>}
            <div className="switch-btn">
              <Link to="/forgot-password">Quên mật khẩu? Lấy lại ngay</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

