import express from "express";
import { z } from "zod";
import { requireUser } from "../auth/verify.js";
import { createSupabaseAdmin } from "../supabase.js";
import { assert } from "../http/errors.js";

export const reviewsRouter = express.Router();

// Helper: gắn thông tin profile vào danh sách reviews
async function attachProfiles(sb, reviews) {
  if (!reviews || reviews.length === 0) return reviews;
  const userIds = [...new Set(reviews.map(r => r.user_id))];
  const { data: profiles } = await sb
    .from("profiles")
    .select("user_id, username, full_name, avatar_url")
    .in("user_id", userIds);
  const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
  return reviews.map(r => ({ ...r, profiles: profileMap[r.user_id] || null }));
}

// ── GET /books/:bookId/reviews ─────────────────────────────────────────────
reviewsRouter.get("/books/:bookId/reviews", async (req, res) => {
  const sb = createSupabaseAdmin();
  const { bookId } = req.params;
  const page  = Math.max(1, Number(req.query.page  || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
  const from  = (page - 1) * limit;

  const { data, error, count } = await sb
    .from("reviews")
    .select("id, rating, comment, created_at, updated_at, user_id", { count: "exact" })
    .eq("book_id", bookId)
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  assert(!error, 400, "Lỗi tải đánh giá", "reviews_fetch_failed", error?.message);

  // Tính điểm trung bình + phân phối
  const { data: stats } = await sb
    .from("reviews")
    .select("rating")
    .eq("book_id", bookId);

  const avgRating = stats && stats.length > 0
    ? stats.reduce((s, r) => s + r.rating, 0) / stats.length
    : 0;

  const distribution = [1, 2, 3, 4, 5].map(star => ({
    star,
    count: stats ? stats.filter(r => r.rating === star).length : 0,
  }));

  const items = await attachProfiles(sb, data || []);

  res.json({
    items,
    total: count || 0,
    page,
    limit,
    avgRating: Math.round(avgRating * 10) / 10,
    totalRatings: stats?.length || 0,
    distribution,
  });
});

// ── GET /books/:bookId/reviews/me ──────────────────────────────────────────
reviewsRouter.get("/books/:bookId/reviews/me", requireUser, async (req, res) => {
  const sb = createSupabaseAdmin();
  const { bookId } = req.params;
  const userId = req.auth.user.id;

  const { data, error } = await sb
    .from("reviews")
    .select("id, rating, comment, created_at, updated_at, user_id")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .maybeSingle();

  assert(!error, 400, "Lỗi tải đánh giá", "review_fetch_failed", error?.message);

  const item = data ? (await attachProfiles(sb, [data]))[0] : null;
  res.json({ item });
});

// ── POST /books/:bookId/reviews ────────────────────────────────────────────
reviewsRouter.post("/books/:bookId/reviews", requireUser, async (req, res) => {
  const sb = createSupabaseAdmin();
  const { bookId } = req.params;
  const userId = req.auth.user.id;

  const schema = z.object({
    rating:  z.number().int().min(1, "Sao tối thiểu là 1").max(5, "Sao tối đa là 5"),
    comment: z.string().max(2000, "Bình luận tối đa 2000 ký tự").optional().nullable(),
  });

  const body = schema.parse(req.body ?? {});

  // Kiểm tra sách tồn tại
  const { data: book } = await sb.from("books").select("book_id").eq("book_id", bookId).maybeSingle();
  assert(book, 404, "Sách không tồn tại", "book_not_found");

  // Upsert
  const { data, error } = await sb
    .from("reviews")
    .upsert(
      {
        book_id:    bookId,
        user_id:    userId,
        rating:     body.rating,
        comment:    body.comment ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "book_id,user_id" }
    )
    .select("id, rating, comment, created_at, updated_at, user_id")
    .maybeSingle();

  assert(!error, 400, "Lỗi lưu đánh giá", "review_save_failed", error?.message);

  const item = data ? (await attachProfiles(sb, [data]))[0] : null;
  res.status(201).json({ item });
});

// ── DELETE /books/:bookId/reviews/me ──────────────────────────────────────
reviewsRouter.delete("/books/:bookId/reviews/me", requireUser, async (req, res) => {
  const sb = createSupabaseAdmin();
  const { bookId } = req.params;
  const userId = req.auth.user.id;

  const { error } = await sb
    .from("reviews")
    .delete()
    .eq("book_id", bookId)
    .eq("user_id", userId);

  assert(!error, 400, "Lỗi xóa đánh giá", "review_delete_failed", error?.message);
  res.json({ ok: true });
});

// ── DELETE /admin/reviews/:reviewId ───────────────────────────────────────
reviewsRouter.delete("/admin/reviews/:reviewId", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseAdmin();

  const { error } = await sb
    .from("reviews")
    .delete()
    .eq("id", req.params.reviewId);

  assert(!error, 400, "Lỗi xóa đánh giá", "review_delete_failed", error?.message);
  res.json({ ok: true });
});
