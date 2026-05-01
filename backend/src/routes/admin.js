import express from "express";
import { z } from "zod";
import { requireUser, requireAdmin } from "../auth/verify.js";
import { createSupabaseUser, createSupabaseAdmin } from "../supabase.js";
import { assert } from "../http/errors.js";

const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9._]{2,28}[a-z0-9])?$/;
const FULL_NAME_REGEX = /^[\p{L}](?:[\p{L}\s'.-]{0,98}[\p{L}])?$/u;
const PHONE_REGEX = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;

export const adminRouter = express.Router();

adminRouter.use("/admin", requireUser, requireAdmin);

adminRouter.get("/admin/dashboard/summary", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);

  const [{ data: books }, { data: users }, { data: orders }] = await Promise.all([
    sb.from("books").select("quantity"),
    sb.from("profiles").select("user_id").eq("role", "user"),
    sb.from("orders").select("status,total,created_at")
  ]);

  const total_books = (books || []).reduce((s, b) => s + (b.quantity || 0), 0);
  const total_users = users?.length || 0;
  const total_orders = orders?.length || 0;

  const now = new Date();
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const revenue = (orders || [])
    .filter((o) => (o.created_at || "").slice(0, 7) === ym && o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total || 0), 0);

  res.json({
    total_books,
    total_users,
    total_orders,
    revenue
  });
});

adminRouter.get("/admin/dashboard/stats", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);

  const [{ data: books }, { data: customers }, { data: orders }, { data: recentOrders }, { data: categories }] =
    await Promise.all([
      sb.from("books").select("quantity"),
      sb.from("profiles").select("user_id").eq("role", "user"),
      sb.from("orders").select("status,total,created_at,payment_method,payment_status"),
      sb.from("orders").select("*").order("created_at", { ascending: false }).limit(5),
      sb.from("categories").select("category_id,name")
    ]);

  const total_books = (books || []).reduce((s, b) => s + (b.quantity || 0), 0);
  const total_customers = customers?.length || 0;

  const total_pending = (orders || []).filter((o) => o.status === "pending").length;
  const total_shipping = (orders || []).filter((o) => o.status === "shipping").length;
  const total_delivered = (orders || []).filter((o) => o.status === "delivered").length;
  const total_cancelled = (orders || []).filter((o) => o.status === "cancelled").length;

  const status_distribution = [
    { name: "Chờ xác nhận", value: total_pending, key: "pending" },
    { name: "Đang giao", value: total_shipping, key: "shipping" },
    { name: "Đã giao", value: total_delivered, key: "delivered" },
    { name: "Đã hủy", value: total_cancelled, key: "cancelled" }
  ];

  // Top selling books (aggregated client-side)
  const { data: topBooksRaw } = await sb
    .from("order_items")
    .select("book_id,quantity,line_total,orders(status),books(title,author)")
    .limit(2000);

  const agg = new Map();
  for (const it of topBooksRaw || []) {
    if (it.orders?.status === "cancelled") continue;
    const prev = agg.get(it.book_id) || { title: it.books?.title, author: it.books?.author, sold_quantity: 0, revenue: 0 };
    prev.sold_quantity += Number(it.quantity || 0);
    prev.revenue += Number(it.line_total || 0);
    agg.set(it.book_id, prev);
  }
  const top_books = [...agg.values()].sort((a, b) => b.sold_quantity - a.sold_quantity).slice(0, 10);

  // Category stats (count books per category)
  const { data: booksForCats } = await sb.from("books").select("category_id");
  const catCount = new Map();
  for (const b of booksForCats || []) catCount.set(b.category_id, (catCount.get(b.category_id) || 0) + 1);
  const category_stats = (categories || []).map((c) => ({ label: c.name, count: catCount.get(c.category_id) || 0 }));

  res.json({
    total_books,
    total_customers,
    total_pending,
    total_shipping,
    total_delivered,
    total_cancelled,
    status_distribution,
    recent_orders: recentOrders || [],
    top_books,
    category_stats
  });
});

