/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      orders.js
 * Mục đích:      Định tuyến các API liên quan đến đơn hàng của người dùng,
 *                bao gồm xem danh sách đơn, xem chi tiết, hủy đơn và đặt hàng (checkout).
 * Các chức năng chính:
 *   - GET  /orders              : Lấy danh sách đơn hàng của người dùng hiện tại.
 *   - GET  /orders/:id          : Lấy chi tiết một đơn hàng (theo order_id hoặc order_code).
 *   - PATCH /orders/:orderId/cancel : Hủy đơn hàng (chỉ khi trạng thái là "pending").
 *   - POST /checkout            : Đặt hàng mới — kiểm tra tồn kho, tính phí ship,
 *                                 áp dụng voucher, tạo đơn và trừ kho.
 *
 * Tên module:    Order Management
 * Module liên quan: auth/verify.js, supabase.js, http/errors.js, routes/vouchers.js
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       Tất cả các route đều yêu cầu xác thực (requireUser).
 *                Logic checkout được thực hiện hoàn toàn phía server để đảm bảo
 *                tính toàn vẹn dữ liệu tồn kho và giá tiền.
 * ============================================================================
 */

import express from "express";
import { z } from "zod";
import { requireUser } from "../auth/verify.js";
import { createSupabaseUser } from "../supabase.js";
import { assert } from "../http/errors.js";

export const ordersRouter = express.Router();

/**
 * Lấy danh sách tất cả đơn hàng của người dùng đang đăng nhập.
 * Kết quả được sắp xếp theo thời gian tạo mới nhất, giới hạn 200 đơn.
 *
 * @route   GET /orders
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Request object, chứa `req.auth.jwt` và `req.auth.user.id`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ items: Order[] }` — danh sách đơn hàng.
 * @throws {HttpError} 400 nếu truy vấn database thất bại.
 */
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

/**
 * Lấy chi tiết một đơn hàng cùng với danh sách sản phẩm trong đơn.
 * Tham số `:id` có thể là số nguyên (order_id) hoặc chuỗi mã đơn (order_code).
 *
 * @route   GET /orders/:id
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Request object, chứa `req.params.id`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ order: Order, items: OrderItem[] }`.
 * @throws {HttpError} 400 nếu truy vấn thất bại, 404 nếu không tìm thấy đơn hàng.
 */
