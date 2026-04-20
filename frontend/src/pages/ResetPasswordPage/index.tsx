import { useState } from "react";
import { supabase } from "../../supabase";
import { useNavigate } from "react-router-dom";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setError(error.message);
    setMsg("Đổi mật khẩu thành công.");
    setTimeout(() => nav("/login"), 1200);
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h2>Reset password</h2>
      <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="new password"
        />
        <button type="submit">Update password</button>
      </form>
      {msg && <p style={{ color: "green" }}>{msg}</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </div>
  );
}

