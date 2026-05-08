/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      cart.js
 * Mục đích:      Định tuyến các API quản lý giỏ hàng của người dùng đã đăng nhập.
 *                Giỏ hàng được lưu server-side trong bảng cart_items.
 * Các chức năng chính:
 *   - GET    /cart           : Lấy toàn bộ giỏ hàng kèm thông tin sách
 *   - POST   /cart           : Thêm sách vào giỏ (tự động tăng số lượng nếu đã có)
 *   - PATCH  /cart/:bookId   : Cập nhật số lượng một sản phẩm trong giỏ
 *   - DELETE /cart/:bookId   : Xóa một sản phẩm khỏi giỏ
 *   - DELETE /cart           : Xóa toàn bộ giỏ hàng
 *
 * Tên module:    Cart Management
 * Module liên quan: supabase.js, auth/verify.js, http/errors.js
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       Tất cả các route đều yêu cầu xác thực (requireUser).
 *                Kiểm tra tồn kho khi thêm/cập nhật để tránh đặt quá số lượng có sẵn.
 * ============================================================================
 */

import express from "express";
import { z } from "zod";
import { requireUser } from "../auth/verify.js";
import { createSupabaseUser } from "../supabase.js";
import { assert } from "../http/errors.js";

export const cartRouter = express.Router();

// Áp dụng requireUser cho tất cả các route bắt đầu bằng /cart
cartRouter.use("/cart", requireUser);

/**
 * Lấy toàn bộ giỏ hàng của người dùng hiện tại, kèm thông tin sách.
 * Sắp xếp theo thời gian thêm vào giỏ mới nhất trước.
 *
 * @route   GET /cart
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Request object, chứa `req.auth.jwt` và `req.auth.user.id`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ items: CartItem[] }` — mỗi item kèm thông tin sách.
 * @throws {HttpError} 400 nếu truy vấn database thất bại.
 */
cartRouter.get("/cart", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const userId = req.auth.user.id;

  const { data, error } = await sb
    .from("cart_items")
    .select("*, books(book_id, title, author, price, sale_price, is_on_sale, image_url, category_id, quantity)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  assert(!error, 400, "Lỗi tải giỏ hàng", "cart_fetch_failed", error?.message);
  res.json({ items: data || [] });
});

/**
 * Thêm sách vào giỏ hàng.
 * Nếu sách đã có trong giỏ, tự động cộng thêm số lượng thay vì tạo bản ghi mới.
 * Kiểm tra tồn kho trước khi thêm để đảm bảo không vượt quá số lượng có sẵn.
 *
 * @route   POST /cart
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Request body gồm:
 *   @param {string} req.body.book_id  - Mã sách cần thêm vào giỏ.
 *   @param {number} [req.body.quantity=1] - Số lượng cần thêm (tối thiểu 1).
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} HTTP 201 (thêm mới) hoặc 200 (cập nhật) với JSON `{ item: CartItem }`.
 * @throws {HttpError} 404 nếu sách không tồn tại.
 * @throws {HttpError} 400 nếu số lượng vượt quá tồn kho hoặc lỗi DB.
 */