ordersRouter.get("/orders/:id", requireUser, async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const idParam = req.params.id;

  // Bắt đầu query với điều kiện sở hữu — chỉ trả về đơn của chính người dùng.
  let query = sb.from("orders").select("*").eq("user_id", req.auth.user.id);

  // Phân biệt tìm theo order_id (số nguyên) hay order_code (chuỗi ký tự).
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

/**
 * Hủy một đơn hàng đang ở trạng thái "pending".
 * Sau khi hủy, số lượng tồn kho của từng sản phẩm trong đơn sẽ được hoàn trả.
 *
 * @route   PATCH /orders/:orderId/cancel
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Request object, chứa `req.params.orderId`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ message: string }` xác nhận hủy thành công.
 * @throws {HttpError} 400 nếu orderId không hợp lệ hoặc đơn không ở trạng thái "pending".
 * @throws {HttpError} 403 nếu người dùng không phải chủ sở hữu đơn hàng.
 * @throws {HttpError} 404 nếu không tìm thấy đơn hàng.
 */
ordersRouter.patch("/orders/:orderId/cancel", requireUser, async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const orderId = Number(req.params.orderId);
  assert(Number.isFinite(orderId), 400, "Invalid order id", "invalid_request");

  // Xác minh quyền sở hữu và trạng thái đơn hàng trước khi cho phép hủy.
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

  // Hoàn trả tồn kho: duyệt từng sản phẩm trong đơn và cộng lại số lượng đã đặt.
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

/**
 * Xử lý luồng đặt hàng (checkout) hoàn toàn phía server.
 * Bao gồm: validate dữ liệu đầu vào, kiểm tra tồn kho, tính phí ship,
 * áp dụng voucher, tạo đơn hàng, tạo chi tiết đơn, trừ kho và xóa giỏ hàng.
 *
 * @route   POST /checkout
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Request body gồm:
 *   @param {string}   req.body.receiver_name           - Tên người nhận (1–100 ký tự).
 *   @param {string}   req.body.receiver_phone          - Số điện thoại người nhận (8–15 ký tự).
 *   @param {string}   req.body.shipping_address        - Địa chỉ giao hàng (1–300 ký tự).
 *   @param {string}   [req.body.note]                  - Ghi chú đơn hàng (tối đa 500 ký tự).
 *   @param {"cod"|"bank_transfer"} req.body.payment_method - Phương thức thanh toán.
 *   @param {string}   [req.body.bank_transfer_reference] - Mã tham chiếu chuyển khoản (nếu có).
 *   @param {string}   [req.body.voucher_code]          - Mã voucher giảm giá (tùy chọn).
 *   @param {Array<{book_id: string, quantity: number}>} req.body.lines - Danh sách sản phẩm đặt mua.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} HTTP 201 với JSON `{ order_id: number, order_code: string }`.
 * @throws {HttpError} 400 nếu validate thất bại, sách không tồn tại, hết hàng, hoặc lỗi DB.
 */
ordersRouter.post("/checkout", requireUser, async (req, res) => {
  // Schema validate toàn bộ body đầu vào bằng Zod.
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

  // BƯỚC 1: Lấy thông tin sách để kiểm tra giá và tồn kho.
  // Dùng Set để loại bỏ book_id trùng lặp trong danh sách đặt hàng.
  const bookIds = [...new Set(body.lines.map((x) => x.book_id))];
  const { data: books, error: bErr } = await sb
    .from("books")
    .select("*")
    .in("book_id", bookIds);
  assert(!bErr, 400, "Failed to load books", "books_fetch_failed", bErr?.message);
  assert(books && books.length === bookIds.length, 400, "Some books not found", "invalid_request");

  // BƯỚC 2: Kiểm tra từng sản phẩm — phải được xuất bản và còn đủ số lượng tồn kho.
  for (const line of body.lines) {
    const b = books.find((x) => x.book_id === line.book_id);
    assert(b?.is_published, 400, `Book '${line.book_id}' is not available`, "out_of_stock");
    assert((b?.quantity ?? 0) >= line.quantity, 400, `Book '${line.book_id}' out of stock`, "out_of_stock");
  }

  // BƯỚC 3: Tính tổng tiền hàng (subtotal).
  // Ưu tiên dùng sale_price nếu có, ngược lại dùng price gốc.
  const subtotal = body.lines.reduce((sum, line) => {
    const b = books.find((x) => x.book_id === line.book_id);
    const unit = b.sale_price ?? b.price;
    return sum + Number(unit) * line.quantity;
  }, 0);

  // BƯỚC 4: Tính phí vận chuyển dựa trên cài đặt hệ thống.
  // Nếu subtotal đạt ngưỡng miễn phí ship (FreeShippingThreshold) thì shipping_fee = 0.
  const { data: shipFeeSetting } = await sb.from("settings").select("*").eq("key", "DefaultShippingFee").maybeSingle();
  const { data: freeSetting } = await sb.from("settings").select("*").eq("key", "FreeShippingThreshold").maybeSingle();
  // Phí ship mặc định nếu không có cài đặt: 30.000đ.
  const defaultFee = Number(shipFeeSetting?.value ?? 30000);
  // Ngưỡng miễn phí ship mặc định nếu không có cài đặt: 300.000đ.
  const freeThreshold = Number(freeSetting?.value ?? 300000);
  const shipping_fee = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : Math.max(defaultFee, 0);

  // BƯỚC 5: Kiểm tra và áp dụng voucher giảm giá (nếu có).
  // Dùng Supabase anon client để truy vấn voucher (không cần quyền user).
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
      // Tính số tiền giảm theo phần trăm, làm tròn xuống để tránh số lẻ.
      const rawDiscount = Math.floor((subtotal * voucher.discount_percent) / 100);
      // Giới hạn số tiền giảm tối đa nếu voucher có quy định max_discount_amount.
      discount = voucher.max_discount_amount > 0
        ? Math.min(rawDiscount, voucher.max_discount_amount)
        : rawDiscount;
      appliedVoucherCode = voucher.code;
    }
  }

  // BƯỚC 6: Tính tổng tiền cuối cùng và sinh mã đơn hàng duy nhất.
  const total = subtotal + shipping_fee - discount;
  const now = new Date();
  // Mã đơn hàng: Lấy từ frontend truyền lên (để quét QR trước) HOẶC tự tạo mới
  const order_code = body.order_code || `BP${now.toISOString().slice(0, 19).replace(/[-:T]/g, "")}${Math.floor(
    100 + Math.random() * 900
  )}`;

  // Đơn hàng luôn ở trạng thái unpaid lúc mới tạo, webhook sẽ chuyển thành paid sau
  const payment_status = "unpaid";

  // BƯỚC 7: Lưu đơn hàng vào database.
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
      total
    })
    .select("*")
    .maybeSingle();
  assert(!oErr, 400, "Failed to create order", "order_create_failed", oErr?.message);
  assert(order, 400, "Failed to create order", "order_create_failed");

  // BƯỚC 8: Lưu chi tiết từng sản phẩm trong đơn (order_items).
  // Snapshot lại đơn giá tại thời điểm đặt để tránh thay đổi giá sau này ảnh hưởng lịch sử.
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

  // BƯỚC 9: Trừ tồn kho cho từng sản phẩm đã đặt.
  for (const line of body.lines) {
    const b = books.find((x) => x.book_id === line.book_id);
    // Số lượng tồn kho mới sau khi trừ đi số lượng đặt mua.
    const newQty = (b.quantity ?? 0) - line.quantity;
    const { error: uErr } = await sb.from("books").update({ quantity: newQty }).eq("book_id", line.book_id);
    assert(!uErr, 400, "Failed to update stock", "stock_update_failed", uErr?.message);
  }

  // BƯỚC 10: Xóa toàn bộ giỏ hàng của người dùng sau khi đặt hàng thành công.
  // Lỗi xóa giỏ hàng không làm hỏng đơn hàng — chỉ log để theo dõi.
  const { error: cErr } = await sb.from("cart_items").delete().eq("user_id", req.auth.user.id);
  if (cErr) console.error("Failed to clear cart:", cErr);

  res.status(201).json({ order_id: order.order_id, order_code: order.order_code });
});
