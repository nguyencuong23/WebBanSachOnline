"use client";

/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      ChatWidget.tsx
 * Mục đích:      Widget chat AI nổi ở góc màn hình — cho phép người dùng
 *                hỏi về sách, đơn hàng và thông tin cửa hàng. Tự động gửi
 *                JWT nếu đã đăng nhập để AI có thể truy cập đơn hàng của user.
 * Các chức năng chính:
 *   - Bubble button mở/đóng cửa sổ chat
 *   - Gửi/nhận tin nhắn với AI (POST /chat)
 *   - Hiển thị typing indicator khi AI đang xử lý
 *   - Xóa lịch sử chat
 *   - Tự động scroll xuống tin nhắn mới nhất
 *
 * Tên module:    Chat Widget
 * Module liên quan: lib/supabase.ts (lấy JWT), backend/routes/chat.js
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import "./chat-widget.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL as string;

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

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

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
