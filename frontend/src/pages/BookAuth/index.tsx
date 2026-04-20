import React, { useState } from "react";
import "./book-auth.css";

const BookAuth: React.FC = () => {
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  const handleFlip = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="book-auth-container">
      <div className="book-wrapper">
        <div className="book-left-page">
          <div className="brand-content">
            <h1>Tiệm Sách Online</h1>
            <p>Khám phá thế giới qua từng trang giấy.</p>
          </div>
        </div>

        <div className={`book-right-page ${isFlipped ? "flipped" : ""}`}>
          <div className="page-face front-page">
            <h2>Đăng Nhập</h2>
            <form className="auth-form">
              <div className="input-group">
                <label>Email</label>
                <input type="email" placeholder="Nhập email của bạn" required />
              </div>
              <div className="input-group">
                <label>Mật khẩu</label>
                <input type="password" placeholder="Nhập mật khẩu" required />
              </div>
              <button type="submit" className="submit-btn">
                Vào Cửa Hàng
              </button>
            </form>
            <div className="toggle-text">
              <button className="text-btn" onClick={handleFlip}>
                Chưa có tài khoản? <strong>Đăng ký tại đây</strong>
              </button>
            </div>
          </div>

          <div className="page-face back-page">
            <h2>Đăng Ký</h2>
            <form className="auth-form">
              <div className="input-group">
                <label>Họ và tên</label>
                <input type="text" placeholder="Nhập họ tên" required />
              </div>
              <div className="input-group">
                <label>Email</label>
                <input type="email" placeholder="Nhập email của bạn" required />
              </div>
              <div className="input-group">
                <label>Mật khẩu</label>
                <input type="password" placeholder="Tạo mật khẩu" required />
              </div>
              <button type="submit" className="submit-btn">
                Tạo Tài Khoản
              </button>
            </form>
            <div className="toggle-text">
              <button className="text-btn" onClick={handleFlip}>
                Đã có tài khoản? <strong>Đăng nhập ngay</strong>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAuth;

