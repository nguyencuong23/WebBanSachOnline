/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      index.js
 * Mục đích:      Điểm khởi động (entry point) của toàn bộ ứng dụng backend.
 *                Khởi tạo Express app, đăng ký middleware bảo mật, CORS,
 *                gắn tất cả các router và khởi động HTTP server.
 * Các chức năng chính:
 *   - Cấu hình Helmet (bảo mật HTTP headers)
 *   - Cấu hình CORS theo danh sách origin cho phép
 *   - Đăng ký toàn bộ router của ứng dụng
 *   - Phục vụ Swagger UI tại /api-docs
 *   - Xử lý lỗi toàn cục (404, 500)
 *   - Lắng nghe kết nối tại cổng được cấu hình
 *
 * Tên module:    Application Bootstrap
 * Module liên quan: env.js, http/middleware.js, tất cả các file trong routes/
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * ============================================================================
 */

import "express-async-errors";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Tái tạo __dirname vì project dùng ES Modules (không có sẵn như CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import helmet from "helmet";
import { env } from "./env.js";
import { errorHandler, notFound } from "./http/middleware.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { booksRouter } from "./routes/books.js";
import { categoriesRouter } from "./routes/categories.js";
import { ordersRouter } from "./routes/orders.js";
import { adminRouter } from "./routes/admin.js";
import { vouchersRouter } from "./routes/vouchers.js";
import { settingsRouter } from "./routes/settings.js";
import { notificationsRouter } from "./routes/notifications.js";
import { cartRouter } from "./routes/cart.js";
import { reviewsRouter } from "./routes/reviews.js";
import { forgotPasswordRouter } from "./routes/forgot-password.js";
import { chatRouter } from "./routes/chat.js";

const app = express();

// Bật Helmet để thêm các HTTP security headers.
// Tắt contentSecurityPolicy và crossOriginEmbedderPolicy để tránh xung đột với Swagger UI.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Cho phép CORS từ các origin được cấu hình trong WEB_ORIGINS.
// Nếu không có origin nào được cấu hình, cho phép tất cả (dùng cho môi trường dev).
app.use(
  cors({
    origin: env.webOrigins.length ? env.webOrigins : true,
    credentials: true
  })
);

// Giới hạn kích thước body JSON tối đa 10MB để hỗ trợ upload ảnh Base64.
app.use(express.json({ limit: "10mb" }));

// Đăng ký tất cả các router theo thứ tự
app.use(healthRouter);
app.use(authRouter);
app.use(meRouter);
app.use(booksRouter);
app.use(categoriesRouter);
app.use(ordersRouter);
app.use(adminRouter);
app.use(vouchersRouter);
app.use(settingsRouter);
app.use(notificationsRouter);
app.use(cartRouter);
app.use(reviewsRouter);
app.use(forgotPasswordRouter);
app.use(chatRouter);

// Route kiểm tra nhanh API còn sống
app.get("/", (req, res) => {
  res.json({ ok: true, message: "BTL Library API" });
});

// Phục vụ file swagger.json cho Swagger UI
app.get("/swagger.json", (req, res) => {
  res.sendFile(path.join(__dirname, "swagger.json"));
});

// Trang Swagger UI tích hợp sẵn — không cần cài thêm package
app.get("/api-docs", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Swagger UI</title>
    <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css" />
    <style>
      html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
      *, *:before, *:after { box-sizing: inherit; }
      body { margin:0; background: #fafafa; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js"></script>
    <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "/swagger.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
    </script>
  </body>
</html>
  `);
});

// Middleware xử lý 404 và lỗi toàn cục — phải đặt CUỐI CÙNG
app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on :${env.port}`);
});
