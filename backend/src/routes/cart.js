/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: cart.js
 * Mục đích của file: Định nghĩa các API endpoints liên quan đến giỏ hàng.
 * Các chức năng chính: Lấy danh sách giỏ hàng, thêm sản phẩm vào giỏ, cập nhật số lượng, xóa sản phẩm khỏi giỏ, xóa toàn bộ giỏ hàng.
 * Phiên bản: 1.0.0
 * Tác giả: Antigravity
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: Cart API Route
 * Mục đích của module: Xử lý logic nghiệp vụ và định tuyến HTTP cho các thao tác giỏ hàng.
 * Phạm vi xử lý: Nhận request, xác thực quyền (requireUser), thao tác database (Supabase) bảng `cart_items` và `books`, trả về JSON.
 * Các thành phần chính trong module: Express Router, zod validation, Supabase client.
 * Module liên quan: auth/verify.js (Xác thực), routes/books.js (Sản phẩm).
 * ============================================================================
 */
import express from "express";
import { z } from "zod";
import { requireUser } from "../auth/verify.js";
import { createSupabaseUser } from "../supabase.js";
import { assert } from "../http/errors.js";

export const cartRouter = express.Router(); // Ý nghĩa: Đối tượng quản lý các route API của giỏ hàng; Giá trị: Express Router instance

// Tất cả các route đều yêu cầu đăng nhập
cartRouter.use("/cart", requireUser);

/**
 * Tên function: GET /cart
 * Mục đích của function: Lấy toàn bộ danh sách sản phẩm trong giỏ hàng của user hiện tại (kèm thông tin chi tiết của sách).
 * Tham số đầu vào: req (Express Request), res (Express Response).
 * Giá trị trả về: JSON object chứa danh sách items `{ items: Array }`.
 * Điều kiện xử lý: Yêu cầu JWT hợp lệ (đã qua middleware requireUser).
 * Lỗi có thể phát sinh: Lỗi truy vấn database (mã lỗi 400).
 */
cartRouter.get("/cart", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt); // Ý nghĩa: Khởi tạo Supabase client có gắn JWT của user; Lý do: Đảm bảo Row Level Security (RLS)
  const userId = req.auth.user.id; // Ý nghĩa: ID của người dùng đang gửi request; Giá trị: UUID string

  const { data, error } = await sb
    .from("cart_items")
    .select("*, books(book_id, title, author, price, sale_price, is_on_sale, image_url, category_id, quantity)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  assert(!error, 400, "Lỗi tải giỏ hàng", "cart_fetch_failed", error?.message);
  res.json({ items: data || [] });
});

/**
 * Tên function: POST /cart
 * Mục đích của function: Thêm một sản phẩm mới vào giỏ hàng hoặc tăng số lượng nếu đã tồn tại.
 * Tham số đầu vào: req (có chứa body với `book_id` và `quantity`), res.
 * Giá trị trả về: JSON object chứa thông tin item vừa thêm/cập nhật `{ item: Object }`.
 * Điều kiện xử lý: Validate tham số bằng zod, kiểm tra sách có tồn tại và còn đủ số lượng tồn kho hay không.
 * Lỗi có thể phát sinh: 
 *  - 400: Lỗi validate dữ liệu, không đủ tồn kho, lỗi database.
 *  - 404: Không tìm thấy sách.
 */
cartRouter.post("/cart", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt); // Ý nghĩa: Khởi tạo Supabase client có quyền của user
  const userId = req.auth.user.id; // Ý nghĩa: ID user

  const schema = z.object({
    book_id: z.string().min(1, "Mã sách không được để trống."),
    quantity: z.number({ invalid_type_error: "Số lượng phải là số." }).int().min(1, "Số lượng phải ít nhất là 1.").default(1)
  }); // Ý nghĩa: Schema validate dữ liệu đầu vào; Giá trị: Zod object
  const body = schema.parse(req.body ?? {}); // Ý nghĩa: Dữ liệu body đã được validate; Giá trị: object có book_id, quantity

  // Kiểm tra sách có tồn tại không
  const { data: book, error: bookErr } = await sb
    .from("books")
    .select("book_id, title, quantity")
    .eq("book_id", body.book_id)
    .maybeSingle(); // Ý nghĩa: Thông tin sách truy vấn từ database; Lý do: Kiểm tra tồn kho trước khi cho vào giỏ

  assert(!bookErr && book, 404, "Sách không tồn tại", "book_not_found");
  assert((book.quantity ?? 0) >= body.quantity, 400, `Sách '${book.title}' không đủ số lượng tồn kho.`, "out_of_stock");

  // Kiểm tra xem đã có trong giỏ chưa
  const { data: existing } = await sb
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("book_id", body.book_id)
    .maybeSingle(); // Ý nghĩa: Thông tin sản phẩm này đã có trong giỏ của user chưa

  if (existing) {
    // Đã có => tăng số lượng
    const newQty = existing.quantity + body.quantity; // Ý nghĩa: Số lượng mới sau khi cộng dồn; Giá trị: số nguyên
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

/**
 * Tên function: PATCH /cart/:bookId
 * Mục đích của function: Cập nhật lại số lượng cố định của một sản phẩm trong giỏ hàng.
 * Tham số đầu vào: req (params: `bookId`, body: `quantity`), res.
 * Giá trị trả về: JSON object chứa thông tin item đã cập nhật `{ item: Object }`.
 * Điều kiện xử lý: Validate body quantity, số lượng mới không được lớn hơn tồn kho.
 * Lỗi có thể phát sinh:
 *  - 400: Không đủ tồn kho hoặc lỗi database.
 *  - 404: Không tìm thấy sản phẩm trong giỏ hàng.
 */
cartRouter.patch("/cart/:bookId", async (req, res) => {
  const sb = createSupabaseUser(req.auth.jwt); // Ý nghĩa: Khởi tạo Supabase client
  const userId = req.auth.user.id; // Ý nghĩa: ID user
  const { bookId } = req.params; // Ý nghĩa: Mã sách cần cập nhật; Giá trị: chuỗi UUID hoặc text

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

/**
 * Tên function: DELETE /cart/:bookId
 * Mục đích của function: Xóa một sản phẩm cụ thể khỏi giỏ hàng.
 * Tham số đầu vào: req (params chứa `bookId`), res.
 * Giá trị trả về: JSON `{ ok: true }` nếu thành công.
 * Điều kiện xử lý: Khớp cả user_id và book_id.
 * Lỗi có thể phát sinh: 400 nếu có lỗi khi xóa từ database.
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
 * Tên function: DELETE /cart
 * Mục đích của function: Xóa toàn bộ sản phẩm trong giỏ hàng của user.
 * Tham số đầu vào: req, res.
 * Giá trị trả về: JSON `{ ok: true }` nếu thành công.
 * Điều kiện xử lý: Xóa theo user_id.
 * Lỗi có thể phát sinh: 400 nếu lỗi database.
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
