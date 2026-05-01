import express from "express";
import { z } from "zod";
import { requireUser } from "../auth/verify.js";
import { createSupabaseUser } from "../supabase.js";
import { assert } from "../http/errors.js";

export const ordersRouter = express.Router();

ordersRouter.get("/orders", requireUser, async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const { data, error } = await sb
    .from("orders")
    .select("*")
    .eq("user_id", req.auth.user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  assert(!error, 400, "Failed to fetch orders", "orders_fetch_failed", error?.message);
  res.json({ items: data });
});

ordersRouter.get("/orders/:id", requireUser, async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const idParam = req.params.id;

  let query = sb.from("orders").select("*").eq("user_id", req.auth.user.id);

  if (/^\d+$/.test(idParam)) {
    query = query.eq("order_id", Number(idParam));
  } else {
    query = query.eq("order_code", idParam);
  }

  const { data: order, error: oErr } = await query.maybeSingle();
  assert(!oErr, 400, "Failed to fetch order", "order_fetch_failed", oErr?.message);
  assert(order, 404, "Order not found", "not_found");

  const { data: items, error: iErr } = await sb
    .from("order_items")
    .select("*, books(*)")
    .eq("order_id", order.order_id)
    .order("order_item_id");
  assert(!iErr, 400, "Failed to fetch order items", "order_items_fetch_failed", iErr?.message);

  res.json({ order, items });
});

// Cancel order (only if pending)
ordersRouter.patch("/orders/:orderId/cancel", requireUser, async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const orderId = Number(req.params.orderId);
  assert(Number.isFinite(orderId), 400, "Invalid order id", "invalid_request");

  // Verify ownership and status
  const { data: order, error: fErr } = await sb
    .from("orders")
    .select("status, user_id")
    .eq("order_id", orderId)
    .maybeSingle();
  
  assert(!fErr, 400, "Failed to check order", "check_failed", fErr?.message);
  assert(order, 404, "Order not found", "not_found");
  assert(order.user_id === req.auth.user.id, 403, "You don't have permission to cancel this order", "forbidden");
  assert(order.status === "pending", 400, "Only pending orders can be cancelled", "invalid_status");

  const { error: uErr } = await sb
    .from("orders")
    .update({ status: "cancelled" })
    .eq("order_id", orderId);
  
  assert(!uErr, 400, "Failed to cancel order", "cancel_failed", uErr?.message);

  const { data: items } = await sb.from("order_items").select("book_id, quantity").eq("order_id", orderId);
  if (items) {
    for (const item of items) {
      const { data: book } = await sb.from("books").select("quantity").eq("book_id", item.book_id).single();
      if (book) {
        await sb.from("books").update({ quantity: book.quantity + item.quantity }).eq("book_id", item.book_id);
      }
    }
  }

  res.json({ message: "Order cancelled successfully" });
});

