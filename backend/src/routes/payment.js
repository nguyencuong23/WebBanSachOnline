import express from "express";
import { createSupabaseAdmin } from "../supabase.js";
import { env } from "../env.js";

export const paymentRouter = express.Router();

// Webhook từ SePay nhận thông báo khi có tiền vào
paymentRouter.post("/hooks/sepay-payment", async (req, res) => {
  try {
    // Bảo mật: Kiểm tra API Key từ header (Đảm bảo người ngoài không thể tự gọi API giả mạo)
    // SePay gửi header dạng: Authorization: Apikey <API_KEY_CUA_BAN>
    const authHeader = req.headers.authorization;
    const expectedKey = env.sepayApiKey ? `Apikey ${env.sepayApiKey}` : "Apikey WEBBANSACH_SEPAY_2026";
    
    if (authHeader !== expectedKey) {
      return res.status(401).json({ success: false, message: "Sai API Key" });
    }

    const data = req.body;
    
    // Dữ liệu SePay gửi sang dạng JSON có trường 'content' là nội dung chuyển khoản
    const content = data.content || "";
    
    // Hệ thống tạo mã đơn hàng bắt đầu bằng "BP" theo sau là các số (ví dụ: BP20260514123456)
    // Dùng Regex để tìm mã đơn hàng trong nội dung chuyển khoản
    const match = content.match(/(BP\d+)/i);
    
    if (!match) {
      // Không tìm thấy mã đơn, vẫn trả về 200 để SePay không gửi lại nhiều lần
      return res.json({ success: true, message: "Không tìm thấy mã đơn hàng" });
    }

    const orderCode = match[1].toUpperCase();
    const sb = createSupabaseAdmin();

    // Lấy thông tin đơn hàng
    const { data: order } = await sb.from("orders").select("*").eq("order_code", orderCode).single();
    
    if (!order) {
      return res.json({ success: true, message: "Đơn hàng không tồn tại" });
    }

    const transferAmount = Number(data.transferAmount);
    const orderTotal = Number(order.total);

    // Kiểm tra số tiền chuyển khoản phải khớp chính xác với tổng tiền đơn hàng
    if (transferAmount === orderTotal) {
      await sb
        .from("orders")
        .update({ 
          payment_status: "paid", 
          status: "processing",
          bank_transfer_reference: data.id ? `SePay ID: ${data.id}` : null
        })
        .eq("order_code", orderCode);
    } else {
      // Trường hợp chuyển khoản sai số tiền (thừa hoặc thiếu)
      const mismatchMsg = `[Hệ thống: Cảnh báo chuyển khoản sai số tiền. Yêu cầu: ${orderTotal.toLocaleString("vi-VN")}đ, Thực nhận: ${transferAmount.toLocaleString("vi-VN")}đ]`;
      const updatedNote = order.note ? `${order.note}\n${mismatchMsg}` : mismatchMsg;

      await sb
        .from("orders")
        .update({
          payment_status: "pending_confirmation",
          note: updatedNote,
          bank_transfer_reference: data.id ? `SePay ID: ${data.id} (Sai số tiền)` : null
        })
        .eq("order_code", orderCode);

      try {
        await sb.from("admin_notifications").insert({
          title: `Đơn hàng ${orderCode} thanh toán sai số tiền`,
          message: `Đơn hàng ${orderCode} yêu cầu ${orderTotal.toLocaleString("vi-VN")}đ nhưng nhận được ${transferAmount.toLocaleString("vi-VN")}đ. Trạng thái đã được chuyển sang Chờ xác nhận thủ công.`,
          type: "payment",
          link: "/admin/orders"
        });
      } catch (notifErr) {
        console.error("Không thể tạo thông báo sai số tiền cho admin:", notifErr);
      }
    }

    res.json({ success: true, message: "Cập nhật thanh toán thành công" });
  } catch (error) {
    console.error("Lỗi webhook SePay:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
