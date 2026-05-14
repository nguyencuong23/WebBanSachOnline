/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      categories.js
 * Mục đích:      Định tuyến các API liên quan đến thể loại sách — bao gồm
 *                endpoint công khai để lấy danh sách và các endpoint admin để quản lý.
 * Các chức năng chính:
 *   - GET    /categories                    : Lấy danh sách thể loại (có tìm kiếm, sắp xếp)
 *   - POST   /admin/categories              : Tạo thể loại mới (admin)
 *   - PATCH  /admin/categories/:categoryId  : Cập nhật thể loại (admin)
 *   - DELETE /admin/categories/:categoryId  : Xóa thể loại (admin)
 *
 * Tên module:    Category Management
 * Module liên quan: supabase.js, auth/verify.js, http/errors.js
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import express from "express";
import { createSupabaseAnon, createSupabaseUser } from "../supabase.js";
import { requireUser } from "../auth/verify.js";
import { assert } from "../http/errors.js";
import { z } from "zod";

export const categoriesRouter = express.Router();

/**
 * Lấy danh sách thể loại sách, hỗ trợ tìm kiếm và sắp xếp.
 * Mặc định sắp xếp theo tên thể loại tăng dần (A-Z).
 *
 * @route   GET /categories
 * @access  Public
 * @async
 * @param {import("express").Request} req - Query params:
 *   - `search`   : Từ khóa tìm kiếm theo category_id hoặc name
 *   - `searchBy` : Trường tìm kiếm (all | category_id | name)
 *   - `sort`     : Sắp xếp dạng "field-asc" hoặc "field-desc"
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ items: Category[] }`.
 * @throws {HttpError} 400 nếu truy vấn database thất bại.
 */
categoriesRouter.get("/categories", async (req, res) => {
  const search = (req.query.search || "").toString().trim();
  const searchBy = (req.query.searchBy || "all").toString();
  const sort = (req.query.sort || "").toString();

  const jwt = (req.header("authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = jwt ? createSupabaseUser(jwt) : createSupabaseAnon();

  let q = sb.from("categories").select("*, books(count)");

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
    // Mặc định sắp xếp theo tên để hiển thị danh sách có thứ tự
    q = q.order("name", { ascending: true });
  }

  const { data, error } = await q;
  assert(!error, 400, "Failed to fetch categories", "categories_fetch_failed", error?.message);
  res.json({ items: data });
});

/**
 * Tạo thể loại sách mới (chỉ admin).
 *
 * @route   POST /admin/categories
 * @access  Private (admin)
 * @async
 * @param {import("express").Request} req - Request body gồm:
 *   @param {string} req.body.category_id  - Mã thể loại (duy nhất, không được để trống).
 *   @param {string} req.body.name         - Tên thể loại.
 *   @param {string} [req.body.description] - Mô tả thể loại (tùy chọn).
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} HTTP 201 với JSON `{ item: Category }`.
 * @throws {HttpError} 403 nếu không phải admin, 400 nếu validation thất bại hoặc lỗi DB.
 */
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

/**
 * Cập nhật thông tin thể loại sách (chỉ admin).
 *
 * @route   PATCH /admin/categories/:categoryId
 * @access  Private (admin)
 * @async
 * @param {import("express").Request} req - Route param: `categoryId`. Body chứa các trường cần cập nhật.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ item: Category }` với dữ liệu đã cập nhật.
 * @throws {HttpError} 403 nếu không phải admin, 400 nếu validation thất bại hoặc lỗi DB.
 */
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

/**
 * Xóa một thể loại sách (chỉ admin).
 *
 * @route   DELETE /admin/categories/:categoryId
 * @access  Private (admin)
 * @async
 * @param {import("express").Request} req - Route param: `categoryId`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ ok: true }`.
 * @throws {HttpError} 403 nếu không phải admin, 400 nếu lỗi DB.
 */
categoriesRouter.delete("/admin/categories/:categoryId", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);
  const { error } = await sb.from("categories").delete().eq("category_id", req.params.categoryId);
  assert(!error, 400, "Lỗi xóa thể loại", "category_delete_failed", error?.message);
  res.json({ ok: true });
});
