"use client";

import { useState, useRef, useEffect } from "react";
import "./chat-widget.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `Bạn là trợ lý AI của cửa hàng sách trực tuyến. Nhiệm vụ của bạn là:
- Giúp khách hàng tìm kiếm sách theo thể loại, tác giả, chủ đề
- Tư vấn sách phù hợp với sở thích của khách
- Giải đáp thắc mắc về đơn hàng, vận chuyển, thanh toán
- Giới thiệu các sách nổi bật, bestseller
- Hỗ trợ khách hàng một cách thân thiện và nhiệt tình

Hãy trả lời ngắn gọn, rõ ràng bằng tiếng Việt. Nếu không biết thông tin cụ thể, hãy hướng dẫn khách liên hệ nhân viên hỗ trợ.`;

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
          content: "Xin chào! 👋 Tôi là trợ lý AI của cửa hàng sách. Tôi có thể giúp bạn tìm sách, tư vấn thể loại, hoặc giải đáp thắc mắc. Bạn cần hỗ trợ gì?",
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
      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...newMessages.map((m) => ({ role: m.role, content: m.content })),
          ],
          max_tokens: 512,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        throw new Error(`Groq API error: ${res.status}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? "Xin lỗi, tôi không thể trả lời lúc này.";

      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "⚠️ Có lỗi xảy ra khi kết nối AI. Vui lòng thử lại sau.",
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
                  <span /><span /><span />
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
