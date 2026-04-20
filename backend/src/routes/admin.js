import express from "express";
import { z } from "zod";
import { requireUser, requireAdmin } from "../auth/verify.js";
import { createSupabaseUser } from "../supabase.js";
import { assert } from "../http/errors.js";

export const adminRouter = express.Router();

adminRouter.use("/admin", requireUser, requireAdmin);

adminRouter.get("/admin/dashboard/summary", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);

  const [{ data: books }, { data: users }, { data: orders }] = await Promise.all([
    sb.from("books").select("quantity", { count: "exact" }),
    sb.from("profiles").select("user_id", { count: "exact" }).eq("role", "user"),
    sb.from("orders").select("status,payment_method,payment_status,total,created_at", { count: "exact" })
  ]);

  const totalBooks = (books || []).reduce((s, b) => s + (b.quantity || 0), 0);
  const totalTitles = books?.length || 0;
  const totalCustomers = users?.length || 0;
  const totalOrders = orders?.length || 0;

  const pendingOrders = (orders || []).filter((o) => o.status === "pending").length;
  const pendingBankTransfers = (orders || []).filter(
    (o) => o.payment_method === "bank_transfer" && o.payment_status === "pending_confirmation"
  ).length;

  const today = new Date().toISOString().slice(0, 10);
  const ordersToday = (orders || []).filter((o) => (o.created_at || "").slice(0, 10) === today).length;

  const now = new Date();
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const revenueThisMonth = (orders || [])
    .filter((o) => (o.created_at || "").slice(0, 7) === ym && o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total || 0), 0);

  res.json({
    totalBooks,
    totalTitles,
    totalCustomers,
    totalOrders,
    pendingOrders,
    pendingBankTransfers,
    ordersToday,
    revenueThisMonth
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

  const totalBooks = (books || []).reduce((s, b) => s + (b.quantity || 0), 0);
  const totalCustomers = customers?.length || 0;

  const totalPending = (orders || []).filter((o) => o.status === "pending").length;
  const totalShipping = (orders || []).filter((o) => o.status === "shipping").length;
  const totalDelivered = (orders || []).filter((o) => o.status === "delivered").length;
  const totalCancelled = (orders || []).filter((o) => o.status === "cancelled").length;

  // Top selling books (aggregated client-side)
  const { data: topBooksRaw } = await sb
    .from("order_items")
    .select("book_id,quantity,line_total,orders(status),books(title,author)")
    .limit(2000);

  const agg = new Map();
  for (const it of topBooksRaw || []) {
    if (it.orders?.status === "cancelled") continue;
    const prev = agg.get(it.book_id) || { title: it.books?.title, author: it.books?.author, soldQuantity: 0, revenue: 0 };
    prev.soldQuantity += Number(it.quantity || 0);
    prev.revenue += Number(it.line_total || 0);
    agg.set(it.book_id, prev);
  }
  const topBooks = [...agg.values()].sort((a, b) => b.soldQuantity - a.soldQuantity).slice(0, 5);

  // Category stats (count books per category)
  const { data: booksForCats } = await sb.from("books").select("category_id");
  const catCount = new Map();
  for (const b of booksForCats || []) catCount.set(b.category_id, (catCount.get(b.category_id) || 0) + 1);
  const categoryStats = (categories || []).map((c) => ({ label: c.name, count: catCount.get(c.category_id) || 0 }));

  res.json({
    totalBooks,
    totalCustomers,
    totalPending,
    totalShipping,
    totalDelivered,
    totalCancelled,
    recentOrders: recentOrders || [],
    topBooks,
    categoryStats
  });
});

adminRouter.get("/admin/monthly-stats", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const year = new Date().getUTCFullYear();

  const { data: orders, error } = await sb
    .from("orders")
    .select("created_at,status")
    .gte("created_at", `${year}-01-01T00:00:00Z`)
    .lt("created_at", `${year + 1}-01-01T00:00:00Z`);
  assert(!error, 400, "Failed to fetch monthly stats", "stats_fetch_failed", error?.message);

  const counts = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: 0 }));
  for (const o of orders || []) {
    if (o.status === "cancelled") continue;
    const m = Number(String(o.created_at).slice(5, 7));
    if (m >= 1 && m <= 12) counts[m - 1].count += 1;
  }
  res.json(counts);
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

  const orderVolume = dayKeys.map((k) => ({ date: k, count: volumeMap.get(k) || 0 }));
  const revenue = dayKeys.map((k) => ({ date: k, revenue: revenueMap.get(k) || 0 }));

  res.json({ orderVolume, revenue });
});

adminRouter.get("/admin/orders", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const status = (req.query.status || "").toString();
  const payment_method = (req.query.paymentMethod || "").toString();

  let q = sb.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
  if (status) q = q.eq("status", status);
  if (payment_method) q = q.eq("payment_method", payment_method);

  const { data, error } = await q;
  assert(!error, 400, "Failed to fetch orders", "orders_fetch_failed", error?.message);
  res.json({ items: data });
});

