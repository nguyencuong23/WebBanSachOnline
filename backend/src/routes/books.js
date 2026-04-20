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
    .order("created_at", { ascending: false })
    .limit(limit);
  assert(!error, 400, "Failed to fetch latest books", "books_fetch_failed", error?.message);
  res.json({ items: data });
});

booksRouter.get("/books", async (req, res) => {
  const search = (req.query.search || "").toString().trim();
  const sort = (req.query.sort || "").toString();

  const jwt = (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = jwt ? createSupabaseUser(jwt) : createSupabaseAnon();

  let q = sb.from("books").select("*, categories(*)");
  if (search) {
    // ilike on title/author
    q = q.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
  }

  if (sort === "title_asc") q = q.order("title", { ascending: true });
  else if (sort === "title_desc") q = q.order("title", { ascending: false });
  else q = q.order("created_at", { ascending: false });

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
    book_id: z.string().min(1),
    title: z.string().min(1),
    author: z.string().min(1),
    publisher: z.string().optional().nullable(),
    isbn: z.string().optional().nullable(),
    category_id: z.string().min(1),
    price: z.number().nonnegative(),
    sale_price: z.number().nonnegative().optional().nullable(),
    description: z.string().optional().nullable(),
    slug: z.string().optional().nullable(),
    is_published: z.boolean().optional(),
    publish_year: z.number().int(),
    quantity: z.number().int().nonnegative(),
    location: z.string().optional().nullable(),
    image_url: z.string().optional().nullable()
  });
  const body = schema.parse(req.body ?? {});

  const { data, error } = await sb.from("books").insert(body).select("*").maybeSingle();
  assert(!error, 400, "Failed to create book", "book_create_failed", error?.message);
  res.status(201).json({ item: data });
});

booksRouter.patch("/admin/books/:bookId", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);

  const schema = z.object({
    title: z.string().min(1).optional(),
    author: z.string().min(1).optional(),
    publisher: z.string().optional().nullable(),
    isbn: z.string().optional().nullable(),
    category_id: z.string().optional(),
    price: z.number().nonnegative().optional(),
    sale_price: z.number().nonnegative().optional().nullable(),
    description: z.string().optional().nullable(),
    slug: z.string().optional().nullable(),
    is_published: z.boolean().optional(),
    publish_year: z.number().int().optional(),
    quantity: z.number().int().nonnegative().optional(),
    location: z.string().optional().nullable(),
    image_url: z.string().optional().nullable()
  });
  const body = schema.parse(req.body ?? {});

  const { data, error } = await sb
    .from("books")
    .update(body)
    .eq("book_id", req.params.bookId)
    .select("*")
    .maybeSingle();
  assert(!error, 400, "Failed to update book", "book_update_failed", error?.message);
  res.json({ item: data });
});

booksRouter.delete("/admin/books/:bookId", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);
  const { error } = await sb.from("books").delete().eq("book_id", req.params.bookId);
  assert(!error, 400, "Failed to delete book", "book_delete_failed", error?.message);
  res.json({ ok: true });
});

