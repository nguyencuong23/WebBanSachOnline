/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      chat.js
 * Mục đích:      Định tuyến API chat AI hỗ trợ khách hàng, tích hợp Groq LLM
 *                (llama-3.1-8b-instant) với dữ liệu thực từ cửa hàng (sách,
 *                đơn hàng, cài đặt) để trả lời câu hỏi của người dùng.
 * Các chức năng chính:
 *   - POST /chat              : Gửi tin nhắn và nhận phản hồi từ AI
 *   - webSearch()             : Tìm kiếm thông tin sách trên Wikipedia
 *   - buildStoreContext()     : Xây dựng context từ DB (sách, đơn hàng, cài đặt)
 *   - detectIntent()          : Phân tích intent để quyết định cần load dữ liệu gì
 *   - callGroq()              : Gọi Groq API với messages và tools
 *
 * Tên module:    AI Chat
 * Module liên quan: supabase.js, env.js, http/errors.js
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       Yêu cầu GROQ_API_KEY trong biến môi trường.
 *                Nếu user đã đăng nhập, AI có thể truy cập lịch sử đơn hàng.
 * ============================================================================
 */

import express from "express";
import { createSupabaseUser, createSupabaseAdmin } from "../supabase.js";
import { env } from "../env.js";
import { assert } from "../http/errors.js";
import { z } from "zod";

export const chatRouter = express.Router();

// Backend chatbot using Gemini

/**
 * Map trạng thái đơn hàng sang tiếng Việt để hiển thị trong chat.
 * @type {Record<string, string>}
 */
const ORDER_STATUS_VI = {
  pending: "Chờ xác nhận", confirmed: "Đã xác nhận", processing: "Đang xử lý",
  shipping: "Đang giao hàng", delivered: "Đã giao hàng", cancelled: "Đã hủy", returned: "Đã hoàn trả",
};
const PAYMENT_STATUS_VI = {
  unpaid: "Chưa thanh toán", pending_confirmation: "Chờ xác nhận thanh toán",
  paid: "Đã thanh toán", partially_refunded: "Hoàn tiền một phần", refunded: "Đã hoàn tiền",
};
const PAYMENT_METHOD_VI = {
  cod: "Thanh toán khi nhận hàng (COD)", bank_transfer: "Chuyển khoản ngân hàng",
};

/**
 * Định dạng số tiền sang chuỗi tiếng Việt (ví dụ: 150000 → "150.000đ").
 * @param {number|null|undefined} val - Giá trị cần định dạng.
 * @returns {string} Chuỗi tiền tệ hoặc "N/A" nếu không có giá trị.
 */
function fmt(val) {
  return val != null ? Number(val).toLocaleString("vi-VN") + "đ" : "N/A";
}
/**
 * Định dạng chuỗi ISO datetime sang dạng dd/MM/yyyy HH:mm.
 * @param {string|null|undefined} iso - Chuỗi ISO datetime.
 * @returns {string} Chuỗi ngày giờ đã định dạng hoặc "N/A".
 */