adminRouter.get("/admin/monthly-stats", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const year = new Date().getUTCFullYear();

  const { data: orders, error } = await sb
    .from("orders")
    .select("created_at,status,payment_method,total")
    .gte("created_at", `${year}-01-01T00:00:00Z`)
    .lt("created_at", `${year + 1}-01-01T00:00:00Z`);
  assert(!error, 400, "Failed to fetch monthly stats", "stats_fetch_failed", error?.message);

  const months = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
  const result = months.map((m, i) => ({
    name: m,
    cod: 0,
    bank_transfer: 0,
    count: 0
  }));

  for (const o of orders || []) {
    if (o.status === "cancelled") continue;
    const mIdx = Number(String(o.created_at).slice(5, 7)) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      result[mIdx].count += 1;
      const amount = Number(o.total || 0);
      if (o.payment_method === "cod") result[mIdx].cod += amount;
      else result[mIdx].bank_transfer += amount;
    }
  }
  res.json(result);
});

adminRouter.get("/admin/borrowing-trends", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const end = new Date();
  const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
  const startIso = start.toISOString();
  const endIso = new Date(end.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data: orders, error } = await sb
    .from("orders")
    .select("created_at,total,status")
    .gte("created_at", startIso)
    .lt("created_at", endIso);
  assert(!error, 400, "Failed to fetch trends", "stats_fetch_failed", error?.message);

  const dayKeys = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });

  const volumeMap = new Map(dayKeys.map((k) => [k, 0]));
  const revenueMap = new Map(dayKeys.map((k) => [k, 0]));

  for (const o of orders || []) {
    if (o.status === "cancelled") continue;
    const k = String(o.created_at).slice(0, 10);
    volumeMap.set(k, (volumeMap.get(k) || 0) + 1);
    revenueMap.set(k, (revenueMap.get(k) || 0) + Number(o.total || 0));
  }

  const order_volume = dayKeys.map((k) => ({ date: k, count: volumeMap.get(k) || 0 }));
  const revenue = dayKeys.map((k) => ({ date: k, revenue: revenueMap.get(k) || 0 }));

  res.json({ order_volume, revenue });
});

// --- QUẢN LÝ ĐƠN HÀNG (THÊM MỚI TỪ ADMIN) ---
adminRouter.post("/admin/orders", async (req, res) => {
  const sb = createSupabaseAdmin();
  const schema = z.object({
    user_id: z.string().uuid("Vui lòng chọn khách hàng hợp lệ."),
    receiver_name: z.string().trim().min(1, "Tên người nhận không được để trống."),
    receiver_phone: z.string().trim().min(8, "Số điện thoại không hợp lệ."),
    shipping_address: z.string().trim().min(1, "Địa chỉ giao hàng không được để trống."),
    note: z.string().trim().optional(),
    payment_method: z.enum(["cod", "bank_transfer"]),
    status: z.enum(["pending", "confirmed", "processing", "shipping", "delivered", "cancelled"]).default("pending"),
    payment_status: z.enum(["unpaid", "paid", "refunded"]).default("unpaid"),
    shipping_fee: z.number().min(0, "Phí ship không được âm.").optional(),
    lines: z.array(z.object({
      book_id: z.string().min(1),
      quantity: z.number().int().min(1)
    })).min(1, "Đơn hàng phải có ít nhất 1 sản phẩm.")
  });

  const body = schema.parse(req.body ?? {});

  const bookIds = [...new Set(body.lines.map(x => x.book_id))];
  const { data: books, error: bErr } = await sb.from("books").select("*").in("book_id", bookIds);
  assert(!bErr, 400, "Lỗi kiểm tra sách", "books_fetch_failed", bErr?.message);
  assert(books && books.length === bookIds.length, 400, "Một số sách không tồn tại.", "invalid_request");

  for (const line of body.lines) {
    const b = books.find(x => x.book_id === line.book_id);
    assert((b?.quantity ?? 0) >= line.quantity, 400, `Sách '${b?.title}' không đủ số lượng tồn kho (còn ${b?.quantity || 0}).`, "out_of_stock");
  }

  const subtotal = body.lines.reduce((sum, line) => {
    const b = books.find(x => x.book_id === line.book_id);
    const unit = b?.is_on_sale ? b.sale_price : b?.price;
    return sum + Number(unit || 0) * line.quantity;
  }, 0);

  let shipping_fee = 0;
  if (body.shipping_fee !== undefined) {
    shipping_fee = body.shipping_fee;
  } else {
    const { data: shipFeeSetting } = await sb.from("settings").select("*").eq("key", "DefaultShippingFee").maybeSingle();
    const { data: freeSetting } = await sb.from("settings").select("*").eq("key", "FreeShippingThreshold").maybeSingle();
    const defaultFee = Number(shipFeeSetting?.value ?? 30000);
    const freeThreshold = Number(freeSetting?.value ?? 300000);
    shipping_fee = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : Math.max(defaultFee, 0);
  }

  const total = subtotal + shipping_fee;
  const now = new Date();
  const order_code = `BP${now.toISOString().slice(0, 19).replace(/[-:T]/g, "")}${Math.floor(100 + Math.random() * 900)}`;

  const { data: order, error: oErr } = await sb.from("orders").insert({
    user_id: body.user_id,
    order_code,
    status: body.status,
    payment_method: body.payment_method,
    payment_status: body.payment_status,
    receiver_name: body.receiver_name,
    receiver_phone: body.receiver_phone,
    shipping_address: body.shipping_address,
    note: body.note || null,
    subtotal,
    shipping_fee,
    discount: 0,
    total
  }).select("*").maybeSingle();
  assert(!oErr && order, 400, "Lỗi tạo đơn hàng", "order_create_failed", oErr?.message);

  const itemsToInsert = body.lines.map(line => {
    const b = books.find(x => x.book_id === line.book_id);
    const unit = b?.is_on_sale ? b.sale_price : b?.price;
    return {
      order_id: order.order_id,
      book_id: line.book_id,
      unit_price: unit,
      quantity: line.quantity,
      line_total: Number(unit) * line.quantity
    };
  });

  const { error: itErr } = await sb.from("order_items").insert(itemsToInsert);
  assert(!itErr, 400, "Lỗi tạo chi tiết đơn hàng", "order_items_create_failed", itErr?.message);

  for (const line of body.lines) {
    const b = books.find(x => x.book_id === line.book_id);
    const newQty = (b?.quantity ?? 0) - line.quantity;
    await sb.from("books").update({ quantity: newQty }).eq("book_id", line.book_id);
  }

  res.status(201).json({ item: order });
});


