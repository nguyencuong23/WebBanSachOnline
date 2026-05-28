/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      vouchers.js
 * Mục đích:      Định tuyến các API liên quan đến voucher giảm giá — xem danh sách
 *                công khai, kiểm tra/áp dụng voucher và quản lý voucher (admin).
 * Các chức năng chính:
 *   - GET    /vouchers                  : Lấy danh sách voucher đang hoạt động (công khai)
 *   - POST   /vouchers/apply            : Kiểm tra và tính số tiền giảm của voucher
 *   - GET    /admin/vouchers            : Lấy tất cả voucher (admin, có tìm kiếm/sắp xếp)
 *   - GET    /admin/vouchers/:code      : Lấy chi tiết một voucher (admin)
 *   - POST   /admin/vouchers            : Tạo voucher mới (admin)
 *   - PATCH  /admin/vouchers/:code      : Cập nhật voucher (admin)
 *   - DELETE /admin/vouchers/:code      : Xóa voucher (admin)
 *
 * Tên module:    Voucher Management
 * Module liên quan: supabase.js, auth/verify.js, http/errors.js, routes/orders.js
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

export const vouchersRouter = express.Router();

/**
 * Lấy danh sách voucher đang hoạt động và chưa hết hạn (dành cho người dùng xem).
 * Sắp xếp theo phần trăm giảm giá cao nhất trước.
 *
 * @route   GET /vouchers
 * @access  Public
 * @async
 * @param {import("express").Request} req - Request object.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ items: Voucher[] }`.
 * @throws {HttpError} 400 nếu truy vấn database thất bại.
 */
vouchersRouter.get("/vouchers", async (req, res) => {
  const sb = createSupabaseAnon();
  const { data, error } = await sb
    .from("vouchers")
    .select("*")
    .eq("is_active", true)
    .gte("valid_until", new Date().toISOString())
    .order("discount_percent", { ascending: false });
    
  assert(!error, 400, "Lỗi tải danh sách voucher", "vouchers_fetch_failed", error?.message);
  res.json({ items: data });
});

/**
 * Kiểm tra tính hợp lệ của voucher và tính số tiền giảm dựa trên subtotal.
 * Dùng ở trang checkout để preview số tiền giảm trước khi đặt hàng.
 *
 * @route   POST /vouchers/apply
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Request body:
 *   @param {string} req.body.code     - Mã voucher cần kiểm tra.
 *   @param {number} req.body.subtotal - Tổng tiền hàng (trước giảm giá).
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ ok, voucher, discount, final_total }`.
 * @throws {HttpError} 400 nếu thiếu thông tin hoặc voucher không hợp lệ.
 * @throws {HttpError} 404 nếu mã voucher không tồn tại.
 */
vouchersRouter.post("/vouchers/apply", requireUser, async (req, res) => {
  const { code, subtotal } = req.body || {};
  assert(code && typeof code === "string", 400, "Mã voucher không được để trống.", "missing_code");
  assert(typeof subtotal === "number" && subtotal > 0, 400, "Giá trị đơn hàng không hợp lệ.", "invalid_subtotal");

  const sb = createSupabaseAnon();
  const { data: voucher, error } = await sb
    .from("vouchers")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  assert(!error, 400, "Lỗi kiểm tra voucher.", "voucher_fetch_failed", error?.message);
  assert(voucher, 404, "Mã voucher không tồn tại.", "voucher_not_found");
  assert(voucher.is_active, 400, "Mã voucher đã bị vô hiệu hóa.", "voucher_inactive");
  assert(
    new Date(voucher.valid_until) > new Date(),
    400,
    "Mã voucher đã hết hạn.",
    "voucher_expired"
  );

  // Tính số tiền giảm theo phần trăm, làm tròn xuống để tránh số lẻ
  const rawDiscount = Math.floor((subtotal * voucher.discount_percent) / 100);
  // Giới hạn số tiền giảm tối đa nếu voucher có quy định max_discount_amount
  const discount = voucher.max_discount_amount > 0
    ? Math.min(rawDiscount, voucher.max_discount_amount)
    : rawDiscount;

  res.json({
    ok: true,
    voucher: {
      code: voucher.code,
      discount_percent: voucher.discount_percent,
      max_discount_amount: voucher.max_discount_amount,
    },
    discount,
    final_total: subtotal - discount,
  });
});

/**
 * Lấy danh sách tất cả voucher (kể cả hết hạn/vô hiệu) dành cho admin.
 * Hỗ trợ tìm kiếm theo mã và sắp xếp.
 *
 * @route   GET /admin/vouchers
 * @access  Private (admin)
 * @async
 * @param {import("express").Request} req - Query params: `search`, `searchBy`, `sort`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ items: Voucher[] }` tối đa 100 kết quả.
 * @throws {HttpError} 403 nếu không phải admin, 400 nếu lỗi DB.
 */