function fmtDate(iso) {
  if (!iso) return "N/A";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

/**
 * Tìm kiếm thông tin sách/series trên Wikipedia (không cần API key).
 * Dùng Wikipedia Search API để tìm bài viết phù hợp nhất, sau đó lấy tóm tắt.
 *
 * @async
 * @param {string} query - Tên sách/series cần tìm (nên dùng tiếng Anh hoặc tên gốc).
 * @returns {Promise<string|null>} Đoạn tóm tắt từ Wikipedia hoặc null nếu không tìm thấy.
 */
// ── Wikipedia search (không cần API key) ─────────────────────────────────────
async function webSearch(query) {
  try {
    const cleanQuery = query.replace(/[:"']/g, " ").replace(/\s+/g, " ").trim();
    const hasMediaType = /light novel|manga|anime|novel|book/i.test(cleanQuery);
    const searchQuery = hasMediaType ? cleanQuery : `${cleanQuery} light novel`;
    console.log(`[webSearch] "${searchQuery}"`);

    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&srlimit=3&utf8=1`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "BookstoreAI/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!searchRes.ok) return null;

    const hits = (await searchRes.json())?.query?.search || [];
    console.log(`[webSearch] hits:`, hits.map((h) => h.title));
    if (hits.length === 0) return null;

    const queryFirst = cleanQuery.toLowerCase().split(" ")[0];
    const bestHit = hits.find((h) => h.title.toLowerCase().includes(queryFirst)) || hits[0];

    const pageTitle = bestHit.title.replace(/ /g, "_");
    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`,
      { headers: { "User-Agent": "BookstoreAI/1.0" }, signal: AbortSignal.timeout(8000) }
    );
    if (!summaryRes.ok) return null;

    const summaryData = await summaryRes.json();
    const extract = summaryData?.extract || "";
    if (!extract) return null;
    return `[Wikipedia: "${summaryData.title}"]\n${extract.slice(0, 900)}`;
  } catch (err) {
    console.error("[webSearch error]", err?.message);
    return null;
  }
}

// ── Tool definition cho Groq (OpenAI format) ────────────────────────────────
const TOOLS = [{
  type: "function",
  function: {
    name: "search_book_info",
    description: "Tìm thông tin NỘI DUNG, CỐT TRUYỆN, TÁC GIẢ của sách/series trên Wikipedia. CHỈ dùng khi: (1) Khách hỏi về nội dung/cốt truyện của một cuốn sách CỤ THỂ (ví dụ: 'Arya là truyện gì', 'Re Zero nói về gì'), VÀ (2) Dữ liệu cửa hàng không có mô tả chi tiết. TUYỆT ĐỐI KHÔNG dùng cho câu hỏi về giá, tồn kho, mua hàng.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Tên sách/series bằng TIẾNG ANH hoặc tên gốc (romaji). Ví dụ: 'Alya Sometimes Hides Her Feelings in Russian' (không phải 'Arya Bàn Bên'), 'Re:Zero' (không phải 'Re:Zero - Bắt Đầu Lại'), 'Frieren: Beyond Journey's End' (không phải 'Frieren - Pháp Sư Tiễn Táng'). Thêm 'light novel' hoặc 'manga' để chính xác hơn.",
        },
      },
      required: ["query"],
    },
  },
}];

/**
 * Phân tích intent của cuộc hội thoại để quyết định cần load dữ liệu gì từ DB.
 * Tránh load dữ liệu không cần thiết để giảm latency và token context.
 *
 * @param {Array<{role: string, content: string}>} messages - Lịch sử hội thoại.
 * @returns {{ needsOrders: boolean, needsBooks: boolean, searchKeyword: string }}
 *   - needsOrders: true nếu user hỏi về đơn hàng/giao hàng/thanh toán
 *   - needsBooks: true nếu cần tìm sách trong DB
 *   - searchKeyword: từ khóa để tìm sách trong DB
 */
// ── Detect intent ─────────────────────────────────────────────────────────────
function detectIntent(messages) {
  const fullText = messages.map((m) => m.content).join(" ").toLowerCase();
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";

  const needsOrders = /đơn|don |order|giao hàng|giao hang|vận chuyển|van chuyen|ship|thanh toán|thanh toan|hủy|huy|trạng thái|trang thai|mã đơn|ma don|bp\d/i.test(fullText);

  // Follow-up về giá/mua: dùng toàn bộ conversation để tìm tên sách trong DB
  const isPriceFollowUp = /có bán|có không|giá bao nhiêu|bao nhiêu tiền|mua ở đâu|web có|shop có|cửa hàng có|còn hàng|hết hàng/i.test(lastUserMsg);

  // Follow-up về nội dung: cần search web
  const isContentFollowUp = /nói thêm|kể thêm|thêm thông tin|chi tiết hơn|thêm đi|thế nào|ra sao|như thế nào/i.test(lastUserMsg);

  const isFollowUp = isPriceFollowUp || isContentFollowUp;

  // Keyword để tìm trong DB: nếu follow-up thì lấy từ toàn bộ conversation
  const searchSource = isFollowUp
    ? messages.map((m) => m.content).join(" ")
    : lastUserMsg;
  const searchKeyword = searchSource.slice(0, 300);

  const needsBooks = !needsOrders || isFollowUp;

  return { needsOrders, needsBooks, searchKeyword };
}