adminRouter.get("/admin/users", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const role = (req.query.role || "").toString();
  const active = (req.query.active || "").toString();
  const search = (req.query.search || "").toString().trim();
  const searchBy = (req.query.searchBy || "all").toString();
  const sort = (req.query.sort || "").toString();

  let q = sb.from("profiles").select("*");

  if (role) q = q.eq("role", role);
  if (active) q = q.eq("is_active", active === "true");

  if (search) {
    if (searchBy === "all") {
      q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%,username.ilike.%${search}%`);
    } else if (searchBy === "user_id") {
      // Check if it's a valid UUID format before eq to avoid DB errors
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(search)) {
        q = q.eq("user_id", search);
      } else {
        q = q.eq("user_id", "00000000-0000-0000-0000-000000000000"); // Return empty if invalid UUID format
      }
    } else {
      q = q.ilike(searchBy, `%${search}%`);
    }
  }

  if (sort) {
    const [field, dir] = sort.split("-");
    q = q.order(field, { ascending: dir === "asc" });
  } else {
    q = q.order("created_at", { ascending: false });
  }

  const { data, error } = await q.limit(500);
  assert(!error, 400, "Failed to fetch users", "users_fetch_failed", error?.message);
  res.json({ items: data });
});

adminRouter.patch("/admin/users/:userId", async (req, res) => {
  const schema = z.object({
    username: z.string().trim().regex(USERNAME_REGEX, "Tên đăng nhập phải dài 4-30 ký tự, chỉ gồm chữ thường, số, dấu chấm và dấu gạch dưới.").optional().nullable().or(z.literal("")),
    full_name: z.string().trim().regex(FULL_NAME_REGEX, "Họ tên chỉ được chứa chữ cái và các dấu cách hợp lệ, độ dài 2-100 ký tự.").optional().nullable().or(z.literal("")),
    email: z.string().email("Email không hợp lệ.").max(100, "Email không được vượt quá 100 ký tự.").optional(),
    phone_number: z.string().trim().regex(PHONE_REGEX, "Số điện thoại phải là số di động Việt Nam hợp lệ.").optional().nullable().or(z.literal("")),
    avatar_url: z.string().trim().optional().nullable(),
    default_address: z.string().trim().optional().nullable(),
    loyalty_points: z.number({ invalid_type_error: "Điểm thưởng phải là số." }).int().min(0, "Điểm thưởng không được âm.").optional(),
    customer_note: z.string().trim().optional().nullable(),
    is_active: z.boolean().optional(),
    role: z.enum(["admin", "user"]).optional()
  });
  const body = schema.parse(req.body ?? {});

  const sbAdmin = createSupabaseAdmin();
  const userId = req.params.userId;

  if (body.is_active === false && userId === req.profile?.user_id) {
    assert(false, 400, "Bạn không thể khóa tài khoản của chính mình.", "cannot_lock_self");
  }

  // Nếu có thay đổi email → cập nhật cả auth.users (Supabase Auth) lẫn profiles
  if (body.email) {
    // Kiểm tra email mới chưa được dùng bởi user khác
    const { data: existing } = await sbAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", body.email)
      .neq("user_id", userId)
      .maybeSingle();
    assert(!existing, 409, "Email này đã được sử dụng bởi tài khoản khác.", "duplicate_email");

    // Cập nhật email trong Supabase Auth
    const { error: authErr } = await sbAdmin.auth.admin.updateUserById(userId, {
      email: body.email,
      email_confirm: true, // Xác nhận email ngay, không cần verify
    });
    assert(!authErr, 400, "Lỗi cập nhật email trong hệ thống xác thực.", "auth_email_update_failed", authErr?.message);
  }

  // Cập nhật profiles
  const { data, error } = await sbAdmin.from("profiles").update(body).eq("user_id", userId).select("*").maybeSingle();
  assert(!error, 400, "Lỗi cập nhật người dùng", "user_update_failed", error?.message);
  res.json({ item: data });
});

adminRouter.post("/admin/users", async (req, res) => {
  const schema = z.object({
    email: z.string().email("Email không hợp lệ.").max(100, "Email không được vượt quá 100 ký tự."),
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
    username: z.string().trim().regex(USERNAME_REGEX, "Tên đăng nhập phải dài 4-30 ký tự, chỉ gồm chữ thường, số, dấu chấm và dấu gạch dưới.").optional().nullable().or(z.literal("")),
    full_name: z.string().trim().regex(FULL_NAME_REGEX, "Họ tên chỉ được chứa chữ cái và các dấu cách hợp lệ, độ dài 2-100 ký tự."),
    phone_number: z.string().trim().regex(PHONE_REGEX, "Số điện thoại phải là số di động Việt Nam hợp lệ.").optional().nullable().or(z.literal("")),
    role: z.enum(["admin", "user"]).default("user"),
    is_active: z.boolean().default(true)
  });
  const body = schema.parse(req.body ?? {});

  const sbAdmin = createSupabaseAdmin();

  const { data: created, error: createError } = await sbAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      username: body.username,
      full_name: body.full_name,
      phone_number: body.phone_number,
      role: body.role
    }
  });

  assert(!createError, 400, "Lỗi tạo tài khoản", "auth_create_failed", createError?.message);

  const profilePayload = {
    user_id: created.user.id,
    email: body.email,
    username: body.username || null,
    full_name: body.full_name || null,
    phone_number: body.phone_number || null,
    role: body.role,
    is_active: body.is_active
  };

  const { data: profile, error: profileError } = await sbAdmin.from("profiles").insert(profilePayload).select("*").maybeSingle();
  if (profileError) {
    await sbAdmin.auth.admin.deleteUser(created.user.id);
    let msg = "Lỗi tạo hồ sơ người dùng";
    if (/username/i.test(profileError.message)) msg = "Tên đăng nhập đã tồn tại.";
    else if (/phone/i.test(profileError.message)) msg = "Số điện thoại đã được sử dụng.";
    else if (/email/i.test(profileError.message)) msg = "Email đã tồn tại.";
    else if (/full_name/i.test(profileError.message) || /not-null constraint/i.test(profileError.message)) msg = "Họ tên không được để trống.";
    
    assert(false, 400, msg, "profile_create_failed", profileError.message);
  }

  res.status(201).json({ item: profile });
});

adminRouter.delete("/admin/users/:userId", async (req, res) => {
  const sbAdmin = createSupabaseAdmin();
  const userId = req.params.userId;

  assert(userId !== req.profile?.user_id, 400, "Bạn không thể xóa tài khoản của chính mình.", "cannot_delete_self");

  const { error } = await sbAdmin.auth.admin.deleteUser(userId);
  assert(!error, 400, "Lỗi xóa người dùng", "user_delete_failed", error?.message);

  res.json({ ok: true });
});

adminRouter.post("/admin/users/:userId/toggle-status", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const userId = req.params.userId;

  assert(userId !== req.profile?.user_id, 400, "Bạn không thể khóa/mở khóa tài khoản của chính mình.", "cannot_lock_self");

  const { data: user, error: fetchErr } = await sb.from("profiles").select("is_active").eq("user_id", userId).maybeSingle();
  assert(!fetchErr && user, 400, "Không tìm thấy người dùng", "user_not_found");

  const { data, error } = await sb.from("profiles").update({ is_active: !user.is_active }).eq("user_id", userId).select("*").maybeSingle();
  assert(!error, 400, "Lỗi cập nhật trạng thái người dùng", "user_status_update_failed", error?.message);

  res.json({ item: data });
});

adminRouter.post("/admin/users/:userId/change-password", async (req, res) => {
  const schema = z.object({
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
  });
  const body = schema.parse(req.body ?? {});

  const sbAdmin = createSupabaseAdmin();
  const { error } = await sbAdmin.auth.admin.updateUserById(req.params.userId, {
    password: body.password
  });
  assert(!error, 400, "Lỗi cập nhật mật khẩu", "password_update_failed", error?.message);

  res.json({ message: "Cập nhật mật khẩu thành công" });
});

adminRouter.post("/admin/users/:userId/avatar", async (req, res) => {
  const { image } = req.body;
  assert(image, 400, "Thiếu dữ liệu hình ảnh (Base64)", "missing_image");

  const sbAdmin = createSupabaseAdmin();
  const userId = req.params.userId;

  const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
  assert(matches, 400, "Định dạng Base64 không hợp lệ", "invalid_base64");

  const contentType = matches[1];
  const extension = contentType.split("/")[1];
  const buffer = Buffer.from(matches[2], "base64");
  const fileName = `${userId}.${extension}`;

  const { data: existingFiles } = await sbAdmin.storage.from("avatars").list("", { search: userId });
  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map(f => f.name);
    await sbAdmin.storage.from("avatars").remove(filesToDelete);
  }

  const { data: uploadData, error: uploadError } = await sbAdmin.storage
    .from("avatars")
    .upload(fileName, buffer, {
      contentType,
      upsert: true
    });
  assert(!uploadError, 400, "Lỗi tải ảnh lên", "upload_failed", uploadError?.message);

  const { data: profile, error: dbError } = await sbAdmin
    .from("profiles")
    .update({ avatar_url: fileName })
    .eq("user_id", userId)
    .select("*")
    .single();
  assert(!dbError, 400, "Lỗi cập nhật hồ sơ", "db_update_failed", dbError?.message);

  res.json({ message: "Cập nhật ảnh đại diện thành công", avatar_url: fileName, profile });
});

adminRouter.delete("/admin/users/:userId/avatar", async (req, res) => {
  const sbAdmin = createSupabaseAdmin();
  const userId = req.params.userId;

  const { data: existingFiles } = await sbAdmin.storage.from("avatars").list("", { search: userId });
  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map(f => f.name);
    await sbAdmin.storage.from("avatars").remove(filesToDelete);
  }

  const { data: profile, error: dbError } = await sbAdmin
    .from("profiles")
    .update({ avatar_url: null })
    .eq("user_id", userId)
    .select("*")
    .single();

  assert(!dbError, 400, "Lỗi cập nhật hồ sơ", "db_update_failed", dbError?.message);
  res.json({ message: "Đã xóa ảnh đại diện", profile });
});

// --- QUẢN LÝ ĐƠN HÀNG (ADMIN) ---

adminRouter.get("/admin/orders", async (req, res) => {
  const search = (req.query.search || "").toString().trim();
  const searchBy = (req.query.searchBy || "all").toString();
  const sort = (req.query.sort || "created_at-desc").toString();
  const status = (req.query.status || "").toString();

  const sb = createSupabaseAdmin();
  let q = sb.from("orders").select("*");

  if (search) {
    if (searchBy === "order_code") {
      q = q.ilike("order_code", `%${search}%`);
    } else if (searchBy === "customer") {
      q = q.or(`receiver_name.ilike.%${search}%,receiver_phone.ilike.%${search}%`);
    } else {
      q = q.or(`order_code.ilike.%${search}%,receiver_name.ilike.%${search}%,receiver_phone.ilike.%${search}%`);
    }
  }

  if (status) {
    q = q.eq("status", status);
  }

  const [field, dir] = sort.split("-");
  q = q.order(field || "created_at", { ascending: dir === "asc" });

  const { data, error } = await q.limit(500);
  if (error) console.error("[ORDERS GET]", JSON.stringify(error));
  assert(!error, 400, "Lỗi tải danh sách đơn hàng", "orders_fetch_failed", error?.message);  res.json({ items: data });
});

adminRouter.get("/admin/orders/:orderId", async (req, res) => {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("orders")
    .select("*, order_items(*, books(title, image_url, category_id))")
    .eq("order_id", req.params.orderId)
    .maybeSingle();
  assert(!error && data, 400, "Không tìm thấy đơn hàng", "order_not_found", error?.message);
  res.json({ item: data });
});

adminRouter.patch("/admin/orders/:orderId", async (req, res) => {
  const sb = createSupabaseAdmin();

  const schema = z.object({
    status: z.enum(["pending", "confirmed", "shipping", "delivered", "cancelled"]).optional(),
    payment_status: z.enum(["unpaid", "paid", "refunded"]).optional(),
    receiver_name: z.string().min(1, "Tên người nhận không được để trống.").optional(),
    receiver_phone: z.string().regex(/^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/, "Số điện thoại không hợp lệ.").optional().or(z.literal("")),
    shipping_address: z.string().min(1, "Địa chỉ không được để trống.").optional(),
    note: z.string().optional().nullable(),
    shipping_fee: z.number().min(0, "Phí ship không được âm.").optional()
  });
  const body = schema.parse(req.body ?? {});

  // Get current order to check status changes
  const { data: currentOrder, error: fetchErr } = await sb.from("orders").select("*").eq("order_id", req.params.orderId).maybeSingle();
  assert(!fetchErr && currentOrder, 400, "Không tìm thấy đơn hàng", "order_not_found");

  const updateData = { ...body };
  if (body.status && body.status !== currentOrder.status) {
    if (body.status === "confirmed") updateData.confirmed_at = new Date().toISOString();
    if (body.status === "delivered") updateData.delivered_at = new Date().toISOString();
    if (body.status === "cancelled") updateData.cancelled_at = new Date().toISOString();
  }

  if (body.shipping_fee !== undefined) {
    updateData.total = Number(currentOrder.subtotal || 0) + Number(body.shipping_fee) - Number(currentOrder.discount || 0);
  }

  const { data, error } = await sb
    .from("orders")
    .update(updateData)
    .eq("order_id", req.params.orderId)
    .select("*")
    .maybeSingle();

  assert(!error, 400, "Lỗi cập nhật đơn hàng", "order_update_failed", error?.message);

  // Send auto notification on status change
  if (body.status && body.status !== currentOrder.status) {
    const statusText = {
      pending: "Chờ xác nhận",
      confirmed: "Đã xác nhận",
      processing: "Đang xử lý",
      shipping: "Đang giao hàng",
      delivered: "Đã giao thành công",
      cancelled: "Đã hủy",
      returned: "Đã hoàn trả"
    }[body.status] || body.status;

    await sb.from("notifications").insert({
      user_id: data.user_id,
      title: "Cập nhật trạng thái đơn hàng",
      message: `Đơn hàng ${data.order_code} của bạn đã chuyển sang trạng thái: ${statusText}.`,
      type: "order",
      link: `/user/orders/${data.order_code}`
    });
  }

  res.json({ item: data });
});

adminRouter.delete("/admin/orders/:orderId", async (req, res) => {
  const sb = createSupabaseAdmin();
  const { error } = await sb.from("orders").delete().eq("order_id", req.params.orderId);
  assert(!error, 400, "Lỗi xóa đơn hàng", "order_delete_failed", error?.message);
  res.json({ ok: true });
});

// --- QUẢN LÝ GIỎ HÀNG (ADMIN) ---

adminRouter.get("/admin/carts", async (req, res) => {
  const search = (req.query.search || "").toString().toLowerCase().trim();
  const sort = (req.query.sort || "created_at-desc").toString();

  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("cart_items")
    .select("*, books(title, image_url, price, sale_price, is_on_sale, category_id)");

  assert(!error, 400, "Lỗi tải giỏ hàng", "carts_fetch_failed", error?.message);

  const userIds = [...new Set((data || []).map(i => i.user_id))];
  let profilesMap = new Map();
  if (userIds.length > 0) {
    const { data: profiles } = await sb.from("profiles").select("user_id, full_name, email, avatar_url").in("user_id", userIds);
    profilesMap = new Map((profiles || []).map(p => [p.user_id, p]));
  }

  let items = (data || []).map(item => ({
    ...item,
    user: profilesMap.get(item.user_id) || { email: "Unknown", full_name: "Unknown" }
  }));

  const searchBy = (req.query.searchBy || "all").toString();

  if (search) {
    items = items.filter(item => {
      const uName = (item.user?.full_name || "").toLowerCase();
      const uEmail = (item.user?.email || "").toLowerCase();
      const bTitle = (item.books?.title || "").toLowerCase();

      if (searchBy === "user_name") return uName.includes(search);
      if (searchBy === "user_email") return uEmail.includes(search);
      if (searchBy === "book_title") return bTitle.includes(search);

      return uName.includes(search) || uEmail.includes(search) || bTitle.includes(search);
    });
  }

  items.sort((a, b) => {
    const [field, dir] = sort.split("-");
    const mult = dir === "asc" ? 1 : -1;
    if (field === "user") {
      return ((a.user?.full_name || "") > (b.user?.full_name || "") ? 1 : -1) * mult;
    } else if (field === "book") {
      return ((a.books?.title || "") > (b.books?.title || "") ? 1 : -1) * mult;
    } else {
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * mult;
    }
  });

  res.json({ items });
});

adminRouter.post("/admin/carts", async (req, res) => {
  const sb = createSupabaseAdmin();
  const schema = z.object({
    user_id: z.string().uuid("User ID không hợp lệ."),
    book_id: z.string().min(1, "Mã sách không được để trống."),
    quantity: z.number({ invalid_type_error: "Số lượng phải là số." }).int().min(1, "Số lượng phải lớn hơn 0.")
  });
  const body = schema.parse(req.body ?? {});

  const { data: book } = await sb.from("books").select("book_id").eq("book_id", body.book_id).maybeSingle();
  assert(book, 400, "Sách không tồn tại", "book_not_found");

  const { data, error } = await sb
    .from("cart_items")
    .insert({ user_id: body.user_id, book_id: body.book_id, quantity: body.quantity })
    .select("*")
    .maybeSingle();

  assert(!error, 400, "Lỗi thêm giỏ hàng", "cart_add_failed", error?.message);
  res.json({ item: data });
});

adminRouter.patch("/admin/carts/:id", async (req, res) => {
  const sb = createSupabaseAdmin();
  const schema = z.object({
    quantity: z.number().int().min(1)
  });
  const body = schema.parse(req.body ?? {});

  const { data, error } = await sb.from("cart_items")
    .update({ quantity: body.quantity, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select("*")
    .maybeSingle();

  assert(!error, 400, "Lỗi cập nhật giỏ hàng", "cart_update_failed", error?.message);
  res.json({ item: data });
});

adminRouter.delete("/admin/carts/:id", async (req, res) => {
  const sb = createSupabaseAdmin();
  const { error } = await sb.from("cart_items").delete().eq("id", req.params.id);
  assert(!error, 400, "Lỗi xóa sản phẩm khỏi giỏ", "cart_delete_failed", error?.message);
  res.json({ ok: true });
});

// --- QUẢN LÝ THÔNG BÁO (ADMIN) ---

adminRouter.get("/admin/notifications", async (req, res) => {
  const sb = createSupabaseAdmin();
  const sort = (req.query.sort || "created_at-desc").toString();
  const search = (req.query.search || "").toString().trim();

  let q = sb.from("admin_notifications").select("*");

  if (search) {
    q = q.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
  }

  const [field, dir] = sort.split("-");
  q = q.order(field || "created_at", { ascending: dir === "asc" });

  const { data, error } = await q.limit(500);
  assert(!error, 400, "Lỗi tải lịch sử thông báo", "admin_notifications_fetch_failed", error?.message);

  res.json({ items: data });
});

adminRouter.get("/admin/notifications/:id", async (req, res) => {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb.from("admin_notifications").select("*").eq("id", req.params.id).maybeSingle();
  assert(!error && data, 400, "Không tìm thấy thông báo", "admin_notification_not_found", error?.message);
  res.json({ item: data });
});

adminRouter.post("/admin/notifications", async (req, res) => {
  const sb = createSupabaseAdmin();
  const schema = z.object({
    title: z.string().min(1, "Tiêu đề không được để trống"),
    message: z.string().min(1, "Nội dung không được để trống"),
    link: z.string().optional().nullable(),
    type: z.string().default("system"),
    recipients_type: z.enum(["all", "custom"]),
    recipient_ids: z.array(z.string()).optional()
  });
  const body = schema.parse(req.body ?? {});

  if (body.recipients_type === "custom" && (!body.recipient_ids || body.recipient_ids.length === 0)) {
    assert(false, 400, "Vui lòng chọn ít nhất một người nhận", "no_recipients");
  }

  // Create admin_notification
  const { data: adminNotif, error: anErr } = await sb.from("admin_notifications").insert({
    title: body.title,
    message: body.message,
    link: body.link,
    type: body.type,
    recipients_type: body.recipients_type,
    recipient_ids: body.recipients_type === "custom" ? body.recipient_ids : null
  }).select("*").maybeSingle();

  assert(!anErr, 400, "Lỗi tạo thông báo", "admin_notification_create_failed", anErr?.message);

  // Send to users
  let targetUserIds = [];
  if (body.recipients_type === "all") {
    const { data: users } = await sb.from("profiles").select("user_id").eq("is_active", true);
    if (users) targetUserIds = users.map(u => u.user_id);
  } else {
    targetUserIds = body.recipient_ids;
  }

  if (targetUserIds.length > 0) {
    const userNotifications = targetUserIds.map(uid => ({
      user_id: uid,
      title: adminNotif.title,
      message: adminNotif.message,
      link: adminNotif.link,
      type: adminNotif.type,
      related_entity_id: adminNotif.id
    }));

    // Insert in batches if many
    const chunkSize = 1000;
    for (let i = 0; i < userNotifications.length; i += chunkSize) {
      await sb.from("notifications").insert(userNotifications.slice(i, i + chunkSize));
    }
  }

  res.status(201).json({ item: adminNotif });
});

adminRouter.patch("/admin/notifications/:id", async (req, res) => {
  const sb = createSupabaseAdmin();
  const schema = z.object({
    title: z.string().min(1, "Tiêu đề không được để trống").optional(),
    message: z.string().min(1, "Nội dung không được để trống").optional(),
    link: z.string().optional().nullable(),
    type: z.string().optional()
  });
  const body = schema.parse(req.body ?? {});

  const { data, error } = await sb.from("admin_notifications")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select("*")
    .maybeSingle();

  assert(!error, 400, "Lỗi cập nhật thông báo", "admin_notification_update_failed", error?.message);

  // Update related user notifications
  await sb.from("notifications")
    .update({
      title: data.title,
      message: data.message,
      link: data.link,
      type: data.type
    })
    .eq("related_entity_id", data.id);

  res.json({ item: data });
});

adminRouter.delete("/admin/notifications/:id", async (req, res) => {
  const sb = createSupabaseAdmin();
  const { error } = await sb.from("admin_notifications").delete().eq("id", req.params.id);
  assert(!error, 400, "Lỗi xóa thông báo", "admin_notification_delete_failed", error?.message);

  // also delete from user notifications
  await sb.from("notifications").delete().eq("related_entity_id", req.params.id);

  res.json({ ok: true });
});

adminRouter.post("/admin/notifications/upload-image", async (req, res) => {
  const sb = createSupabaseAdmin();
  const schema = z.object({
    base64: z.string().min(1, "Thiếu dữ liệu ảnh"),
    contentType: z.string().min(1, "Thiếu định dạng ảnh")
  });
  const body = schema.parse(req.body ?? {});

  const base64Data = body.base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const ext = body.contentType.split("/")[1] || "jpg";
  const fileName = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;

  const { data, error } = await sb.storage
    .from("notification-history-images")
    .upload(fileName, buffer, {
      contentType: body.contentType,
      upsert: true
    });

  assert(!error, 400, "Lỗi upload ảnh", "upload_failed", error?.message);

  const { data: publicUrlData } = sb.storage
    .from("notification-history-images")
    .getPublicUrl(fileName);

  res.json({ url: publicUrlData.publicUrl });
});

