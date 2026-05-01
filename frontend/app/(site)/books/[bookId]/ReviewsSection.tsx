"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { getAvatarUrl } from "@/lib/avatar";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReviewProfile {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

interface Review {
  id: number;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;
  profiles: ReviewProfile;
}

interface ReviewsData {
  items: Review[];
  total: number;
  page: number;
  limit: number;
  avgRating: number;
  totalRatings: number;
  distribution: { star: number; count: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StarDisplay({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <i
          key={s}
          className={s <= rating ? "fas fa-star" : s - 0.5 <= rating ? "fas fa-star-half-alt" : "far fa-star"}
          style={{ color: s <= rating ? "#f59e0b" : "#d1d5db", fontSize: size }}
        />
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span style={{ display: "inline-flex", gap: 4, cursor: "pointer" }}>
      {[1, 2, 3, 4, 5].map(s => (
        <i
          key={s}
          className={(hover || value) >= s ? "fas fa-star" : "far fa-star"}
          style={{ color: (hover || value) >= s ? "#f59e0b" : "#d1d5db", fontSize: 28, transition: "color 0.1s" }}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
        />
      ))}
    </span>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} tháng trước`;
  return `${Math.floor(mo / 12)} năm trước`;
}

const STAR_LABELS = ["", "Rất tệ", "Tệ", "Bình thường", "Tốt", "Xuất sắc"];

// ─── Main Component ───────────────────────────────────────────────────────────
export function ReviewsSection({ bookId }: { bookId: string }) {
  const [data, setData]           = useState<ReviewsData | null>(null);
  const [myReview, setMyReview]   = useState<Review | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage]           = useState(1);

  // Form state
  const [formRating,  setFormRating]  = useState(0);
  const [formComment, setFormComment] = useState("");
  const [isEditing,   setIsEditing]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Check login
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
  }, []);

  // Load reviews + my review
  const loadReviews = useCallback(async (p = 1) => {
    setIsLoading(true);
    try {
      const [reviewsRes, myRes] = await Promise.allSettled([
        apiFetch<ReviewsData>(`/books/${bookId}/reviews?page=${p}&limit=5`),
        isLoggedIn
          ? apiFetch<{ item: Review | null }>(`/books/${bookId}/reviews/me`)
          : Promise.resolve({ item: null }),
      ]);

      if (reviewsRes.status === "fulfilled") setData(reviewsRes.value);
      if (myRes.status === "fulfilled" && myRes.value.item) {
        setMyReview(myRes.value.item);
        // Pre-fill form nếu đã có review
        setFormRating(myRes.value.item.rating);
        setFormComment(myRes.value.item.comment || "");
      }
    } finally {
      setIsLoading(false);
    }
  }, [bookId, isLoggedIn]);

  useEffect(() => { loadReviews(page); }, [loadReviews, page]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formRating === 0) { setFormError("Vui lòng chọn số sao."); return; }
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await apiFetch(`/books/${bookId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating: formRating, comment: formComment.trim() || null }),
      });
      setFormSuccess(myReview ? "Đã cập nhật đánh giá!" : "Cảm ơn bạn đã đánh giá!");
      setIsEditing(false);
      await loadReviews(1);
      setPage(1);
    } catch (err: any) {
      setFormError(err.message || "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Xóa đánh giá của bạn?")) return;
    try {
      await apiFetch(`/books/${bookId}/reviews/me`, { method: "DELETE" });
      setMyReview(null);
      setFormRating(0);
      setFormComment("");
      setFormSuccess(null);
      await loadReviews(1);
      setPage(1);
    } catch (err: any) {
      setFormError(err.message || "Có lỗi xảy ra.");
    }
  }

  const totalPages = data ? Math.ceil(data.total / 5) : 1;

  return (
    <div className="rv-wrap">

      {/* ── Summary ── */}
      {data && data.totalRatings > 0 && (
        <div className="rv-summary">
          <div className="rv-avg-block">
            <div className="rv-avg-number">{data.avgRating.toFixed(1)}</div>
            <StarDisplay rating={data.avgRating} size={20} />
            <div className="rv-avg-sub">{data.totalRatings} đánh giá</div>
          </div>
          <div className="rv-distribution">
            {[5, 4, 3, 2, 1].map(star => {
              const d = data.distribution.find(x => x.star === star);
              const pct = data.totalRatings > 0 ? ((d?.count || 0) / data.totalRatings) * 100 : 0;
              return (
                <div key={star} className="rv-dist-row">
                  <span className="rv-dist-label">{star} <i className="fas fa-star" style={{ color: "#f59e0b", fontSize: 11 }} /></span>
                  <div className="rv-dist-bar-wrap">
                    <div className="rv-dist-bar" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="rv-dist-count">{d?.count || 0}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── My review / Form ── */}
      {isLoggedIn ? (
        <div className="rv-my-section">
          {myReview && !isEditing ? (
            // Hiển thị review của mình
            <div className="rv-my-card">
              <div className="rv-my-header">
                <span className="rv-my-label"><i className="fas fa-user-check" /> Đánh giá của bạn</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="rv-edit-btn" onClick={() => setIsEditing(true)}>
                    <i className="fas fa-pen" /> Sửa
                  </button>
                  <button className="rv-delete-btn" onClick={handleDelete}>
                    <i className="fas fa-trash" /> Xóa
                  </button>
                </div>
              </div>
              <StarDisplay rating={myReview.rating} size={18} />
              <span className="rv-star-label">{STAR_LABELS[myReview.rating]}</span>
              {myReview.comment && <p className="rv-my-comment">{myReview.comment}</p>}
              <div className="rv-time">{timeAgo(myReview.updated_at)}</div>
              {formSuccess && <div className="rv-success">{formSuccess}</div>}
            </div>
          ) : (
            // Form viết/sửa đánh giá
            <form className="rv-form" onSubmit={handleSubmit}>
              <div className="rv-form-title">
                {myReview ? "Chỉnh sửa đánh giá" : "Viết đánh giá của bạn"}
              </div>
              <div className="rv-form-stars">
                <StarPicker value={formRating} onChange={setFormRating} />
                {formRating > 0 && (
                  <span className="rv-star-label">{STAR_LABELS[formRating]}</span>
                )}
              </div>
              <textarea
                className="rv-textarea"
                placeholder="Chia sẻ cảm nhận của bạn về cuốn sách này... (không bắt buộc)"
                value={formComment}
                onChange={e => setFormComment(e.target.value)}
                rows={4}
                maxLength={2000}
              />
              <div className="rv-char-count">{formComment.length}/2000</div>
              {formError   && <div className="rv-error">{formError}</div>}
              {formSuccess  && <div className="rv-success">{formSuccess}</div>}
              <div className="rv-form-actions">
                <button type="submit" className="rv-submit-btn" disabled={submitting || formRating === 0}>
                  {submitting ? <><i className="fas fa-spinner fa-spin" /> Đang lưu...</> : <><i className="fas fa-paper-plane" /> {myReview ? "Cập nhật" : "Gửi đánh giá"}</>}
                </button>
                {myReview && (
                  <button type="button" className="rv-cancel-btn" onClick={() => { setIsEditing(false); setFormError(null); }}>
                    Hủy
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="rv-login-prompt">
          <i className="fas fa-star" style={{ color: "#f59e0b", fontSize: 24, marginBottom: 8 }} />
          <p>Đăng nhập để viết đánh giá</p>
          <a href="/auth" className="rv-login-link">Đăng nhập ngay</a>
        </div>
      )}

      <div className="rv-divider" />

      {/* ── Reviews list ── */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af" }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }} />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="rv-empty">
          <i className="far fa-comment-dots" style={{ fontSize: 40, opacity: 0.3, marginBottom: 12 }} />
          <p>Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
        </div>
      ) : (
        <>
          <div className="rv-list">
            {data.items.map(r => (
              <div key={r.id} className="rv-item">
                <div className="rv-item-avatar">
                  {r.profiles?.avatar_url ? (
                    <img src={getAvatarUrl(r.profiles.avatar_url)} alt={r.profiles.full_name} />
                  ) : (
                    <div className="rv-avatar-placeholder">
                      {(r.profiles?.full_name || r.profiles?.username || "?")[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="rv-item-body">
                  <div className="rv-item-header">
                    <span className="rv-item-name">{r.profiles?.full_name || r.profiles?.username || "Ẩn danh"}</span>
                    <span className="rv-time">{timeAgo(r.created_at)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <StarDisplay rating={r.rating} size={14} />
                    <span className="rv-star-label" style={{ fontSize: "0.78rem" }}>{STAR_LABELS[r.rating]}</span>
                  </div>
                  {r.comment && <p className="rv-item-comment">{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="rv-pagination">
              <button className="rv-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <i className="fas fa-chevron-left" />
              </button>
              <span className="rv-page-info">{page} / {totalPages}</span>
              <button className="rv-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