/**
 * Xây dựng context string từ dữ liệu thực của cửa hàng để đưa vào system prompt.
 * Bao gồm: thông tin cửa hàng, danh sách sách phù hợp, lịch sử đơn hàng (nếu đăng nhập).
 *
 * @async
 * @param {string|null} jwt - JWT của user (null nếu chưa đăng nhập).
 * @param {Array<{role: string, content: string}>} messages - Lịch sử hội thoại để phân tích intent.
 * @returns {Promise<string>} Chuỗi context đã được định dạng để đưa vào system prompt.
 */
// ── Build store context ───────────────────────────────────────────────────────
async function buildStoreContext(jwt, messages) {
  const sbPublic = createSupabaseAdmin();
  const sbUser = jwt ? createSupabaseUser(jwt) : null;
  const { needsOrders, needsBooks, searchKeyword } = detectIntent(messages);

  // 1. Settings
  const { data: settingsRows } = await sbPublic.from("settings").select("key, value");
  const s = {};
  for (const row of settingsRows || []) s[row.key] = row.value;

  const storeInfo = `=== THÔNG TIN CỬA HÀNG ===
- Tên: ${s["store_name"] || "CCTV Bookstore"}
- Hotline: ${s["store_phone"] || "Chưa cài đặt"}
- Địa chỉ: ${s["store_address"] || "Chưa cài đặt"}
- Email: ${s["store_email"] || "Chưa cài đặt"}
${s["working_hours"] ? `- Giờ làm việc: ${s["working_hours"]}` : ""}
- Chuyển khoản: ${s["bank_info"] || "Liên hệ cửa hàng"}
=== CHÍNH SÁCH ===
- Phí ship: ${fmt(Number(s["DefaultShippingFee"] ?? 30000))} | Miễn phí ship từ: ${fmt(Number(s["FreeShippingThreshold"] ?? 300000))}
- Đổi trả: ${s["return_policy"] || "Liên hệ cửa hàng"}`;

  // 2. Sách
  let booksSection = "";
  if (needsBooks) {
    const { data: categories } = await sbPublic.from("categories").select("category_id, name").order("name");
    const categoryList = (categories || []).map((c) => `  - ${c.name} (${c.category_id})`).join("\n");

    const formatBook = (b) => {
      const priceStr = b.is_on_sale && b.sale_price
        ? `${fmt(b.sale_price)} (giảm từ ${fmt(b.price)})` : fmt(b.price);
      const stock = b.quantity > 0 ? `còn ${b.quantity} cuốn` : "HẾT HÀNG";
      return `  - "${b.title}" | ${b.author} | ${b.categories?.name || ""} | ${priceStr} | ${stock}`;
    };

    // Extract keywords — với follow-up về giá/mua, tìm tên sách từ TOÀN BỘ conversation
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const isPriceFollowUp = /có bán|co ban|có không|co khong|giá bao nhiêu|gia bao nhieu|bao nhiêu tiền|bao nhieu tien|mua ở đâu|mua o dau|web có|web co|shop có|shop co|cửa hàng có|cua hang co|còn hàng|con hang|hết hàng|het hang/i.test(lastUserMsg);

    // Bỏ qua tin nhắn chào đầu tiên của assistant (nếu có) khi quét từ khóa cuộc hội thoại
    const conversationMsgs = messages[0]?.role === "assistant" ? messages.slice(1) : messages;

    // Nếu là follow-up về giá → tìm tên sách từ TOÀN BỘ conversation (bao gồm cả assistant replies)
    // ƯU TIÊN tin nhắn mới nhất bằng cách đảo ngược thứ tự cuộc hội thoại trước khi nối chuỗi, giúp các từ khóa mới nhất không bị cắt mất khi slice(0, 10)
    const keywordSource = isPriceFollowUp
      ? [...conversationMsgs].reverse().map((m) => m.content).join(" ")
      : lastUserMsg;

    // Stopwords Set giúp lọc từ tiếng Việt chuẩn xác không bị lỗi word boundary (\b) của Regex JS với Unicode
    const stopWordsSet = new Set([
      "có", "không", "cho", "tôi", "xem", "mua", "tìm", "hỏi", "về", "của", "nào", "thế", "nói", "thêm", "kể", 
      "chi tiết", "giá", "bao nhiêu", "còn", "hàng", "cuốn", "sách", "book", "truyện", "hay", "phết", "vậy", "đi", 
      "đó", "này", "kia", "ơi", "ạ", "nhé", "nha", "ok", "oke", "nói về", "kể về", "nội dung", "cốt truyện", 
      "web", "shop", "cửa hàng", "bán", "co", "khong", "cho", "tim", "hoi", "ve", "cua", "nao", "the", "noi", 
      "them", "ke", "gia", "bao", "nhieu", "con", "hang", "cuon", "sach", "truyen", "hay", "vay", "di", "do", 
      "nay", "kia", "nha", "ok", "oke", "à", "thế", "ko", "mấy", "cái", "kiểu", "như", "chả", "hạn", "là", 
      "ở", "đâu", "được", "với", "và", "hoặc", "nhưng", "tại", "vì", "nên", "thì", "lại", "thích", "đọc", "cơ", "gì", "nào",
      "alo", "chào", "bạn", "thể", "giúp", "hôm", "nay", "ngày", "xin", "nghe", "anh", "chị", "em", "quý", "khách", "đến",
      "mình", "các", "tín", "đồ", "tất", "cả", "những", "nhiều", "bộ", "tập", "bản", "tiểu", "thuyết", "loại", "thể", "ủa", "vậy"
    ]);
    
    // Giữ lại các cụm từ quan trọng như "re zero", "light novel" và chuyển về chữ thường
    const cleanedKeyword = keywordSource
      .toLowerCase()
      .replace(/re\s+zero/gi, "rezero") // Gộp "re zero" thành 1 từ
      .replace(/light\s+novel/gi, "lightnovel"); // Gộp "light novel"
    
    // Tách từ theo khoảng trắng hoặc các ký tự đặc biệt khác
    const rawWords = cleanedKeyword.split(/[\s,.:;!?()""'']+/).filter(Boolean);
    const keywords = rawWords
      .filter((w) => !stopWordsSet.has(w) && w.length >= 2)
      .slice(0, 10); // Tăng giới hạn lên 10 để tránh lọc sót từ khóa chính
      
    console.log(`[DB search] isPriceFollowUp=${isPriceFollowUp} keywords:`, keywords);

    let searchedBooks = [];
    if (keywords.length > 0) {
      // Tạo search patterns linh hoạt hơn
      const searchPatterns = keywords.flatMap(kw => {
        const patterns = [`title.ilike.%${kw}%`, `author.ilike.%${kw}%`];
        // Nếu keyword là "rezero" thì tìm cả "re zero", "re:zero"
        if (kw.toLowerCase() === 'rezero') {
          patterns.push(`title.ilike.%re zero%`, `title.ilike.%re:zero%`);
        }
        // Nếu keyword là "lightnovel" thì tìm cả "light novel"
        if (kw.toLowerCase() === 'lightnovel') {
          patterns.push(`title.ilike.%light novel%`);
        }
        return patterns;
      });
      
      const orConditions = searchPatterns.join(",");
      const { data } = await sbPublic
        .from("books")
        .select("book_id, title, author, price, sale_price, is_on_sale, quantity, categories(name)")
        .eq("is_published", true)
        .or(orConditions)
        .order("created_at", { ascending: false })
        .limit(20);
      searchedBooks = data || [];
    }

    if (searchedBooks.length > 0) {
      booksSection = `
=== THỂ LOẠI SÁCH ===
${categoryList || "  Chưa có dữ liệu"}

=== KẾT QUẢ TÌM KIẾM TRONG CỬA HÀNG (${searchedBooks.length} cuốn) ===
${searchedBooks.map(formatBook).join("\n")}

⚠️ QUAN TRỌNG: 
- Đã tìm thấy ${searchedBooks.length} cuốn sách phù hợp trong cửa hàng
- Khi khách hỏi về GIÁ/TỒN KHO/MUA HÀNG → dùng dữ liệu trên, KHÔNG gọi search_book_info
- Chỉ gọi search_book_info nếu khách hỏi về NỘI DUNG/CỐT TRUYỆN và cần thêm thông tin`;
    } else {
      const { data: saleBooks } = await sbPublic.from("books")
        .select("book_id, title, author, price, sale_price, is_on_sale, quantity, categories(name)")
        .eq("is_published", true).eq("is_on_sale", true).not("sale_price", "is", null)
        .order("created_at", { ascending: false }).limit(8);
      const { data: latestBooks } = await sbPublic.from("books")
        .select("book_id, title, author, price, sale_price, is_on_sale, quantity, categories(name)")
        .eq("is_published", true).order("created_at", { ascending: false }).limit(8);
      const { data: topItems } = await sbPublic.from("order_items").select("book_id, quantity").limit(500);
      const countMap = {};
      for (const row of topItems || []) countMap[row.book_id] = (countMap[row.book_id] || 0) + row.quantity;
      const topIds = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
      const { data: bsBooks } = topIds.length
        ? await sbPublic.from("books")
            .select("book_id, title, author, price, sale_price, is_on_sale, quantity, categories(name)")
            .in("book_id", topIds).eq("is_published", true)
        : { data: [] };

      booksSection = `
=== THỂ LOẠI SÁCH ===
${categoryList || "  Chưa có dữ liệu"}

=== KHÔNG TÌM THẤY SÁCH PHÙ HỢP TRONG CỬA HÀNG ===
Nếu khách hỏi về nội dung/cốt truyện của một cuốn sách cụ thể → dùng tool search_book_info.
Nếu khách hỏi về giá/mua hàng → gợi ý các sách dưới đây hoặc nói không có sách họ tìm.

=== SÁCH ĐANG KHUYẾN MÃI (${(saleBooks || []).length} cuốn) ===
${(saleBooks || []).length > 0 ? (saleBooks || []).map(formatBook).join("\n") : "  Hiện không có"}

=== SÁCH MỚI NHẤT (${(latestBooks || []).length} cuốn) ===
${(latestBooks || []).length > 0 ? (latestBooks || []).map(formatBook).join("\n") : "  Chưa có dữ liệu"}

=== SÁCH BÁN CHẠY NHẤT (${(bsBooks || []).length} cuốn) ===
${(bsBooks || []).length > 0 ? (bsBooks || []).map(formatBook).join("\n") : "  Chưa có dữ liệu"}`;
    }
  }

  // 3. Đơn hàng
  let ordersSection = "";
  if (needsOrders) {
    if (!sbUser) {
      ordersSection = `\n=== ĐƠN HÀNG ===\nKhách chưa đăng nhập.`;
    } else {
      const { data: profile } = await sbUser.from("profiles")
        .select("full_name, email, phone_number, loyalty_points, default_address").maybeSingle();
      const { data: orders } = await sbUser.from("orders")
        .select("order_id, order_code, status, payment_method, payment_status, receiver_name, receiver_phone, shipping_address, note, subtotal, shipping_fee, discount, total, voucher_code, created_at")
        .order("created_at", { ascending: false }).limit(20);
      if (!orders || orders.length === 0) {
        ordersSection = `\n=== KHÁCH HÀNG ===\n- Tên: ${profile?.full_name || "N/A"}\n\n=== ĐƠN HÀNG ===\nChưa có đơn hàng nào.`;
      } else {
        const orderIds = orders.map((o) => o.order_id);
        const { data: allItems } = await sbUser.from("order_items")
          .select("order_id, quantity, unit_price, line_total, books(title, author)")
          .in("order_id", orderIds);
        const itemsByOrder = {};
        for (const item of allItems || []) {
          if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
          itemsByOrder[item.order_id].push(item);
        }
        const orderLines = orders.map((o) => {
          const items = (itemsByOrder[o.order_id] || [])
            .map((i) => `      + "${i.books?.title}" - ${i.books?.author} | SL: ${i.quantity} | ${fmt(i.unit_price)} | ${fmt(i.line_total)}`)
            .join("\n");
          return [
            `  [${o.order_code}] ${fmtDate(o.created_at)}`,
            `  Trạng thái: ${ORDER_STATUS_VI[o.status] || o.status} | ${PAYMENT_STATUS_VI[o.payment_status] || o.payment_status} (${PAYMENT_METHOD_VI[o.payment_method] || o.payment_method})`,
            `  Giao đến: ${o.shipping_address} | ${o.receiver_name} (${o.receiver_phone})`,
            o.voucher_code ? `  Voucher: ${o.voucher_code}` : null,
            o.note ? `  Ghi chú: ${o.note}` : null,
            `  Tạm tính: ${fmt(o.subtotal)} | Ship: ${fmt(o.shipping_fee)} | Giảm: ${fmt(o.discount)} | TỔNG: ${fmt(o.total)}`,
            items ? `  Sản phẩm:\n${items}` : null,
          ].filter(Boolean).join("\n");
        });
        ordersSection = `
=== KHÁCH HÀNG ===
- Tên: ${profile?.full_name || "N/A"} | Email: ${profile?.email || "N/A"} | SĐT: ${profile?.phone_number || "N/A"}
- Điểm tích lũy: ${profile?.loyalty_points ?? 0} | Địa chỉ mặc định: ${profile?.default_address || "Chưa cài đặt"}
=== LỊCH SỬ ĐƠN HÀNG (${orders.length} đơn) ===
${orderLines.join("\n\n")}`;
      }
    }
  } else if (jwt) {
    const sbU = createSupabaseUser(jwt);
    const { data: profile } = await sbU.from("profiles").select("full_name, loyalty_points").maybeSingle();
    ordersSection = `\n=== KHÁCH HÀNG ===\n- Tên: ${profile?.full_name || "N/A"} | Điểm tích lũy: ${profile?.loyalty_points ?? 0}`;
  } else {
    ordersSection = `\n=== TRẠNG THÁI ===\nKhách chưa đăng nhập.`;
  }

  return [storeInfo, booksSection, ordersSection].filter(Boolean).join("\n\n").trim();
}