vouchersRouter.get("/admin/vouchers", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);
  
  const search = (req.query.search || "").toString().trim();
  const searchBy = (req.query.searchBy || "all").toString();
  const sort = (req.query.sort || "code-asc").toString();

  let q = sb.from("vouchers").select("*");

  if (search) {
    if (searchBy === "code") {
      q = q.ilike("code", `%${search}%`);
    } else {
      q = q.ilike("code", `%${search}%`);
    }
  }

  if (sort) {
    const [field, dir] = sort.split("-");
    q = q.order(field, { ascending: dir === "asc" });
  } else {
    q = q.order("valid_until", { ascending: false });
  }

  const { data, error } = await q.limit(100);
  assert(!error, 400, "Lỗi tải danh sách voucher", "vouchers_fetch_failed", error?.message);
  res.json({ items: data });
});

/**
 * Lấy chi tiết một voucher theo mã (chỉ admin).
 *
 * @route   GET /admin/vouchers/:code
 * @access  Private (admin)
 * @async
 * @param {import("express").Request} req - Route param: `code`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ item: Voucher }`.
 * @throws {HttpError} 403 nếu không phải admin, 400 nếu lỗi DB.
 */
vouchersRouter.get("/admin/vouchers/:code", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);

  const { data, error } = await sb.from("vouchers").select("*").eq("code", req.params.code).maybeSingle();
  assert(!error, 400, "Lỗi tải voucher", "voucher_fetch_failed", error?.message);
  res.json({ item: data });
});

/**
 * Tạo voucher giảm giá mới (chỉ admin).
 *
 * @route   POST /admin/vouchers
 * @access  Private (admin)
 * @async
 * @param {import("express").Request} req - Request body gồm:
 *   @param {string}  req.body.code                - Mã voucher (tự động uppercase).
 *   @param {number}  req.body.discount_percent     - Phần trăm giảm giá (1-100).
 *   @param {number}  req.body.max_discount_amount  - Số tiền giảm tối đa (0 = không giới hạn).
 *   @param {string}  req.body.valid_until          - Ngày hết hạn (ISO datetime).
 *   @param {boolean} [req.body.is_active=true]     - Trạng thái kích hoạt.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} HTTP 201 với JSON `{ item: Voucher }`.
 * @throws {HttpError} 403 nếu không phải admin, 400 nếu validation thất bại hoặc mã đã tồn tại.
 */
vouchersRouter.post("/admin/vouchers", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);

  const schema = z.object({
    code: z.string().min(1, "Mã voucher không được để trống.").toUpperCase(),
    discount_percent: z.number({ invalid_type_error: "Phần trăm phải là số." }).int().min(1, "Phần trăm giảm giá phải lớn hơn 0.").max(100, "Phần trăm giảm giá không quá 100."),
    max_discount_amount: z.number({ invalid_type_error: "Số tiền tối đa phải là số." }).min(0, "Số tiền giảm tối đa không được âm."),
    valid_until: z.string().datetime({ message: "Ngày hết hạn không hợp lệ" }),
    is_active: z.boolean().default(true)
  });
  
  const body = schema.parse(req.body ?? {});

  // Kiểm tra mã voucher đã tồn tại chưa
  const { data: existing } = await sb
    .from("vouchers")
    .select("code")
    .eq("code", body.code)
    .maybeSingle();
  assert(!existing, 400, "Mã voucher này đã tồn tại! Vui lòng chọn mã khác.", "voucher_code_duplicate");

  const { data, error } = await sb.from("vouchers").insert(body).select("*").maybeSingle();
  assert(!error, 400, "Lỗi tạo voucher", "voucher_create_failed", error?.message);
  res.status(201).json({ item: data });
});

/**
 * Cập nhật thông tin voucher (chỉ admin).
 * Chỉ cập nhật các trường được gửi lên (partial update).
 *
 * @route   PATCH /admin/vouchers/:code
 * @access  Private (admin)
 * @async
 * @param {import("express").Request} req - Route param: `code`. Body chứa các trường cần cập nhật.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ item: Voucher }` với dữ liệu đã cập nhật.
 * @throws {HttpError} 403 nếu không phải admin, 400 nếu validation thất bại hoặc lỗi DB.
 */
vouchersRouter.patch("/admin/vouchers/:code", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);

  const schema = z.object({
    discount_percent: z.number().int().min(1).max(100).optional(),
    max_discount_amount: z.number().min(0).optional(),
    valid_until: z.string().datetime().optional(),
    is_active: z.boolean().optional()
  });
  
  const body = schema.parse(req.body ?? {});

  const { data, error } = await sb
    .from("vouchers")
    .update(body)
    .eq("code", req.params.code)
    .select("*")
    .maybeSingle();

  assert(!error, 400, "Lỗi cập nhật voucher", "voucher_update_failed", error?.message);
  res.json({ item: data });
});

/**
 * Xóa một voucher (chỉ admin).
 *
 * @route   DELETE /admin/vouchers/:code
 * @access  Private (admin)
 * @async
 * @param {import("express").Request} req - Route param: `code`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ ok: true }`.
 * @throws {HttpError} 403 nếu không phải admin, 400 nếu lỗi DB.
 */
vouchersRouter.delete("/admin/vouchers/:code", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);
  const { error } = await sb.from("vouchers").delete().eq("code", req.params.code);
  assert(!error, 400, "Lỗi xóa voucher", "voucher_delete_failed", error?.message);
  res.json({ ok: true });
});