cartRouter.post("/cart", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const userId = req.auth.user.id;

  const schema = z.object({
    book_id: z.string().min(1, "Mã sách không được để trống."),
    quantity: z.number({ invalid_type_error: "Số lượng phải là số." }).int().min(1, "Số lượng phải ít nhất là 1.").default(1)
  });
  const body = schema.parse(req.body ?? {});

  // Kiểm tra sách có tồn tại không
  const { data: book, error: bookErr } = await sb
    .from("books")
    .select("book_id, title, quantity")
    .eq("book_id", body.book_id)
    .maybeSingle();

  assert(!bookErr && book, 404, "Sách không tồn tại", "book_not_found");
  assert((book.quantity ?? 0) >= body.quantity, 400, `Sách '${book.title}' không đủ số lượng tồn kho.`, "out_of_stock");

  // Kiểm tra xem sách đã có trong giỏ chưa để quyết định insert hay update
  const { data: existing } = await sb
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("book_id", body.book_id)
    .maybeSingle();

  if (existing) {
    // Đã có trong giỏ → cộng thêm số lượng, kiểm tra lại tồn kho với tổng mới
    const newQty = existing.quantity + body.quantity;
    assert((book.quantity ?? 0) >= newQty, 400, `Số lượng vượt quá tồn kho (còn ${book.quantity}).`, "out_of_stock");

    const { data, error } = await sb
      .from("cart_items")
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*, books(book_id, title, author, price, sale_price, is_on_sale, image_url, category_id, quantity)")
      .maybeSingle();

    assert(!error, 400, "Lỗi cập nhật giỏ hàng", "cart_update_failed", error?.message);
    return res.json({ item: data });
  }

  // Chưa có trong giỏ → thêm mới
  const { data, error } = await sb
    .from("cart_items")
    .insert({ user_id: userId, book_id: body.book_id, quantity: body.quantity })
    .select("*, books(book_id, title, author, price, sale_price, is_on_sale, image_url, category_id, quantity)")
    .maybeSingle();

  assert(!error, 400, "Lỗi thêm vào giỏ hàng", "cart_add_failed", error?.message);
  res.status(201).json({ item: data });
});

/**
 * Cập nhật số lượng của một sản phẩm trong giỏ hàng.
 * Kiểm tra tồn kho trước khi cập nhật.
 *
 * @route   PATCH /cart/:bookId
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Route param: `bookId`. Body: `{ quantity: number }`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ item: CartItem }` với số lượng đã cập nhật.
 * @throws {HttpError} 400 nếu số lượng vượt tồn kho hoặc lỗi DB.
 * @throws {HttpError} 404 nếu không tìm thấy sản phẩm trong giỏ.
 */
cartRouter.patch("/cart/:bookId", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const userId = req.auth.user.id;
  const { bookId } = req.params;

  const schema = z.object({
    quantity: z.number({ invalid_type_error: "Số lượng phải là số." }).int().min(1, "Số lượng phải ít nhất là 1.")
  });
  const body = schema.parse(req.body ?? {});

  // Kiểm tra tồn kho — không bắt buộc (sách có thể đã bị xóa), chỉ kiểm tra nếu còn tồn tại
  const { data: book } = await sb
    .from("books")
    .select("title, quantity")
    .eq("book_id", bookId)
    .maybeSingle();

  if (book) {
    assert((book.quantity ?? 0) >= body.quantity, 400, `Sách '${book.title}' không đủ số lượng tồn kho (còn ${book.quantity}).`, "out_of_stock");
  }

  const { data, error } = await sb
    .from("cart_items")
    .update({ quantity: body.quantity, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .select("*, books(book_id, title, author, price, sale_price, is_on_sale, image_url, category_id, quantity)")
    .maybeSingle();

  assert(!error && data, 404, "Không tìm thấy sản phẩm trong giỏ hàng", "cart_item_not_found", error?.message);
  res.json({ item: data });
});

/**
 * Xóa một sản phẩm cụ thể khỏi giỏ hàng.
 *
 * @route   DELETE /cart/:bookId
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Route param: `bookId`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ ok: true }`.
 * @throws {HttpError} 400 nếu lỗi DB.
 */
cartRouter.delete("/cart/:bookId", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const userId = req.auth.user.id;
  const { bookId } = req.params;

  const { error } = await sb
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .eq("book_id", bookId);

  assert(!error, 400, "Lỗi xóa sản phẩm khỏi giỏ", "cart_delete_failed", error?.message);
  res.json({ ok: true });
});

/**
 * Xóa toàn bộ giỏ hàng của người dùng hiện tại.
 * Thường được gọi sau khi checkout thành công.
 *
 * @route   DELETE /cart
 * @access  Private (requireUser)
 * @async
 * @param {import("express").Request} req - Request object, chứa `req.auth.user.id`.
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ ok: true }`.
 * @throws {HttpError} 400 nếu lỗi DB.
 */
cartRouter.delete("/cart", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const userId = req.auth.user.id;

  const { error } = await sb
    .from("cart_items")
    .delete()
    .eq("user_id", userId);

  assert(!error, 400, "Lỗi xóa giỏ hàng", "cart_clear_failed", error?.message);
  res.json({ ok: true });
});