/**
 * Gọi OpenRouter API để lấy phản hồi từ LLM.
 *
 * @async
 * @param {Array<{role: string, content: string}>} msgs - Danh sách messages gửi lên OpenRouter.
 * @param {string} apiKey - API key của OpenRouter.
 * @returns {Promise<object>} Response JSON từ OpenRouter API.
 * @throws {Error} Ném lỗi với httpStatus nếu OpenRouter trả về lỗi.
 */
// Định nghĩa tools (Function Calling) chuẩn cho Gemini REST API
const GEMINI_TOOLS = [
  {
    function_declarations: [
      {
        name: "search_book_info",
        description: "Tìm thông tin NỘI DUNG, CỐT TRUYỆN, TÁC GIẢ của sách/series trên Wikipedia. CHỈ dùng khi: (1) Khách hỏi về nội dung/cốt truyện của một cuốn sách CỤ THỂ (ví dụ: 'Arya là truyện gì', 'Re Zero nói về gì'), VÀ (2) Dữ liệu cửa hàng không có mô tả chi tiết. TUYỆT ĐỐI KHÔNG dùng cho câu hỏi về giá, tồn kho, mua hàng.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description: "Tên sách/series bằng TIẾNG ANH hoặc tên gốc (romaji). Ví dụ: 'Alya Sometimes Hides Her Feelings in Russian' (không phải 'Arya Bàn Bên'), 'Re:Zero' (không phải 'Re:Zero - Bắt Đầu Lại'), 'Frieren: Beyond Journey\'s End' (không phải 'Frieren - Pháp Sư Tiễn Táng'). Thêm 'light novel' hoặc 'manga' để chính xác hơn."
            }
          },
          required: ["query"]
        }
      }
    ]
  }
];

