/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: reviews.js
 * Mục đích của file: Quản lý API đánh giá (review) sách của người dùng.
 * Các chức năng chính: Lấy danh sách đánh giá của 1 sách, lấy đánh giá của user hiện tại, viết/sửa đánh giá, xóa đánh giá.
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Reviews API Route
 * Mục đích của module: Xử lý tương tác đánh giá (rating/comment) sản phẩm.
 * Phạm vi xử lý: Public (lấy danh sách) và Private (viết đánh giá, xóa).
 * Các thành phần chính trong module: Express Router, Supabase Admin client, logic tính điểm trung bình.
 * Module liên quan: verify.js (Xác thực user), supabase.js.
 * ============================================================================
 */
import express from "express";
import { z } from "zod";
import { requireUser } from "../auth/verify.js";
import { createSupabaseAdmin } from "../supabase.js";
import { assert } from "../http/errors.js";

export const reviewsRouter = express.Router(); // Ý nghĩa: Router chứa các endpoint quản lý đánh giá sách; Giá trị: Express Router instance

/**
 * Tên function: attachProfiles
 * Mục đích của function: Map dữ liệu người dùng (từ bảng profiles) vào từng review dựa trên user_id.
 * Tham số đầu vào: sb (Supabase Client), reviews (Mảng các đánh giá).
 * Giá trị trả về: Mảng các đánh giá đã được nhúng thêm thuộc tính `profiles`.
 * Điều kiện xử lý: Truy vấn in() một lần lấy tất cả profile, map lại.
 * Lỗi có thể phát sinh: Trả về review với profile=null nếu lỗi.
 */
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

/**
 * Tên function: GET /books/:bookId/reviews
 * Mục đích của function: Lấy danh sách đánh giá, kèm phân trang và thống kê điểm số của sách.
 * Tham số đầu vào: req (params: `bookId`, query: `page`, `limit`), res
 * Giá trị trả về: JSON `{ items, total, page, limit, avgRating, totalRatings, distribution }`
 * Điều kiện xử lý: Tính trung bình cộng và đếm phân phối 1-5 sao.
 * Lỗi có thể phát sinh: 400 nếu lỗi truy vấn DB.
 */
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

/**
 * Tên function: GET /books/:bookId/reviews/me
 * Mục đích của function: Lấy review của user hiện tại về một cuốn sách cụ thể.
 * Tham số đầu vào: req (params: `bookId`), res
 * Giá trị trả về: JSON `{ item: Object | null }`
 * Điều kiện xử lý: RequireUser, filter theo user_id.
 * Lỗi có thể phát sinh: 400 nếu lỗi truy vấn.
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
 * Tên function: POST /books/:bookId/reviews
 * Mục đích của function: Viết mới hoặc cập nhật đánh giá sách của user hiện tại.
 * Tham số đầu vào: req (params: `bookId`, body: `rating`, `comment`), res
 * Giá trị trả về: JSON `{ item: Object }`
 * Điều kiện xử lý: Sử dụng upsert (onConflict: book_id, user_id).
 * Lỗi có thể phát sinh: 404 (Sách không tồn tại), 400 (Lỗi validate, lỗi DB).
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

/**
 * Tên function: DELETE /books/:bookId/reviews/me
 * Mục đích của function: Người dùng tự xóa đánh giá của mình về sách.
 * Tham số đầu vào: req (params: `bookId`), res
 * Giá trị trả về: JSON `{ ok: true }`
 * Điều kiện xử lý: Xóa dựa trên book_id và user_id của chính người gửi.
 * Lỗi có thể phát sinh: 400 (Lỗi thao tác DB).
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
 * Tên function: DELETE /admin/reviews/:reviewId
 * Mục đích của function: Admin xóa một đánh giá bất kỳ.
 * Tham số đầu vào: req (params: `reviewId`), res
 * Giá trị trả về: JSON `{ ok: true }`
 * Điều kiện xử lý: Bắt buộc quyền admin.
 * Lỗi có thể phát sinh: 403 (Không phải admin), 400 (Lỗi thao tác DB).
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
