/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: vouchers.js
 * Mục đích của file: Quản lý mã giảm giá (voucher).
 * Các chức năng chính: Lấy danh sách voucher công khai, áp dụng mã giảm giá, và các thao tác CRUD từ Admin.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Vouchers API Route
 * Mục đích của module: Xử lý logic truy xuất và tính toán giảm giá cho đơn hàng.
 * Phạm vi xử lý: API public (lấy voucher hiện có), API tính giảm giá (cần đăng nhập), CRUD admin.
 * Các thành phần chính trong module: Express Router, Zod validation.
 * Module liên quan: auth/verify.js, supabase.js.
 * ============================================================================
 */
import express from "express";
import { createSupabaseAnon, createSupabaseUser } from "../supabase.js";
import { requireUser } from "../auth/verify.js";
import { assert } from "../http/errors.js";
import { z } from "zod";

export const vouchersRouter = express.Router(); // Ý nghĩa: Router chứa các endpoint quản lý voucher; Giá trị: Express Router instance

/**
 * Tên function: GET /vouchers
 * Mục đích của function: Lấy danh sách voucher công khai đang còn hạn và đang kích hoạt.
 * Tham số đầu vào: req, res
 * Giá trị trả về: JSON `{ items: Array }`
 * Điều kiện xử lý: is_active = true, valid_until >= hiện tại.
 * Lỗi có thể phát sinh: 400 nếu có lỗi từ DB.
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
 * Tên function: POST /vouchers/apply
 * Mục đích của function: Kiểm tra mã voucher và tính toán số tiền được giảm dựa trên tổng đơn.
 * Tham số đầu vào: req (body: `code`, `subtotal`), res
 * Giá trị trả về: JSON `{ ok, voucher, discount, final_total }`
 * Điều kiện xử lý: Yêu cầu đăng nhập. Kiểm tra tồn tại, trạng thái active, hết hạn. Tính giảm giá theo max_discount_amount.
 * Lỗi có thể phát sinh: 404 (Không tồn tại), 400 (Hết hạn, bị vô hiệu hóa, lỗi DB).
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

  // Tính số tiền giảm
  const rawDiscount = Math.floor((subtotal * voucher.discount_percent) / 100);
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
 * Tên function: GET /admin/vouchers
 * Mục đích của function: Lấy danh sách tất cả voucher (Admin).
 * Tham số đầu vào: req (query: search, sort), res
 * Giá trị trả về: JSON `{ items: Array }`
 * Điều kiện xử lý: Yêu cầu quyền admin.
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
 * Tên function: GET /admin/vouchers/:code
 * Mục đích của function: Lấy chi tiết 1 voucher bằng mã (Admin).
 * Tham số đầu vào: req (params: code), res
 * Giá trị trả về: JSON `{ item: Object }`
 */
vouchersRouter.get("/admin/vouchers/:code", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);

  const { data, error } = await sb.from("vouchers").select("*").eq("code", req.params.code).maybeSingle();
  assert(!error, 400, "Lỗi tải voucher", "voucher_fetch_failed", error?.message);
  res.json({ item: data });
});

/**
 * Tên function: POST /admin/vouchers
 * Mục đích của function: Tạo mới một mã giảm giá (Admin).
 * Tham số đầu vào: req (body), res
 * Giá trị trả về: JSON `{ item: Object }`
 * Điều kiện xử lý: Validate các trường bắt buộc, yêu cầu quyền admin.
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

  const { data, error } = await sb.from("vouchers").insert(body).select("*").maybeSingle();
  assert(!error, 400, "Lỗi tạo voucher (Mã đã tồn tại?)", "voucher_create_failed", error?.message);
  res.status(201).json({ item: data });
});

/**
 * Tên function: PATCH /admin/vouchers/:code
 * Mục đích của function: Cập nhật thông tin voucher (Admin).
 * Tham số đầu vào: req (params: code, body), res
 * Giá trị trả về: JSON `{ item: Object }`
 * Điều kiện xử lý: Validate, cập nhật DB.
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
 * Tên function: DELETE /admin/vouchers/:code
 * Mục đích của function: Xóa mã voucher (Admin).
 * Tham số đầu vào: req (params: code), res
 * Giá trị trả về: JSON `{ ok: true }`
 */
vouchersRouter.delete("/admin/vouchers/:code", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);
  const { error } = await sb.from("vouchers").delete().eq("code", req.params.code);
  assert(!error, 400, "Lỗi xóa voucher", "voucher_delete_failed", error?.message);
  res.json({ ok: true });
});