// URL endpoint của Google Gemini API
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent";

// ── Gọi Google Gemini API ────────────────────────────────────────────────────────
async function callGemini(msgs, apiKey) {
  const systemMsg = msgs.find(m => m.role === "system");
  const chatMsgs = msgs.filter(m => m.role !== "system").map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }]
  }));

  let currentChatMsgs = [...chatMsgs];
  let loopCount = 0;

  while (loopCount < 5) {
    loopCount++;
    const body = {
      contents: currentChatMsgs,
      systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
      tools: GEMINI_TOOLS,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.3,
      }
    };

    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error("[Gemini API error]", res.status, JSON.stringify(errBody));
      const status = res.status;
      const message = status === 429
        ? "AI đang bận, vui lòng thử lại sau vài giây."
        : "Lỗi kết nối AI Chatbot (Gemini)";
      const code = status === 429 ? "rate_limited" : "gemini_error";
      throw Object.assign(new Error(message), { httpStatus: status, code });
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (part?.functionCall) {
      const { name, args } = part.functionCall;
      console.log(`[Gemini Function Call] Executing: ${name} with`, args);

      // Nếu model gọi hàm không tồn tại hoặc không được hỗ trợ
      if (name !== "search_book_info") {
        console.warn(`[Gemini Function Call] Unsupported function call: ${name}`);
        return { choices: [{ message: { content: "Xin lỗi, Shop chưa hỗ trợ tính năng tự động này. Bạn vui lòng liên hệ hotline hoặc làm theo hướng dẫn trên website để được hỗ trợ nhé." } }] };
      }

      let result = await webSearch(args.query);

      // Thêm lượt gọi hàm của model vào lịch sử
      currentChatMsgs.push({
        role: "model",
        parts: [part]
      });

      // Thêm phản hồi của hàm vào lịch sử
      currentChatMsgs.push({
        role: "function",
        parts: [
          {
            functionResponse: {
              name,
              response: {
                content: result || "Không tìm thấy thông tin trên Wikipedia"
              }
            }
          }
        ]
      });

      // Tiếp tục vòng lặp để gửi kết quả về cho Gemini trả lời
      continue;
    }

    const text = part?.text;
    return { choices: [{ message: { content: text } }] };
  }

  // Fallback nếu lặp quá 5 lần (đề phòng vòng lặp vô hạn)
  return { choices: [{ message: { content: "Xin lỗi, Shop không thể xử lý yêu cầu này lúc này. Bạn vui lòng thử lại sau nhé." } }] };
}

