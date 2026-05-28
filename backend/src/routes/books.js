/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      books.js
 * Mục đích:      Định tuyến các API liên quan đến sách — bao gồm các endpoint
 *                công khai để duyệt/tìm kiếm sách và các endpoint admin để quản lý.
 * Các chức năng chính:
 *   - GET  /books/latest          : Lấy sách mới nhất
 *   - GET  /books/featured        : Lấy sách đang giảm giá
 *   - GET  /books/bestsellers     : Lấy sách bán chạy nhất (tính từ order_items)
 *   - GET  /books                 : Tìm kiếm và lọc sách với nhiều tiêu chí
 *   - GET  /books/:bookId         : Lấy chi tiết một cuốn sách
 *   - POST   /admin/books         : Tạo sách mới (admin)
 *   - PATCH  /admin/books/:bookId : Cập nhật thông tin sách (admin)
 *   - DELETE /admin/books/:bookId : Xóa sách (admin)
 *
 * Tên module:    Book Management
 * Module liên quan: supabase.js, auth/verify.js, http/errors.js
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       Các endpoint công khai hỗ trợ cả user đã đăng nhập (dùng JWT)
 *                và khách vãng lai (dùng anon key) để RLS hoạt động đúng.
 * ============================================================================
 */

import express from "express";
import { createSupabaseAnon, createSupabaseUser } from "../supabase.js";
import { requireUser } from "../auth/verify.js";
import { assert } from "../http/errors.js";
import { z } from "zod";

export const booksRouter = express.Router();

/**
 * Lấy danh sách sách mới nhất (sắp xếp theo ngày tạo giảm dần).
 * Hỗ trợ cả user đã đăng nhập và khách vãng lai.
 *
 * @route   GET /books/latest
 * @access  Public
 * @async
 * @param {import("express").Request} req - Query params: `limit` (mặc định 10, tối đa 50).
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ items: Book[] }`.
 * @throws {HttpError} 400 nếu truy vấn database thất bại.
 */
booksRouter.get("/books/latest", async (req, res) => {
  // Giới hạn tối đa 50 để tránh query quá lớn
  const limit = Math.min(Number(req.query.limit || 10), 50);
  const jwt = (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = jwt ? createSupabaseUser(jwt) : createSupabaseAnon();
  const { data, error } = await sb
    .from("books")
    .select("*, categories(*)")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  assert(!error, 400, "Failed to fetch latest books", "books_fetch_failed", error?.message);
  res.json({ items: data });
});

/**
 * Lấy danh sách sách đang giảm giá (is_on_sale = true và có sale_price > 0).
 *
 * @route   GET /books/featured
 * @access  Public
 * @async
 * @param {import("express").Request} req - Query params: `limit` (mặc định 12, tối đa 50).
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ items: Book[] }`.
 * @throws {HttpError} 400 nếu truy vấn database thất bại.
 */
booksRouter.get("/books/featured", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 12), 50);
  const jwt = (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = jwt ? createSupabaseUser(jwt) : createSupabaseAnon();
  const { data, error } = await sb
    .from("books")
    .select("*, categories(*)")
    .eq("is_published", true)
    .eq("is_on_sale", true)
    .not("sale_price", "is", null)
    .gt("sale_price", 0)
    .order("created_at", { ascending: false })
    .limit(limit);
  assert(!error, 400, "Failed to fetch featured books", "books_fetch_failed", error?.message);
  res.json({ items: data || [] });
});

/**
 * Lấy danh sách sách bán chạy nhất, tính dựa trên tổng số lượng đã bán trong order_items.
 * Nếu chưa có dữ liệu bán hàng, fallback về sách mới nhất.
 *
 * @route   GET /books/bestsellers
 * @access  Public
 * @async
 * @param {import("express").Request} req - Query params: `limit` (mặc định 10, tối đa 50).
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ items: Book[] }` sắp xếp theo số lượng bán giảm dần.
 * @throws {HttpError} 400 nếu truy vấn database thất bại.
 */
booksRouter.get("/books/bestsellers", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 10), 50);
  const jwt = (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = jwt ? createSupabaseUser(jwt) : createSupabaseAnon();

  // Lấy tối đa 500 order_items gần nhất để tính tổng số lượng bán theo book_id
  const { data: topItems, error: topErr } = await sb
    .from("order_items")
    .select("book_id, quantity")
    .limit(500);

  assert(!topErr, 400, "Failed to fetch bestsellers", "bestsellers_fetch_failed", topErr?.message);

  // Tổng hợp số lượng bán theo từng book_id bằng Map
  const countMap = {};
  for (const row of topItems || []) {
    countMap[row.book_id] = (countMap[row.book_id] || 0) + row.quantity;
  }
  // Sắp xếp giảm dần theo tổng số lượng và lấy top N book_id
  const topBookIds = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  // Fallback: nếu chưa có đơn hàng nào, trả về sách mới nhất
  if (topBookIds.length === 0) {
    const { data: fallback } = await sb
      .from("books")
      .select("*, categories(*)")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    return res.json({ items: fallback || [] });
  }

  const { data: books, error: bErr } = await sb
    .from("books")
    .select("*, categories(*)")
    .in("book_id", topBookIds)
    .eq("is_published", true);

  assert(!bErr, 400, "Failed to fetch bestseller books", "books_fetch_failed", bErr?.message);

  // Sắp xếp lại kết quả theo đúng thứ tự topBookIds (DB không đảm bảo thứ tự khi dùng .in())
  const sorted = topBookIds
    .map(id => (books || []).find(b => b.book_id === id))
    .filter(Boolean);

  res.json({ items: sorted });
});