adminRouter.get("/admin/orders/:orderId", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const orderId = Number(req.params.orderId);
  assert(Number.isFinite(orderId), 400, "Invalid order id", "invalid_request");

  const { data: order, error: oErr } = await sb.from("orders").select("*").eq("order_id", orderId).maybeSingle();
  assert(!oErr, 400, "Failed to fetch order", "order_fetch_failed", oErr?.message);
  assert(order, 404, "Order not found", "not_found");

  const { data: items, error: iErr } = await sb
    .from("order_items")
    .select("*, books(*)")
    .eq("order_id", orderId);
  assert(!iErr, 400, "Failed to fetch order items", "order_items_fetch_failed", iErr?.message);
  res.json({ order, items });
});

adminRouter.post("/admin/orders/:orderId/confirm-bank-transfer", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const orderId = Number(req.params.orderId);

  const { data: order, error: oErr } = await sb.from("orders").select("*").eq("order_id", orderId).maybeSingle();
  assert(!oErr, 400, "Failed to fetch order", "order_fetch_failed", oErr?.message);
  assert(order, 404, "Order not found", "not_found");
  assert(order.payment_method === "bank_transfer", 400, "Not a bank transfer order", "invalid_request");

  const { data: updated, error } = await sb
    .from("orders")
    .update({
      payment_status: "paid",
      status: order.status === "pending" ? "confirmed" : order.status,
      confirmed_at: order.confirmed_at || new Date().toISOString()
    })
    .eq("order_id", orderId)
    .select("*")
    .maybeSingle();
  assert(!error, 400, "Failed to confirm", "order_update_failed", error?.message);
  res.json({ order: updated });
});

adminRouter.post("/admin/orders/:orderId/status", async (req, res) => {
  const schema = z.object({ status: z.enum(["pending", "confirmed", "processing", "shipping", "delivered", "cancelled"]) });
  const body = schema.parse(req.body ?? {});

  const sb = createSupabaseUser(req.auth.jwt);
  const orderId = Number(req.params.orderId);
  const now = new Date().toISOString();

  const patch = { status: body.status };
  if (body.status === "confirmed") patch.confirmed_at = now;
  if (body.status === "delivered") patch.delivered_at = now;
  if (body.status === "cancelled") patch.cancelled_at = now;

  const { data, error } = await sb.from("orders").update(patch).eq("order_id", orderId).select("*").maybeSingle();
  assert(!error, 400, "Failed to update status", "order_update_failed", error?.message);
  res.json({ order: data });
});

adminRouter.post("/admin/orders/:orderId/cancel", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const orderId = Number(req.params.orderId);
  assert(Number.isFinite(orderId), 400, "Invalid order id", "invalid_request");

  const { data: order, error: oErr } = await sb.from("orders").select("*").eq("order_id", orderId).maybeSingle();
  assert(!oErr, 400, "Failed to fetch order", "order_fetch_failed", oErr?.message);
  assert(order, 404, "Order not found", "not_found");
  assert(order.status !== "delivered", 400, "Cannot cancel delivered order", "invalid_request");
  assert(order.status !== "cancelled", 400, "Order already cancelled", "invalid_request");

  const { data: items, error: iErr } = await sb.from("order_items").select("book_id,quantity").eq("order_id", orderId);
  assert(!iErr, 400, "Failed to fetch order items", "order_items_fetch_failed", iErr?.message);

  for (const it of items || []) {
    const { data: b, error: bErr } = await sb.from("books").select("quantity").eq("book_id", it.book_id).maybeSingle();
    assert(!bErr, 400, "Failed to fetch book", "book_fetch_failed", bErr?.message);
    const newQty = Number(b?.quantity || 0) + Number(it.quantity || 0);
    const { error: uErr } = await sb.from("books").update({ quantity: newQty }).eq("book_id", it.book_id);
    assert(!uErr, 400, "Failed to restock", "stock_update_failed", uErr?.message);
  }

  const { data: updated, error: uErr2 } = await sb
    .from("orders")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .select("*")
    .maybeSingle();
  assert(!uErr2, 400, "Failed to cancel order", "order_update_failed", uErr2?.message);

  res.json({ order: updated });
});

adminRouter.get("/admin/users", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const role = (req.query.role || "").toString();
  const active = (req.query.active || "").toString();

  let q = sb.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
  if (role) q = q.eq("role", role);
  if (active) q = q.eq("is_active", active === "true");
  const { data, error } = await q;
  assert(!error, 400, "Failed to fetch users", "users_fetch_failed", error?.message);
  res.json({ items: data });
});

adminRouter.patch("/admin/users/:userId", async (req, res) => {
  const schema = z.object({
    full_name: z.string().trim().min(1).max(100).optional(),
    email: z.string().email().max(100).optional(),
    phone_number: z.string().trim().min(8).max(15).optional(),
    is_active: z.boolean().optional(),
    role: z.enum(["admin", "user"]).optional()
  });
  const body = schema.parse(req.body ?? {});

  const sb = createSupabaseUser(req.auth.jwt);
  const userId = req.params.userId;
  const { data, error } = await sb.from("profiles").update(body).eq("user_id", userId).select("*").maybeSingle();
  assert(!error, 400, "Failed to update user", "user_update_failed", error?.message);
  res.json({ item: data });
});

