import "express-async-errors";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

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

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(
  cors({
    origin: env.webOrigins.length ? env.webOrigins : true,
    credentials: true
  })
);
app.use(express.json({ limit: "10mb" }));

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

app.get("/", (req, res) => {
  res.json({ ok: true, message: "BTL Library API" });
});

app.get("/swagger.json", (req, res) => {
  res.sendFile(path.join(__dirname, "swagger.json"));
});

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

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on :${env.port}`);
});