/**
 * Xử lý tin nhắn chat từ người dùng và trả về phản hồi từ AI.
 * Quy trình: validate → lấy JWT (nếu có) → build store context → gọi Groq → trả về reply.
 *
 * @route   POST /chat
 * @access  Public (JWT tùy chọn — nếu có sẽ load thêm đơn hàng của user)
 * @async
 * @param {import("express").Request} req - Request body:
 *   @param {Array<{role: "user"|"assistant", content: string}>} req.body.messages
 *     Lịch sử hội thoại (tối đa 50 tin, mỗi tin tối đa 2000 ký tự).
 * @param {import("express").Response} res - Response object.
 * @returns {Promise<void>} JSON `{ reply: string }`.
 * @throws {HttpError} 503 nếu chưa cấu hình GROQ_API_KEY.
 * @throws {HttpError} 429 nếu Groq rate limit.
 */
// ── POST /chat ────────────────────────────────────────────────────────────────
chatRouter.post("/chat", async (req, res) => {
  assert(env.geminiApiKey, 503, "Tính năng chat AI chưa được cấu hình", "chat_not_configured");

  const schema = z.object({
    messages: z.array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      })
    ).min(1).max(50),
  });

  const { messages } = schema.parse(req.body ?? {});
  const jwt = (req.header("authorization") || "").replace(/^Bearer\s+/i, "").trim() || null;

  const storeContext = await buildStoreContext(jwt, messages);

  const systemPrompt = `Bạn là trợ lý AI chính thức của cửa hàng sách CCTV Bookstore.

QUY TẮC QUAN TRỌNG - ĐỌC KỸ:

1. **LUÔN ƯU TIÊN DỮ LIỆU CỬA HÀNG:**
   - Nếu có "KẾT QUẢ TÌM KIẾM TRONG CỬA HÀNG" → dùng dữ liệu đó để trả lời MỌI câu hỏi về sách (giá, tồn kho, tác giả, v.v.)
   - Khi khách hỏi follow-up ("giá bao nhiêu", "còn hàng không") → XEM LẠI dữ liệu cửa hàng đã có trong context

2. **KHI KHÁCH HỎI VỀ NỘI DUNG/CỐT TRUYỆN/TÁC GIẢ:**
   - Nếu dữ liệu cửa hàng không có mô tả chi tiết → Hãy gọi tool \`search_book_info\` để tra cứu thông tin trên Wikipedia.
   - Chỉ trả lời "Xin lỗi, Shop không tìm thấy thông tin chi tiết về nội dung sách này" nếu đã dùng tool mà vẫn không tìm thấy kết quả.

3. **XỬ LÝ FOLLOW-UP:**
   - Khi khách hỏi "giá bao nhiêu" sau khi đã nói về một cuốn sách → tìm lại thông tin sách đó trong dữ liệu đã có

4. **KHÔNG BỊA ĐẶT:**
   - Chỉ dùng thông tin giá cả, số lượng tồn kho có trong dữ liệu cửa hàng. Tuyệt đối KHÔNG được tự ý bịa đặt giá cả hoặc số lượng của sách.
   - Nếu không tìm thấy sách trong cửa hàng → báo thẳng là cửa hàng chưa có hàng, và gợi ý các sách tương tự khác.

5. **ĐĂNG NHẬP:**
   - Nếu khách hỏi đơn hàng mà chưa đăng nhập → yêu cầu đăng nhập

6. **PHONG CÁCH & ĐỊNH DẠNG:**
   - Trả lời tiếng Việt, ngắn gọn, thân thiện, tự nhiên.
   - Nhất quán xưng hô: Tự xưng là "Shop", gọi khách hàng là "bạn" hoặc "quý khách". Tuyệt đối KHÔNG lúc xưng "em", lúc xưng "mình", lúc xưng "shop", hoặc gọi khách là "bạn ơi", "cậu" trong cùng một phiên chat.
   - Luôn trả lời trọn vẹn, đầy đủ ý, không bỏ dở câu nói hay ngắt quãng giữa chừng.
   - Hạn chế tối đa việc sử dụng ký tự in đậm \`**\`. Chỉ được dùng \`**\` duy nhất để in đậm tên sách (ví dụ: **Nhà Giả Kim**, **Re:Zero**). Tuyệt đối không dùng \`**\` để in đậm giá tiền, tập số, chương, tên tác giả, tiêu đề, hoặc các từ ngữ khác trong câu trả lời (ví dụ: KHÔNG viết \`**Tập 1:**\`, KHÔNG viết \`**Giá bán:**\`).
   - Không dài dòng, không lặp lại thông tin không cần thiết.

7. **GIỚI HẠN NĂNG LỰC:**
   - Bạn chỉ là trợ lý AI tư vấn. Bạn KHÔNG có quyền hạn hoặc công cụ để thực hiện các thay đổi dữ liệu như: đặt giữ hàng (reserve/hold), đặt giao hàng, thanh toán trực tiếp, hoặc chỉnh sửa thông tin đơn hàng.
   - Tuyệt đối KHÔNG tự ý đề xuất hoặc hỏi khách hàng làm những việc ngoài tầm kiểm soát của bạn (ví dụ: KHÔNG hỏi "Bạn có muốn Shop giữ hàng cho bạn không?").
   - Nếu khách hàng yêu cầu thực hiện hoặc đề nghị bạn làm các việc ngoài khả năng, hãy trả lời lịch sự: "Xin lỗi, Shop chưa hỗ trợ tính năng tự động này. Bạn vui lòng liên hệ hotline hoặc làm theo hướng dẫn trên website để được hỗ trợ nhé."

--- DỮ LIỆU CỬA HÀNG ---
${storeContext}
--- HẾT DỮ LIỆU ---

LƯU Ý: Dữ liệu trên đã bao gồm tất cả thông tin về sách có trong cửa hàng. Hãy sử dụng nó một cách thông minh!`;

  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  try {
    // Gọi Gemini API
    const response = await callGemini(groqMessages, env.geminiApiKey);
    const reply = response?.choices?.[0]?.message?.content || "Xin lỗi, tôi không thể trả lời lúc này.";
    return res.json({ reply });

  } catch (err) {
    if (err.httpStatus === 429) {
      return res.status(429).json({ error: { code: "rate_limited", message: err.message } });
    }
    throw err; // để express-async-errors xử lý
  }
});

// reload
