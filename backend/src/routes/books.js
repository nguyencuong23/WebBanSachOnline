import express from "express";
import { createSupabaseAnon, createSupabaseUser } from "../supabase.js";
import { requireUser } from "../auth/verify.js";
import { assert } from "../http/errors.js";
import { z } from "zod";

export const booksRouter = express.Router();

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

// GET /books/featured — sách đang giảm giá (is_on_sale = true)
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

// GET /books/bestsellers — sách bán chạy nhất (dựa trên order_items)
booksRouter.get("/books/bestsellers", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 10), 50);
  const jwt = (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = jwt ? createSupabaseUser(jwt) : createSupabaseAnon();

  // Lấy top book_id theo tổng quantity từ order_items
  const { data: topItems, error: topErr } = await sb
    .from("order_items")
    .select("book_id, quantity")
    .limit(500);

  assert(!topErr, 400, "Failed to fetch bestsellers", "bestsellers_fetch_failed", topErr?.message);

  // Tổng hợp số lượng bán theo book_id
  const countMap = {};
  for (const row of topItems || []) {
    countMap[row.book_id] = (countMap[row.book_id] || 0) + row.quantity;
  }
  const topBookIds = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (topBookIds.length === 0) {
    // Fallback: trả về sách mới nhất nếu chưa có đơn hàng nào
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

  // Sắp xếp lại theo thứ tự bán chạy
  const sorted = topBookIds
    .map(id => (books || []).find(b => b.book_id === id))
    .filter(Boolean);

  res.json({ items: sorted });
});

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
      q = q.order("categories(name)", { ascending: dir === "asc" }); // Note: Supabase ordering on joined tables might not work like this perfectly, but we try, else we fallback
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

// Admin CRUD (basic)
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

booksRouter.delete("/admin/books/:bookId", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);
  const { error } = await sb.from("books").delete().eq("book_id", req.params.bookId);
  assert(!error, 400, "Lỗi xóa sách", "book_delete_failed", error?.message);
  res.json({ ok: true });
});