// Checkout: place order (server-side stock check & decrement)
ordersRouter.post("/checkout", requireUser, async (req, res) => {
  const schema = z.object({
    receiver_name: z.string().trim().min(1).max(100),
    receiver_phone: z.string().trim().min(8).max(15),
    shipping_address: z.string().trim().min(1).max(300),
    note: z.string().trim().max(500).optional(),
    payment_method: z.enum(["cod", "bank_transfer"]),
    bank_transfer_reference: z.string().trim().max(100).optional(),
    voucher_code: z.string().trim().toUpperCase().optional().nullable(),
    lines: z
      .array(
        z.object({
          book_id: z.string().min(1),
          quantity: z.number().int().min(1).max(99)
        })
      )
      .min(1)
  });

  const body = schema.parse(req.body ?? {});
  const sb = createSupabaseUser(req.auth.jwt);

  // Fetch books for pricing/stock
  const bookIds = [...new Set(body.lines.map((x) => x.book_id))];
  const { data: books, error: bErr } = await sb
    .from("books")
    .select("*")
    .in("book_id", bookIds);
  assert(!bErr, 400, "Failed to load books", "books_fetch_failed", bErr?.message);
  assert(books && books.length === bookIds.length, 400, "Some books not found", "invalid_request");

  for (const line of body.lines) {
    const b = books.find((x) => x.book_id === line.book_id);
    assert(b?.is_published, 400, `Book '${line.book_id}' is not available`, "out_of_stock");
    assert((b?.quantity ?? 0) >= line.quantity, 400, `Book '${line.book_id}' out of stock`, "out_of_stock");
  }

  const subtotal = body.lines.reduce((sum, line) => {
    const b = books.find((x) => x.book_id === line.book_id);
    const unit = b.sale_price ?? b.price;
    return sum + Number(unit) * line.quantity;
  }, 0);

  // Shipping fee from settings
  const { data: shipFeeSetting } = await sb.from("settings").select("*").eq("key", "DefaultShippingFee").maybeSingle();
  const { data: freeSetting } = await sb.from("settings").select("*").eq("key", "FreeShippingThreshold").maybeSingle();
  const defaultFee = Number(shipFeeSetting?.value ?? 30000);
  const freeThreshold = Number(freeSetting?.value ?? 300000);
  const shipping_fee = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : Math.max(defaultFee, 0);

  // Voucher discount
  let discount = 0;
  let appliedVoucherCode = null;
  if (body.voucher_code) {
    const { createSupabaseAnon } = await import("../supabase.js");
    const sbAnon = createSupabaseAnon();
    const { data: voucher } = await sbAnon
      .from("vouchers")
      .select("*")
      .eq("code", body.voucher_code)
      .eq("is_active", true)
      .maybeSingle();

    if (voucher && new Date(voucher.valid_until) > new Date()) {
      const rawDiscount = Math.floor((subtotal * voucher.discount_percent) / 100);
      discount = voucher.max_discount_amount > 0
        ? Math.min(rawDiscount, voucher.max_discount_amount)
        : rawDiscount;
      appliedVoucherCode = voucher.code;
    }
  }

  const total = subtotal + shipping_fee - discount;
  const now = new Date();
  const order_code = `BP${now.toISOString().slice(0, 19).replace(/[-:T]/g, "")}${Math.floor(
    100 + Math.random() * 900
  )}`;

  const payment_status = body.payment_method === "bank_transfer" ? "paid" : "unpaid";

  // Insert order
  const { data: order, error: oErr } = await sb
    .from("orders")
    .insert({
      user_id: req.auth.user.id,
      order_code,
      status: "pending",
      payment_method: body.payment_method,
      payment_status,
      receiver_name: body.receiver_name,
      receiver_phone: body.receiver_phone,
      shipping_address: body.shipping_address,
      note: body.note ?? null,
      subtotal,
      shipping_fee,
      discount,
      total,
      voucher_code: appliedVoucherCode,
      bank_transfer_reference: body.payment_method === "bank_transfer" ? body.bank_transfer_reference ?? null : null
    })
    .select("*")
    .maybeSingle();
  assert(!oErr, 400, "Failed to create order", "order_create_failed", oErr?.message);
  assert(order, 400, "Failed to create order", "order_create_failed");

  // Insert items
  const itemsToInsert = body.lines.map((line) => {
    const b = books.find((x) => x.book_id === line.book_id);
    const unit = b.sale_price ?? b.price;
    return {
      order_id: order.order_id,
      book_id: line.book_id,
      unit_price: unit,
      quantity: line.quantity,
      line_total: Number(unit) * line.quantity
    };
  });
  const { error: itErr } = await sb.from("order_items").insert(itemsToInsert);
  assert(!itErr, 400, "Failed to create order items", "order_items_create_failed", itErr?.message);

  for (const line of body.lines) {
    const b = books.find((x) => x.book_id === line.book_id);
    const newQty = (b.quantity ?? 0) - line.quantity;
    const { error: uErr } = await sb.from("books").update({ quantity: newQty }).eq("book_id", line.book_id);
    assert(!uErr, 400, "Failed to update stock", "stock_update_failed", uErr?.message);
  }

  const { error: cErr } = await sb.from("cart_items").delete().eq("user_id", req.auth.user.id);
  if (cErr) console.error("Failed to clear cart:", cErr);

  res.status(201).json({ order_id: order.order_id, order_code: order.order_code });
});


