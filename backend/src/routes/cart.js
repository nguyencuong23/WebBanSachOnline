import express from "express";
import { z } from "zod";
import { requireUser } from "../auth/verify.js";
import { createSupabaseUser } from "../supabase.js";
import { assert } from "../http/errors.js";

export const cartRouter = express.Router();

// Tất cả các route đều yêu cầu đăng nhập
cartRouter.use("/cart", requireUser);

// GET /cart - Lấy toàn bộ giỏ hàng của user hiện tại (kèm thông tin sách)
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

// POST /cart - Thêm sản phẩm vào giỏ hàng (nếu đã có thì tăng số lượng)
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

  // Kiểm tra xem đã có trong giỏ chưa
  const { data: existing } = await sb
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("book_id", body.book_id)
    .maybeSingle();

  if (existing) {
    // Đã có => tăng số lượng
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

  // Chưa có => thêm mới
  const { data, error } = await sb
    .from("cart_items")
    .insert({ user_id: userId, book_id: body.book_id, quantity: body.quantity })
    .select("*, books(book_id, title, author, price, sale_price, is_on_sale, image_url, category_id, quantity)")
    .maybeSingle();

  assert(!error, 400, "Lỗi thêm vào giỏ hàng", "cart_add_failed", error?.message);
  res.status(201).json({ item: data });
});

// PATCH /cart/:bookId - Cập nhật số lượng sản phẩm trong giỏ
cartRouter.patch("/cart/:bookId", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt);
  const userId = req.auth.user.id;
  const { bookId } = req.params;

  const schema = z.object({
    quantity: z.number({ invalid_type_error: "Số lượng phải là số." }).int().min(1, "Số lượng phải ít nhất là 1.")
  });
  const body = schema.parse(req.body ?? {});

  // Kiểm tra tồn kho
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

// DELETE /cart/:bookId - Xóa một sản phẩm khỏi giỏ
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

// DELETE /cart - Xóa toàn bộ giỏ hàng của user
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
