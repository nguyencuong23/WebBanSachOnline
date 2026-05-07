/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: ChatWidget.tsx
 * Mục đích của file: Component Widget Chat AI hiển thị góc phải dưới màn hình.
 * Các chức năng chính: Bật/tắt cửa sổ chat, hiển thị tin nhắn, gửi tin nhắn tới API `/chat`.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: AI Chat Widget
 * Mục đích của module: Hỗ trợ người dùng qua chatbot AI.
 * Phạm vi xử lý: Client Component.
 * Các thành phần chính trong module: ChatWidget.
 * Module liên quan: supabase.ts, chat-widget.css.
 * ============================================================================
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import "./chat-widget.css";

/**
 * Tên class/interface: Message
 * Mục đích của class/interface: Kiểu dữ liệu định nghĩa một tin nhắn trong hệ thống.
 * Vai trò trong hệ thống: Dùng làm Type cho mảng tin nhắn.
 * Thuộc tính chính: role (user hoặc assistant), content (Nội dung tin nhắn).
 */
interface Message {
  role: "user" | "assistant";
  content: string;
}

// Ý nghĩa: Base URL của API; Giá trị: Chuỗi URL từ env
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL as string;

/**
 * Tên function: ChatWidget
 * Mục đích của function: Hiển thị Widget Chatbot và quản lý state chat.
 * Tham số đầu vào: Không có.
 * Giá trị trả về: JSX Element.
 * Điều kiện xử lý: Load history tin nhắn vào state. Nếu chưa có tin nhắn, tự động chào.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "Xin chào! 👋 Tôi là trợ lý AI của cửa hàng sách. Tôi có thể giúp bạn tìm sách, tư vấn thể loại, hoặc giải đáp thắc mắc. Bạn cần hỗ trợ gì?",
        },
      ]);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  /**
   * Tên function: sendMessage
   * Mục đích của function: Gửi nội dung tin nhắn của User lên Server và lấy phản hồi của AI.
   * Tham số đầu vào: Không có (lấy từ state `input`).
   */
  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Lấy JWT nếu user đã đăng nhập (để AI biết đơn hàng của user)
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          // Bỏ tin nhắn chào đầu tiên của assistant ra khỏi history gửi lên
          messages: newMessages.filter((m) => !(m.role === "assistant")),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || `Lỗi ${res.status}`;
        throw new Error(msg);
      }

      const data = await res.json();
      const reply = data.reply ?? "Xin lỗi, tôi không thể trả lời lúc này.";

      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `⚠️ ${message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Tên function: handleKeyDown
   * Mục đích của function: Bắt sự kiện Enter để gửi tin nhắn thay vì xuống dòng.
   * Tham số đầu vào: e (React.KeyboardEvent)
   */
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  /**
   * Tên function: clearChat
   * Mục đích của function: Xóa lịch sử chat hiện tại và hiển thị lại câu chào mặc định.
   */
  function clearChat() {
    setMessages([]);
    setTimeout(() => {
      setMessages([
        {
          role: "assistant",
          content: "Xin chào! 👋 Tôi là trợ lý AI của cửa hàng sách. Bạn cần hỗ trợ gì?",
        },
      ]);
    }, 50);
  }

  return (
    <>
      {/* Bubble button */}
      <button
        className="chat-bubble-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mở chat hỗ trợ"
        title="Chat với AI hỗ trợ"
      >
        {open ? (
          <i className="fas fa-times" />
        ) : (
          <>
            <i className="fas fa-comment-dots" />
            <span className="chat-bubble-badge">AI</span>
          </>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">
                <i className="fas fa-robot" />
              </div>
              <div>
                <div className="chat-header-title">Trợ lý AI</div>
                <div className="chat-header-sub">
                  <span className="chat-online-dot" /> Đang hoạt động
                </div>
              </div>
            </div>
            <div className="chat-header-actions">
              <button onClick={clearChat} title="Xóa lịch sử chat" className="chat-icon-btn">
                <i className="fas fa-trash-alt" />
              </button>
              <button onClick={() => setOpen(false)} title="Đóng" className="chat-icon-btn">
                <i className="fas fa-times" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
                {msg.role === "assistant" && (
                  <div className="chat-msg-avatar">
                    <i className="fas fa-robot" />
                  </div>
                )}
                <div className="chat-msg-bubble">{msg.content}</div>
              </div>
            ))}

            {loading && (
              <div className="chat-msg chat-msg-assistant">
                <div className="chat-msg-avatar">
                  <i className="fas fa-robot" />
                </div>
                <div className="chat-msg-bubble chat-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              placeholder="Nhập tin nhắn..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="chat-send-btn"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Gửi"
            >
              <i className="fas fa-paper-plane" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
