import express from "express";
import { createSupabaseAnon, createSupabaseUser } from "../supabase.js";
import { requireUser } from "../auth/verify.js";
import { assert } from "../http/errors.js";
import { z } from "zod";

export const vouchersRouter = express.Router();

// Lấy danh sách voucher công khai (ví dụ cho người dùng xem)
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

// Admin: Lấy danh sách tất cả voucher
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

// Admin: Lấy chi tiết 1 voucher
vouchersRouter.get("/admin/vouchers/:code", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);

  const { data, error } = await sb.from("vouchers").select("*").eq("code", req.params.code).maybeSingle();
  assert(!error, 400, "Lỗi tải voucher", "voucher_fetch_failed", error?.message);
  res.json({ item: data });
});

// Admin: Thêm voucher
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

// Admin: Cập nhật voucher
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

// Admin: Xóa voucher
vouchersRouter.delete("/admin/vouchers/:code", requireUser, async (req, res) => {
  assert(req.profile?.role === "admin", 403, "Admin only", "forbidden");
  const sb = createSupabaseUser(req.auth.jwt);
  const { error } = await sb.from("vouchers").delete().eq("code", req.params.code);
  assert(!error, 400, "Lỗi xóa voucher", "voucher_delete_failed", error?.message);
  res.json({ ok: true });
});
