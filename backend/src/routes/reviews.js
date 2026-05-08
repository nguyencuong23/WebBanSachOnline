/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      reviews.js
 * Mục đích:      Định tuyến các API đánh giá sách — xem, tạo/cập nhật và xóa đánh giá.
 *                Mỗi user chỉ được có một đánh giá cho mỗi cuốn sách (upsert).
 * Các chức năng chính:
 *   - GET    /books/:bookId/reviews      : Lấy danh sách đánh giá có phân trang + thống kê
 *   - GET    /books/:bookId/reviews/me   : Lấy đánh giá của user hiện tại cho sách đó
 *   - POST   /books/:bookId/reviews      : Tạo hoặc cập nhật đánh giá (upsert)
 *   - DELETE /books/:bookId/reviews/me   : Xóa đánh giá của user hiện tại
 *   - DELETE /admin/reviews/:reviewId    : Xóa bất kỳ đánh giá nào (admin)
 *
 * Tên module:    Review Management
 * Module liên quan: supabase.js, auth/verify.js, http/errors.js
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import express from "express";
import { z } from "zod";
import { requireUser } from "../auth/verify.js";
import { createSupabaseAdmin } from "../supabase.js";
import { assert } from "../http/errors.js";

export const reviewsRouter = express.Router();

/**
 * Gắn thông tin profile (username, full_name, avatar_url) vào danh sách reviews.
 * Dùng để hiển thị tên và avatar người đánh giá mà không cần join phức tạp.
 *
 * @async
 * @param {import("@supabase/supabase-js").SupabaseClient} sb - Supabase client.
 * @param {Array<{user_id: string}>} reviews - Danh sách review cần gắn profile.
 * @returns {Promise<Array>} Danh sách review đã được gắn thêm trường `profiles`.
 */
async function attachProfiles(sb, reviews) {
  if (!reviews || reviews.length === 0) return reviews;
  // Lấy danh sách user_id duy nhất để tránh query trùng lặp
  const userIds = [...new Set(reviews.map(r => r.user_id))];
  const { data: profiles } = await sb
    .from("profiles")
    .select("user_id, username, full_name, avatar_url")
    .in("user_id", userIds);
  // Tạo Map để tra cứu O(1) thay vì find() O(n) trong vòng lặp
  const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
  return reviews.map(r => ({ ...r, profiles: profileMap[r.user_id] || null }));
}

/**
 * Lấy danh sách đánh giá của một cuốn sách với phân trang.
 * Kèm theo thống kê: điểm trung bình và phân phối số sao (1-5).
 *
 * @route   GET /books/:bookId/reviews
 * @access  Public
 * @async
 * @param {import("express").Request} req - Route param: `bookId`. Query: `page`, `limit`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON gồm `items`, `total`, `page`, `limit`,
 *                          `avgRating`, `totalRatings`, `distribution`.
 * @throws {HttpError} 400 nếu truy vấn database thất bại.
 */
reviewsRouter.get("/books/:bookId/reviews", async (req, res) => {
  const sb = createSupabaseAdmin();
  const { bookId } = req.params;
  // Giới hạn page và limit trong khoảng hợp lệ
  const page  = Math.max(1, Number(req.query.page  || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
  // Tính offset để phân trang: trang 1 bắt đầu từ 0, trang 2 từ limit, v.v.
  const from  = (page - 1) * limit;

  const { data, error, count } = await sb
    .from("reviews")
    .select("id, rating, comment, created_at, updated_at, user_id", { count: "exact" })
    .eq("book_id", bookId)
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  assert(!error, 400, "Lỗi tải đánh giá", "reviews_fetch_failed", error?.message);

  // Lấy tất cả rating để tính thống kê (không phân trang)
  const { data: stats } = await sb
    .from("reviews")
    .select("rating")
    .eq("book_id", bookId);

  // Tính điểm trung bình, làm tròn 1 chữ số thập phân
  const avgRating = stats && stats.length > 0
    ? stats.reduce((s, r) => s + r.rating, 0) / stats.length
    : 0;

  // Phân phối số sao: đếm số lượng đánh giá cho mỗi mức sao từ 1 đến 5
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

/**
 * Lấy đánh giá của người dùng hiện tại cho một cuốn sách cụ thể.
 * Dùng để kiểm tra xem user đã đánh giá chưa và hiển thị đánh giá cũ khi chỉnh sửa.
 *
 * @route   GET /books/:bookId/reviews/me
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Route param: `bookId`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ item: Review | null }`.
 * @throws {HttpError} 400 nếu truy vấn database thất bại.
 */
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

/**
 * Tạo hoặc cập nhật đánh giá của người dùng cho một cuốn sách.
 * Dùng upsert với constraint (book_id, user_id) để đảm bảo mỗi user
 * chỉ có một đánh giá cho mỗi cuốn sách.
 *
 * @route   POST /books/:bookId/reviews
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Route param: `bookId`. Body:
 *   @param {number} req.body.rating   - Số sao (1-5).
 *   @param {string} [req.body.comment] - Nội dung bình luận (tối đa 2000 ký tự).
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} HTTP 201 với JSON `{ item: Review }`.
 * @throws {HttpError} 404 nếu sách không tồn tại.
 * @throws {HttpError} 400 nếu validation thất bại hoặc lỗi DB.
 */
reviewsRouter.post("/books/:bookId/reviews", requireUser, async (req, res) => {
  const sb = createSupabaseAdmin();
  const { bookId } = req.params;
  const userId = req.auth.user.id;

  const schema = z.object({
    rating:  z.number().int().min(1, "Sao tối thiểu là 1").max(5, "Sao tối đa là 5"),
    comment: z.string().max(2000, "Bình luận tối đa 2000 ký tự").optional().nullable(),
  });

  const body = schema.parse(req.body ?? {});

  // Kiểm tra sách tồn tại trước khi cho phép đánh giá
  const { data: book } = await sb.from("books").select("book_id").eq("book_id", bookId).maybeSingle();
  assert(book, 404, "Sách không tồn tại", "book_not_found");

  // Upsert: tạo mới nếu chưa có, cập nhật nếu đã có (dựa trên constraint book_id + user_id)
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

/**
 * Xóa đánh giá của người dùng hiện tại cho một cuốn sách.
 *
 * @route   DELETE /books/:bookId/reviews/me
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Route param: `bookId`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ ok: true }`.
 * @throws {HttpError} 400 nếu lỗi DB.
 */
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

/**
 * Xóa bất kỳ đánh giá nào theo ID (chỉ admin).
 * Dùng để kiểm duyệt nội dung không phù hợp.
 *
 * @route   DELETE /admin/reviews/:reviewId
 * @access  Private (admin)
 * @async
 * @param {import("express").Request} req - Route param: `reviewId`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ ok: true }`.
 * @throws {HttpError} 403 nếu không phải admin, 400 nếu lỗi DB.
 */
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
