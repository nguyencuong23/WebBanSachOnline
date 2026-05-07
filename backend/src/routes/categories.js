/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: categories.js
 * Mục đích của file: Quản lý API liên quan đến các thể loại sách.
 * Các chức năng chính: Lấy danh sách thể loại, thêm, sửa, xóa thể loại (CRUD Admin).
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Categories API Route
 * Mục đích của module: Định tuyến HTTP cho dữ liệu danh mục/thể loại.
 * Phạm vi xử lý: Public (lấy danh sách) và Private (các thao tác admin).
 * Các thành phần chính trong module: Express Router, zod validation, Supabase query.
 * Module liên quan: auth/verify.js (Xác thực quyền), books.js (Phụ thuộc thể loại).
 * ============================================================================
 */
import express from "express";
import { createSupabaseAnon, createSupabaseUser } from "../supabase.js";
import { requireUser } from "../auth/verify.js";
import { assert } from "../http/errors.js";
import { z } from "zod";

export const categoriesRouter = express.Router(); // Ý nghĩa: Router chứa các endpoint quản lý thể loại; Giá trị: Express Router instance

/**
 * Tên function: GET /categories
 * Mục đích của function: Lấy danh sách toàn bộ các thể loại sách.
 * Tham số đầu vào: req (query: `search`, `searchBy`, `sort`), res
 * Giá trị trả về: JSON `{ items: Array }`
 * Điều kiện xử lý: Không yêu cầu đăng nhập. Hỗ trợ tìm kiếm theo tên hoặc ID.
 * Lỗi có thể phát sinh: 400 nếu lỗi truy vấn DB.
 */
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

/**
 * Tên function: POST /admin/categories
 * Mục đích của function: Tạo mới một thể loại sách.
 * Tham số đầu vào: req (body: `category_id`, `name`, `description`), res
 * Giá trị trả về: JSON `{ item: Object }`
 * Điều kiện xử lý: Validate Zod, bắt buộc quyền admin.
 * Lỗi có thể phát sinh: 403 (Không phải admin), 400 (Lỗi validate hoặc lỗi tạo mới).
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
 * Tên function: PATCH /admin/categories/:categoryId
 * Mục đích của function: Cập nhật thông tin của một thể loại sách.
 * Tham số đầu vào: req (params: `categoryId`, body), res
 * Giá trị trả về: JSON `{ item: Object }`
 * Điều kiện xử lý: Validate Zod các trường truyền lên, quyền admin.
 * Lỗi có thể phát sinh: 403 (Không phải admin), 400 (Lỗi validate, lỗi cập nhật).
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
 * Tên function: DELETE /admin/categories/:categoryId
 * Mục đích của function: Xóa một thể loại sách khỏi cơ sở dữ liệu.
 * Tham số đầu vào: req (params: `categoryId`), res
 * Giá trị trả về: JSON `{ ok: true }`
 * Điều kiện xử lý: Quyền admin.
 * Lỗi có thể phát sinh: 403 (Không có quyền), 400 (Lỗi xóa, ví dụ đang có sách liên kết).
 */
categoriesRouter.delete("/admin/categories/:categoryId", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);
  const { error } = await sb.from("categories").delete().eq("category_id", req.params.categoryId);
  assert(!error, 400, "Lỗi xóa thể loại", "category_delete_failed", error?.message);
  res.json({ ok: true });
});

