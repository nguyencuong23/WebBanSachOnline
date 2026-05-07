/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file: chat.js
 * Mục đích của file: Cung cấp API tích hợp AI Chatbot hỗ trợ khách hàng.
 * Các chức năng chính: Gọi Groq API, tìm kiếm thông tin cửa hàng, lấy thông tin sách, đơn hàng và tìm trên Wikipedia (khi cần).
 * Phiên bản: 1.0.0
 * Tác giả: Nguyễn Mạnh Cường
 * Ngày tạo: 2026-05-07
 * Ngày cập nhật: 2026-05-07
 * 
 * Tên module: AI Chat Route
 * Mục đích của module: Định tuyến HTTP cho tính năng trợ lý ảo.
 * Phạm vi xử lý: Tổng hợp dữ liệu từ Supabase, phân tích intent và gửi context cho LLM (Llama-3).
 * Các thành phần chính trong module: Express Router, Zod validation, Groq API client, Wikipedia Search.
 * Module liên quan: env.js (API Keys), supabase.js (DB client).
 * ============================================================================
 */
import express from "express";
import { createSupabaseUser, createSupabaseAdmin } from "../supabase.js";
import { env } from "../env.js";
import { assert } from "../http/errors.js";
import { z } from "zod";

export const chatRouter = express.Router(); // Ý nghĩa: Router chứa endpoint chat AI; Giá trị: Express Router instance

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant"; // Model nhỏ nhưng ổn định

const ORDER_STATUS_VI = {
  pending: "Chờ xác nhận", confirmed: "Đã xác nhận", processing: "Đang xử lý",
  shipping: "Đang giao hàng", delivered: "Đã giao hàng", cancelled: "Đã hủy", returned: "Đã hoàn trả",
}; // Ý nghĩa: Map trạng thái đơn hàng tiếng Anh sang tiếng Việt
const PAYMENT_STATUS_VI = {
  unpaid: "Chưa thanh toán", pending_confirmation: "Chờ xác nhận thanh toán",
  paid: "Đã thanh toán", partially_refunded: "Hoàn tiền một phần", refunded: "Đã hoàn tiền",
}; // Ý nghĩa: Map trạng thái thanh toán
const PAYMENT_METHOD_VI = {
  cod: "Thanh toán khi nhận hàng (COD)", bank_transfer: "Chuyển khoản ngân hàng",
}; // Ý nghĩa: Map phương thức thanh toán

/**
 * Tên function: fmt
 * Mục đích của function: Format số tiền theo định dạng Việt Nam đồng.
 * Tham số đầu vào: val (Number/String)
 * Giá trị trả về: Chuỗi tiền tệ (VD: "100.000đ")
 */
function fmt(val) {
  return val != null ? Number(val).toLocaleString("vi-VN") + "đ" : "N/A";
}

/**
 * Tên function: fmtDate
 * Mục đích của function: Format thời gian ISO sang định dạng ngày giờ Việt Nam (DD/MM/YYYY HH:mm).
 * Tham số đầu vào: iso (Chuỗi ISO 8601)
 * Giá trị trả về: Chuỗi thời gian.
 */
