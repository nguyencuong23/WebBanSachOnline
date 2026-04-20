import express from "express";
import { createSupabaseAnon, createSupabaseUser } from "../supabase.js";
import { requireUser } from "../auth/verify.js";
import { assert } from "../http/errors.js";
import { z } from "zod";

export const categoriesRouter = express.Router();

categoriesRouter.get("/categories", async (req, res) => {
  const jwt = (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = jwt ? createSupabaseUser(jwt) : createSupabaseAnon();
  const { data, error } = await sb.from("categories").select("*").order("name");
  assert(!error, 400, "Failed to fetch categories", "categories_fetch_failed", error?.message);
  res.json({ items: data });
});

categoriesRouter.post("/admin/categories", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);
  const schema = z.object({
    category_id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional().nullable()
  });
  const body = schema.parse(req.body ?? {});

  const { data, error } = await sb.from("categories").insert(body).select("*").maybeSingle();
  assert(!error, 400, "Failed to create category", "category_create_failed", error?.message);
  res.status(201).json({ item: data });
});

categoriesRouter.patch("/admin/categories/:categoryId", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);

  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable()
  });
  const body = schema.parse(req.body ?? {});

  const { data, error } = await sb
    .from("categories")
    .update(body)
    .eq("category_id", req.params.categoryId)
    .select("*")
    .maybeSingle();
  assert(!error, 400, "Failed to update category", "category_update_failed", error?.message);
  res.json({ item: data });
});

categoriesRouter.delete("/admin/categories/:categoryId", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);
  const { error } = await sb.from("categories").delete().eq("category_id", req.params.categoryId);
  assert(!error, 400, "Failed to delete category", "category_delete_failed", error?.message);
  res.json({ ok: true });
});

