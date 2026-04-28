import "express-async-errors";
import express from "express";
import cors from "cors";
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
import { notificationsRouter } from "./routes/notifications.js";
import { settingsRouter } from "./routes/settings.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.webOrigins.length ? env.webOrigins : true,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

app.use(healthRouter);
app.use(authRouter);
app.use(meRouter);
app.use(booksRouter);
app.use(categoriesRouter);
app.use(ordersRouter);
app.use(adminRouter);
app.use(notificationsRouter);
app.use(settingsRouter);

app.get("/", (req, res) => {
  res.json({ ok: true, message: "BTL Library API" });
});

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on :${env.port}`);
});