function fmtDate(iso) {
  if (!iso) return "N/A";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

/**
 * Tên function: webSearch
 * Mục đích của function: Tìm kiếm thông tin trên Wikipedia (Dùng cho nội dung sách/series).
 * Tham số đầu vào: query (Chuỗi tìm kiếm)
 * Giá trị trả về: Chuỗi tóm tắt từ Wikipedia hoặc null.
 * Điều kiện xử lý: Gọi API Wikipedia, có timeout 8s.
 * Lỗi có thể phát sinh: Lỗi mạng, API từ chối. Được catch và trả về null.
 */
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
 * Tên function: detectIntent
 * Mục đích của function: Phân tích lịch sử chat để đoán ý định (intent) của người dùng.
 * Tham số đầu vào: messages (Mảng các tin nhắn)
 * Giá trị trả về: Object `{ needsOrders, needsBooks, searchKeyword }`
 * Điều kiện xử lý: Dùng regex để check keyword.
 * Lỗi có thể phát sinh: Không có.
 */
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
 * Tên function: buildStoreContext
 * Mục đích của function: Xây dựng chuỗi văn bản (context) chứa thông tin cửa hàng, sách, và đơn hàng để nhồi vào prompt cho AI.
 * Tham số đầu vào: jwt (JSON Web Token của user), messages (Lịch sử chat)
 * Giá trị trả về: Chuỗi string context.
 * Điều kiện xử lý: Dựa trên intent để truy vấn DB (settings, books, orders, profiles).
 * Lỗi có thể phát sinh: Không có (Bắt lỗi từ supabase được bỏ qua hoặc fallback).
 */
async function buildStoreContext(jwt, messages) {
  const sbPublic = createSupabaseAdmin();
  const sbUser = jwt ? createSupabaseUser(jwt) : null;
  const { needsOrders, needsBooks, searchKeyword } = detectIntent(messages);

  // 1. Settings
  const { data: settingsRows } = await sbPublic.from("settings").select("key, value");
  const s = {};
  for (const row of settingsRows || []) s[row.key] = row.value;

  const storeInfo = `=== THÔNG TIN CỬA HÀNG ===
- Tên: ${s["store_name"] || "Cửa hàng sách"}
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

    // Nếu là follow-up về giá → tìm tên sách từ TOÀN BỘ conversation (bao gồm cả assistant replies)
    // Vì tên sách có thể xuất hiện trong câu trả lời của AI
    const keywordSource = isPriceFollowUp
      ? messages.map((m) => m.content).join(" ")
      : lastUserMsg;

    // Stopwords nhẹ hơn - chỉ xóa các từ thật sự không liên quan
    const stopWords = /\b(có|không|cho|tôi|xem|mua|tìm|hỏi|về|của|nào|thế|nói|thêm|kể|chi tiết|giá|bao nhiêu|còn|hàng|cuốn|sách|book|truyện|hay|phết|vậy|đi|đó|này|kia|ơi|ạ|nhé|nha|ok|oke|nói về|kể về|nội dung|cốt truyện|web|shop|cửa hàng|bán|co|khong|cho|tim|hoi|ve|cua|nao|the|noi|them|ke|gia|bao|nhieu|con|hang|cuon|sach|truyen|hay|vay|di|do|nay|kia|nha|ok|oke|à|thế|ko)\b/gi;
    
    // Giữ lại các cụm từ quan trọng như "re zero", "light novel"
    let cleanedKeyword = keywordSource
      .replace(/re\s+zero/gi, "rezero") // Gộp "re zero" thành 1 từ
      .replace(/light\s+novel/gi, "lightnovel") // Gộp "light novel"
      .replace(stopWords, " ")
      .replace(/\s+/g, " ")
      .trim();
    
    const keywords = cleanedKeyword.split(/\s+/).filter((w) => w.length >= 2).slice(0, 6);
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
 * Tên function: callGroq
 * Mục đích của function: Gọi API của Groq (tương thích OpenAI) để lấy phản hồi từ LLM.
 * Tham số đầu vào: msgs (Mảng tin nhắn OpenAI format), allowTools (boolean), groqApiKey (string)
 * Giá trị trả về: Object JSON từ Groq API.
 * Điều kiện xử lý: Cấu hình nhiệt độ (temperature=0.3) và max_tokens.
 * Lỗi có thể phát sinh: HTTP errors (429 Rate limit, 400 Tool error).
 */
async function callGroq(msgs, allowTools, groqApiKey) {
  const body = {
    model: MODEL,
    messages: msgs,
    max_tokens: 700,
    temperature: 0.3, // Tăng lên một chút để tool calling ổn định hơn
  };
  if (allowTools) {
    body.tools = TOOLS;
    body.tool_choice = "auto";
  }

  const groqRes = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqApiKey}` },
    body: JSON.stringify(body),
  });

  if (!groqRes.ok) {
    const errBody = await groqRes.json().catch(() => ({}));
    console.error("[Groq error]", groqRes.status, JSON.stringify(errBody));
    const status = groqRes.status;
    const message = status === 429
      ? "AI đang bận, vui lòng thử lại sau vài giây."
      : status === 400 && errBody?.error?.code === "tool_use_failed"
      ? "Xin lỗi, tôi không thể tìm kiếm thông tin lúc này."
      : "Lỗi kết nối AI";
    const code = status === 429 ? "rate_limited" : "groq_error";
    throw Object.assign(new Error(message), { httpStatus: status, code });
  }

  return groqRes.json();
}

/**
 * Tên function: POST /chat
 * Mục đích của function: Xử lý request nhắn tin với trợ lý AI từ Client.
 * Tham số đầu vào: req (body: `messages`), res
 * Giá trị trả về: JSON `{ reply: string }`
 * Điều kiện xử lý: Phải cấu hình API key. Gộp system prompt với storeContext.
 * Lỗi có thể phát sinh: 503 (Chưa cấu hình API Key), 429 (Rate limit), 400 (Lỗi validate).
 */
chatRouter.post("/chat", async (req, res) => {
  assert(env.groqApiKey, 503, "Tính năng chat AI chưa được cấu hình", "chat_not_configured");

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

  const systemPrompt = `Bạn là trợ lý AI chính thức của cửa hàng sách.

QUY TẮC QUAN TRỌNG - ĐỌC KỸ:

1. **LUÔN ƯU TIÊN DỮ LIỆU CỬA HÀNG:**
   - Nếu có "KẾT QUẢ TÌM KIẾM TRONG CỬA HÀNG" → dùng dữ liệu đó để trả lời MỌI câu hỏi về sách (giá, tồn kho, tác giả, v.v.)
   - Khi khách hỏi follow-up ("giá bao nhiêu", "còn hàng không") → XEM LẠI dữ liệu cửa hàng đã có trong context

2. **KHI KHÁCH HỎI VỀ NỘI DUNG/CỐT TRUYỆN:**
   - Nếu dữ liệu cửa hàng KHÔNG có mô tả → nói thẳng "Xin lỗi, tôi không có thông tin chi tiết về nội dung sách này"
   - Gợi ý khách tìm trên Google hoặc đọc review

3. **XỬ LÝ FOLLOW-UP:**
   - Khi khách hỏi "giá bao nhiêu" sau khi đã nói về một cuốn sách → tìm lại thông tin sách đó trong dữ liệu đã có

4. **KHÔNG BỊA ĐẶT:**
   - Chỉ dùng thông tin có trong dữ liệu cửa hàng
   - Nếu không tìm thấy → nói thẳng và gợi ý cách khác

5. **ĐĂNG NHẬP:**
   - Nếu khách hỏi đơn hàng mà chưa đăng nhập → yêu cầu đăng nhập

6. **PHONG CÁCH:**
   - Trả lời tiếng Việt, ngắn gọn, thân thiện, tự nhiên
   - Không dài dòng, không lặp lại thông tin không cần thiết

--- DỮ LIỆU CỬA HÀNG ---
${storeContext}
--- HẾT DỮ LIỆU ---

LƯU Ý: Dữ liệu trên đã bao gồm tất cả thông tin về sách có trong cửa hàng. Hãy sử dụng nó một cách thông minh!`;

  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  try {
    // Không dùng tool - chỉ gọi AI 1 lần
    const response = await callGroq(groqMessages, false, env.groqApiKey);
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
