import express from "express";
import { createSupabaseAnon, createSupabaseUser } from "../supabase.js";
import { requireUser } from "../auth/verify.js";
import { assert } from "../http/errors.js";
import { z } from "zod";

export const categoriesRouter = express.Router();

categoriesRouter.get("/categories", async (req, res) => {
  const search = (req.query.search || "").toString().trim();
  const searchBy = (req.query.searchBy || "all").toString();
  const sort = (req.query.sort || "").toString();

  const jwt = (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = jwt ? createSupabaseUser(jwt) : createSupabaseAnon();

  let q = sb.from("categories").select("*");

  if (search) {
    if (searchBy === "all") {
      q = q.or(`category_id.ilike.%${search}%,name.ilike.%${search}%`);
    } else {
      q = q.ilike(searchBy, `%${search}%`);
    }
  }

  if (sort) {
    const [field, dir] = sort.split("-");
    q = q.order(field, { ascending: dir === "asc" });
  } else {
    q = q.order("name", { ascending: true });
  }

  const { data, error } = await q;
  assert(!error, 400, "Failed to fetch categories", "categories_fetch_failed", error?.message);
  res.json({ items: data });
});

categoriesRouter.post("/admin/categories", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);
  const schema = z.object({
    category_id: z.string().min(1, "Mã thể loại không được để trống."),
    name: z.string().min(1, "Tên thể loại không được để trống."),
    description: z.string().optional().nullable()
  });
  const body = schema.parse(req.body ?? {});

  const { data, error } = await sb.from("categories").insert(body).select("*").maybeSingle();
  assert(!error, 400, "Lỗi tạo thể loại", "category_create_failed", error?.message);
  res.status(201).json({ item: data });
});

categoriesRouter.patch("/admin/categories/:categoryId", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);

  const schema = z.object({
    name: z.string().min(1, "Tên thể loại không được để trống.").optional(),
    description: z.string().optional().nullable()
  });
  const body = schema.parse(req.body ?? {});

  const { data, error } = await sb
    .from("categories")
    .update(body)
    .eq("category_id", req.params.categoryId)
    .select("*")
    .maybeSingle();
  assert(!error, 400, "Lỗi cập nhật thể loại", "category_update_failed", error?.message);
  res.json({ item: data });
});

categoriesRouter.delete("/admin/categories/:categoryId", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);
  const { error } = await sb.from("categories").delete().eq("category_id", req.params.categoryId);
  assert(!error, 400, "Lỗi xóa thể loại", "category_delete_failed", error?.message);
  res.json({ ok: true });
});