/**
 * Tìm kiếm và lọc danh sách sách với nhiều tiêu chí.
 * Hỗ trợ tìm theo tiêu đề, tác giả, mã sách, nhà xuất bản, thể loại, năm xuất bản.
 *
 * @route   GET /books
 * @access  Public
 * @async
 * @param {import("express").Request} req - Query params:
 *   - `search`      : Từ khóa tìm kiếm
 *   - `searchBy`    : Trường tìm kiếm (all | title | author | category_id | publish_year | ...)
 *   - `sort`        : Sắp xếp theo dạng "field-asc" hoặc "field-desc"
 *   - `category_id` : Lọc chính xác theo mã thể loại
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ items: Book[] }` tối đa 200 kết quả.
 * @throws {HttpError} 400 nếu truy vấn database thất bại.
 */
booksRouter.get("/books", async (req, res) => {
  const search = (req.query.search || "").toString().trim();
  const searchBy = (req.query.searchBy || "all").toString();
  const sort = (req.query.sort || "").toString();
  const categoryId = (req.query.category_id || "").toString().trim();

  const jwt = (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = jwt ? createSupabaseUser(jwt) : createSupabaseAnon();

  // Dùng categories!inner để bắt buộc JOIN — loại bỏ sách không có thể loại
  let q = sb.from("books").select("*, categories!inner(*)");

  // Filter chính xác theo category_id nếu có
  if (categoryId) {
    q = q.eq("category_id", categoryId);
  }

  if (search) {
    if (searchBy === "all") {
      q = q.or(`title.ilike.%${search}%,author.ilike.%${search}%,book_id.ilike.%${search}%,publisher.ilike.%${search}%`);
    } else if (searchBy === "category_id") {
      q = q.or(`category_id.ilike.%${search}%,categories.name.ilike.%${search}%`);
    } else if (searchBy === "publish_year") {
      const year = Number(search);
      if (!isNaN(year)) q = q.eq("publish_year", year);
    } else {
      q = q.ilike(searchBy, `%${search}%`);
    }
  }

  if (sort) {
    const [field, dir] = sort.split("-");
    if (field === "category_id") {
      // Sắp xếp theo tên thể loại thay vì mã thể loại để có ý nghĩa hơn
      q = q.order("categories(name)", { ascending: dir === "asc" });
    } else {
      q = q.order(field, { ascending: dir === "asc" });
    }
  } else {
    q = q.order("created_at", { ascending: false });
  }

  const { data, error } = await q.limit(200);
  assert(!error, 400, "Failed to fetch books", "books_fetch_failed", error?.message);
  res.json({ items: data });
});

/**
 * Lấy thông tin chi tiết của một cuốn sách theo book_id.
 *
 * @route   GET /books/:bookId
 * @access  Public
 * @async
 * @param {import("express").Request} req - Route param: `bookId`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ item: Book }`.
 * @throws {HttpError} 400 nếu truy vấn thất bại, 404 nếu không tìm thấy sách.
 */
booksRouter.get("/books/:bookId", async (req, res) => {
  const jwt = (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = jwt ? createSupabaseUser(jwt) : createSupabaseAnon();
  const { data, error } = await sb
    .from("books")
    .select("*, categories(*)")
    .eq("book_id", req.params.bookId)
    .maybeSingle();
  assert(!error, 400, "Failed to fetch book", "book_fetch_failed", error?.message);
  assert(data, 404, "Book not found", "not_found");
  res.json({ item: data });
});

/**
 * Tạo một cuốn sách mới (chỉ admin).
 *
 * @route   POST /admin/books
 * @access  Private (admin)
 * @async
 * @param {import("express").Request} req - Request body chứa đầy đủ thông tin sách.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} HTTP 201 với JSON `{ item: Book }`.
 * @throws {HttpError} 403 nếu không phải admin, 400 nếu validation thất bại hoặc lỗi DB.
 */
booksRouter.post("/admin/books", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);
  const schema = z.object({
    book_id: z.string().min(1, "Mã sách không được để trống."),
    title: z.string().min(1, "Tên sách không được để trống."),
    author: z.string().min(1, "Tác giả không được để trống."),
    publisher: z.string().optional().nullable(),
    isbn: z.string().optional().nullable(),
    category_id: z.string().min(1, "Mã thể loại không được để trống."),
    price: z.number({ invalid_type_error: "Giá tiền phải là số." }).nonnegative("Giá tiền không được âm."),
    sale_price: z.number({ invalid_type_error: "Giá khuyến mãi phải là số." }).nonnegative("Giá khuyến mãi không được âm.").optional().nullable(),
    description: z.string().optional().nullable(),
    slug: z.string().optional().nullable(),
    is_published: z.boolean().optional(),
    publish_year: z.number({ invalid_type_error: "Năm xuất bản phải là số." }).int("Năm xuất bản phải là số nguyên."),
    quantity: z.number({ invalid_type_error: "Số lượng phải là số." }).int("Số lượng phải là số nguyên.").nonnegative("Số lượng không được âm."),
    location: z.string().optional().nullable(),
    image_url: z.string().optional().nullable(),
    is_on_sale: z.boolean().optional()
  });
  const body = schema.parse(req.body ?? {});

  // Kiểm tra sách trùng lặp (trùng Tiêu đề + Tác giả + Nhà xuất bản)
  const { data: existing } = await sb
    .from("books")
    .select("book_id")
    .ilike("title", body.title.trim())
    .ilike("author", body.author.trim())
    .ilike("publisher", (body.publisher || "").trim())
    .maybeSingle();
  assert(!existing, 400, "Sách này đã tồn tại trong hệ thống (trùng Tên sách, Tác giả và Nhà xuất bản)!", "book_duplicate");

  const { data, error } = await sb.from("books").insert(body).select("*").maybeSingle();
  assert(!error, 400, "Lỗi tạo sách", "book_create_failed", error?.message);
  res.status(201).json({ item: data });
});

