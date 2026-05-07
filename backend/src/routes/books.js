/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: books.js
 * Mục đích của file: Quản lý các endpoint liên quan đến dữ liệu Sách (Books).
 * Các chức năng chính: Lấy danh sách sách (mới nhất, nổi bật, bán chạy, tất cả), lấy chi tiết sách, và các thao tác CRUD dành cho Admin.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Books API Route
 * Mục đích của module: Định tuyến và xử lý logic truy xuất dữ liệu sách.
 * Phạm vi xử lý: Public API cho người dùng (có hoặc không có JWT) và Admin API (bắt buộc role admin).
 * Các thành phần chính trong module: Express Router, Supabase query builder.
 * Module liên quan: verify.js (Xác thực quyền admin), categories.js (Thể loại).
 * ============================================================================
 */
import express from "express";
import { createSupabaseAnon, createSupabaseUser } from "../supabase.js";
import { requireUser } from "../auth/verify.js";
import { assert } from "../http/errors.js";
import { z } from "zod";

export const booksRouter = express.Router(); // Ý nghĩa: Router chứa các endpoint quản lý sách; Giá trị: Express Router instance

/**
 * Tên function: GET /books/latest
 * Mục đích của function: Lấy danh sách sách mới xuất bản (sắp xếp theo ngày tạo mới nhất).
 * Tham số đầu vào: req (query: `limit`), res
 * Giá trị trả về: JSON `{ items: Array }`
 * Điều kiện xử lý: Sách phải có trạng thái `is_published = true`.
 * Lỗi có thể phát sinh: 400 nếu lỗi truy vấn DB.
 */
booksRouter.get("/books/latest", async (req, res) => {
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
 * Tên function: GET /books/featured
 * Mục đích của function: Lấy danh sách sách nổi bật (sách đang giảm giá).
 * Tham số đầu vào: req (query: `limit`), res
 * Giá trị trả về: JSON `{ items: Array }`
 * Điều kiện xử lý: Sách phải `is_published = true`, `is_on_sale = true` và có `sale_price > 0`.
 * Lỗi có thể phát sinh: 400 nếu lỗi truy vấn DB.
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
 * Tên function: GET /books/bestsellers
 * Mục đích của function: Lấy danh sách sách bán chạy nhất dựa trên số lượng đã bán.
 * Tham số đầu vào: req (query: `limit`), res
 * Giá trị trả về: JSON `{ items: Array }`
 * Điều kiện xử lý: Tính tổng số lượng từ `order_items`. Nếu chưa có đơn hàng nào, fallback về sách mới nhất.
 * Lỗi có thể phát sinh: 400 nếu lỗi truy vấn DB.
 */
booksRouter.get("/books/bestsellers", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 10), 50);
  const jwt = (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = jwt ? createSupabaseUser(jwt) : createSupabaseAnon();

  const { data: topItems, error: topErr } = await sb
    .from("order_items")
    .select("book_id, quantity")
    .limit(500);

  assert(!topErr, 400, "Failed to fetch bestsellers", "bestsellers_fetch_failed", topErr?.message);

  const countMap = {};
  for (const row of topItems || []) {
    countMap[row.book_id] = (countMap[row.book_id] || 0) + row.quantity;
  }
  const topBookIds = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

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

  const sorted = topBookIds
    .map(id => (books || []).find(b => b.book_id === id))
    .filter(Boolean);

  res.json({ items: sorted });
});

/**
 * Tên function: GET /books
 * Mục đích của function: Lấy danh sách sách kèm theo tính năng tìm kiếm, lọc theo thể loại và sắp xếp.
 * Tham số đầu vào: req (query: `search`, `searchBy`, `sort`, `category_id`), res
 * Giá trị trả về: JSON `{ items: Array }`
 * Điều kiện xử lý: Hỗ trợ tìm kiếm theo nhiều tiêu chí (tất cả, ID thể loại, năm XB).
 * Lỗi có thể phát sinh: 400 nếu lỗi truy vấn DB.
 */
booksRouter.get("/books", async (req, res) => {
  const search = (req.query.search || "").toString().trim();
  const searchBy = (req.query.searchBy || "all").toString();
  const sort = (req.query.sort || "").toString();
  const categoryId = (req.query.category_id || "").toString().trim();

  const jwt = (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = jwt ? createSupabaseUser(jwt) : createSupabaseAnon();

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
 * Tên function: GET /books/:bookId
 * Mục đích của function: Lấy thông tin chi tiết của một cuốn sách.
 * Tham số đầu vào: req (params: `bookId`), res
 * Giá trị trả về: JSON `{ item: Object }`
 * Điều kiện xử lý: Left join với bảng categories.
 * Lỗi có thể phát sinh: 400 (Lỗi DB), 404 (Không tìm thấy sách).
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

// ============================================================================
// ADMIN CRUD (BASIC)
// ============================================================================

/**
 * Tên function: POST /admin/books
 * Mục đích của function: Tạo mới một cuốn sách (Dành cho Admin).
 * Tham số đầu vào: req (body chứa thông tin sách), res
 * Giá trị trả về: JSON báo thành công.
 * Điều kiện xử lý: Validate Zod, người dùng phải có quyền admin.
 * Lỗi có thể phát sinh: 403 (Không phải admin), 400 (Lỗi validate, lỗi tạo mới).
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

  const { data, error } = await sb.from("books").insert(body).select("*").maybeSingle();
  assert(!error, 400, "Lỗi tạo sách", "book_create_failed", error?.message);
  res.status(201).json({ item: data });
});

/**
 * Tên function: PATCH /admin/books/:bookId
 * Mục đích của function: Cập nhật thông tin của một cuốn sách (Dành cho Admin).
 * Tham số đầu vào: req (params: `bookId`, body), res
 * Giá trị trả về: JSON báo thành công.
 * Điều kiện xử lý: Validate Zod các trường truyền lên, quyền admin.
 * Lỗi có thể phát sinh: 403 (Không phải admin), 400 (Lỗi validate, lỗi update).
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
 * Tên function: DELETE /admin/books/:bookId
 * Mục đích của function: Xóa một cuốn sách khỏi cơ sở dữ liệu (Dành cho Admin).
 * Tham số đầu vào: req (params: `bookId`), res
 * Giá trị trả về: JSON `{ ok: true }`
 * Điều kiện xử lý: Quyền admin.
 * Lỗi có thể phát sinh: 403 (Không có quyền), 400 (Lỗi xóa, ví dụ đang có đơn hàng liên kết).
 */
booksRouter.delete("/admin/books/:bookId", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);
  const { error } = await sb.from("books").delete().eq("book_id", req.params.bookId);
  assert(!error, 400, "Lỗi xóa sách", "book_delete_failed", error?.message);
  res.json({ ok: true });
});