/**
 * Cập nhật thông tin một cuốn sách (chỉ admin).
 * Chỉ cập nhật các trường được gửi lên (partial update).
 *
 * @route   PATCH /admin/books/:bookId
 * @access  Private (admin)
 * @async
 * @param {import("express").Request} req - Route param: `bookId`. Body chứa các trường cần cập nhật.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ item: Book }` với dữ liệu đã cập nhật.
 * @throws {HttpError} 403 nếu không phải admin, 400 nếu validation thất bại hoặc lỗi DB.
 */
booksRouter.patch("/admin/books/:bookId", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);

  const schema = z.object({
    title: z.string().min(1, "Tên sách không được để trống.").optional(),
    author: z.string().min(1, "Tác giả không được để trống.").optional(),
    publisher: z.string().optional().nullable(),
    isbn: z.string().optional().nullable(),
    category_id: z.string().optional(),
    price: z.number({ invalid_type_error: "Giá tiền phải là số." }).nonnegative("Giá tiền không được âm.").optional(),
    sale_price: z.number({ invalid_type_error: "Giá khuyến mãi phải là số." }).nonnegative("Giá khuyến mãi không được âm.").optional().nullable(),
    description: z.string().optional().nullable(),
    slug: z.string().optional().nullable(),
    is_published: z.boolean().optional(),
    publish_year: z.number({ invalid_type_error: "Năm xuất bản phải là số." }).int("Năm xuất bản phải là số nguyên.").optional(),
    quantity: z.number({ invalid_type_error: "Số lượng phải là số." }).int("Số lượng phải là số nguyên.").nonnegative("Số lượng không được âm.").optional(),
    location: z.string().optional().nullable(),
    image_url: z.string().optional().nullable(),
    is_on_sale: z.boolean().optional()
  });
  const body = schema.parse(req.body ?? {});

  // Nếu cập nhật các thông tin định danh sách, kiểm tra xem có trùng lặp không
  if (body.title || body.author || body.publisher !== undefined) {
    const { data: currentBook } = await sb
      .from("books")
      .select("title, author, publisher")
      .eq("book_id", req.params.bookId)
      .single();

    if (currentBook) {
      const titleToCheck = body.title !== undefined ? body.title : currentBook.title;
      const authorToCheck = body.author !== undefined ? body.author : currentBook.author;
      const publisherToCheck = body.publisher !== undefined ? body.publisher : currentBook.publisher;

      const { data: existing } = await sb
        .from("books")
        .select("book_id")
        .ilike("title", (titleToCheck || "").trim())
        .ilike("author", (authorToCheck || "").trim())
        .ilike("publisher", (publisherToCheck || "").trim())
        .neq("book_id", req.params.bookId)
        .maybeSingle();
      assert(!existing, 400, "Sách này đã tồn tại trong hệ thống (trùng Tên sách, Tác giả và Nhà xuất bản)!", "book_duplicate");
    }
  }

  const { data, error } = await sb
    .from("books")
    .update(body)
    .eq("book_id", req.params.bookId)
    .select("*")
    .maybeSingle();
  assert(!error, 400, "Lỗi cập nhật sách", "book_update_failed", error?.message);
  res.json({ item: data });
});

/**
 * Xóa một cuốn sách khỏi hệ thống (chỉ admin).
 *
 * @route   DELETE /admin/books/:bookId
 * @access  Private (admin)
 * @async
 * @param {import("express").Request} req - Route param: `bookId`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ ok: true }`.
 * @throws {HttpError} 403 nếu không phải admin, 400 nếu lỗi DB.
 */
booksRouter.delete("/admin/books/:bookId", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);
  const { error } = await sb.from("books").delete().eq("book_id", req.params.bookId);
  assert(!error, 400, "Lỗi xóa sách", "book_delete_failed", error?.message);
  res.json({ ok: true });
});
