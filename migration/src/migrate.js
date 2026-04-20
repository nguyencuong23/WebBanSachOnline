import dotenv from "dotenv";
dotenv.config();

import { withSqlServer, queryAll } from "./sqlserver.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const TEMP_PASSWORD = required("TEMP_PASSWORD");
const ONLY_ADMINS = (process.env.ONLY_ADMINS || "false").toLowerCase() === "true";

function mapRole(roleInt) {
  return roleInt === 1 ? "admin" : "user";
}

function mapOrderStatus(statusInt) {
  switch (Number(statusInt)) {
    case 1:
      return "pending";
    case 2:
      return "confirmed";
    case 3:
      return "processing";
    case 4:
      return "shipping";
    case 5:
      return "delivered";
    case 6:
      return "cancelled";
    default:
      return "pending";
  }
}

function mapNotificationType(typeInt) {
  switch (Number(typeInt)) {
    case 1:
      return "NearDue";
    case 2:
      return "Overdue";
    case 3:
      return "System";
    case 4:
      return "FineWarning";
    case 5:
      return "PaymentPending";
    case 6:
      return "OrderStatus";
    default:
      return String(typeInt);
  }
}

async function upsert(table, rows, conflictTarget) {
  if (!rows.length) return;
  const { error } = await supabaseAdmin.from(table).upsert(rows, { onConflict: conflictTarget });
  if (error) throw new Error(`Upsert ${table} failed: ${error.message}`);
}

async function main() {
  required("SQLSERVER_CONNECTION_STRING");
  required("SUPABASE_URL");
  required("SUPABASE_SERVICE_ROLE_KEY");

  console.log("Reading SQL Server…");

  const data = await withSqlServer(async (pool) => {
    const [users, categories, books, orders, orderItems, notifications, settings] = await Promise.all([
      queryAll(pool, "Users"),
      queryAll(pool, "Categories"),
      queryAll(pool, "Books"),
      queryAll(pool, "Orders"),
      queryAll(pool, "OrderItems"),
      queryAll(pool, "Notifications"),
      queryAll(pool, "Settings")
    ]);
    return { users, categories, books, orders, orderItems, notifications, settings };
  });

  console.log("Upserting categories/books/settings…");
  await upsert(
    "categories",
    data.categories.map((c) => ({
      category_id: String(c.CategoryId),
      name: c.Name,
      description: c.Description ?? null
    })),
    "category_id"
  );

  await upsert(
    "books",
    data.books.map((b) => ({
      book_id: String(b.BookId),
      title: b.Title,
      author: b.Author,
      publisher: b.Publisher ?? null,
      isbn: b.Isbn ?? null,
      category_id: String(b.CategoryId),
      price: Number(b.Price ?? 0),
      sale_price: b.SalePrice == null ? null : Number(b.SalePrice),
      description: b.Description ?? null,
      slug: b.Slug ?? null,
      is_published: Boolean(b.IsPublished),
      publish_year: Number(b.PublishYear),
      quantity: Number(b.Quantity),
      location: b.Location ?? null,
      image_url: b.ImagePath ?? null
    })),
    "book_id"
  );

  await upsert(
    "settings",
    data.settings.map((s) => ({
      key: String(s.Key),
      value: String(s.Value ?? "")
    })),
    "key"
  );

  console.log("Creating Supabase Auth users + profiles…");
  const legacyToUuid = new Map();
  const emailToAuthId = new Map();

  // Preload existing auth users (best-effort; assumes <= 1000 users)
  try {
    const { data: existing, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (!error) {
      for (const u of existing.users || []) {
        if (u.email) emailToAuthId.set(u.email.toLowerCase(), u.id);
      }
    }
  } catch {
    // ignore
  }

  for (const u of data.users) {
    const role = mapRole(Number(u.Role));
    if (ONLY_ADMINS && role !== "admin") continue;

    const email = u.Email || `${u.Username}@example.local`;
    const username = u.Username;

    // Create or fetch auth user by email
    let authUserId = emailToAuthId.get(String(email).toLowerCase());
    if (!authUserId) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: TEMP_PASSWORD,
        email_confirm: true,
        user_metadata: { username, role }
      });
      if (error) throw new Error(`Create auth user failed (${email}): ${error.message}`);
      authUserId = created.user.id;
      emailToAuthId.set(String(email).toLowerCase(), authUserId);
    }

    legacyToUuid.set(Number(u.Id), authUserId);

    // Upsert profile
    await upsert(
      "profiles",
      [
        {
          user_id: authUserId,
          legacy_user_id: Number(u.Id),
          username: u.Username,
          student_code: u.StudentCode ?? null,
          full_name: u.FullName,
          email: u.Email ?? null,
          phone_number: u.PhoneNumber ?? null,
          role,
          is_active: Boolean(u.IsActive),
          total_fine: Number(u.TotalFine ?? 0),
          paid_amount: Number(u.PaidAmount ?? 0),
          customer_note: u.CustomerNote ?? null,
          created_at: u.CreatedAt ? new Date(u.CreatedAt).toISOString() : new Date().toISOString()
        }
      ],
      "user_id"
    );
  }

  console.log("Upserting orders/order_items/notifications…");

  await upsert(
    "orders",
    data.orders
      .filter((o) => legacyToUuid.has(Number(o.UserId)))
      .map((o) => ({
        order_id: Number(o.OrderId),
        legacy_order_id: Number(o.OrderId),
        user_id: legacyToUuid.get(Number(o.UserId)),
        order_code: o.OrderCode,
        status: mapOrderStatus(o.Status),
        payment_method: Number(o.PaymentMethod) === 2 ? "bank_transfer" : "cod",
        payment_status: (() => {
          const ps = Number(o.PaymentStatus);
          if (ps === 2) return "pending_confirmation";
          if (ps === 3) return "paid";
          if (ps === 4) return "refunded";
          return "unpaid";
        })(),
        receiver_name: o.ReceiverName,
        receiver_phone: o.ReceiverPhone,
        shipping_address: o.ShippingAddress,
        note: o.Note ?? null,
        subtotal: Number(o.Subtotal ?? 0),
        shipping_fee: Number(o.ShippingFee ?? 0),
        discount: Number(o.Discount ?? 0),
        total: Number(o.Total ?? 0),
        bank_transfer_reference: o.BankTransferReference ?? null,
        created_at: o.CreatedAt ? new Date(o.CreatedAt).toISOString() : new Date().toISOString(),
        confirmed_at: o.ConfirmedAt ? new Date(o.ConfirmedAt).toISOString() : null,
        delivered_at: o.DeliveredAt ? new Date(o.DeliveredAt).toISOString() : null,
        cancelled_at: o.CancelledAt ? new Date(o.CancelledAt).toISOString() : null
      })),
    "order_id"
  );

  await upsert(
    "order_items",
    data.orderItems.map((it) => ({
      order_item_id: Number(it.OrderItemId),
      legacy_order_item_id: Number(it.OrderItemId),
      order_id: Number(it.OrderId),
      book_id: String(it.BookId),
      unit_price: Number(it.UnitPrice ?? 0),
      quantity: Number(it.Quantity ?? 1),
      line_total: Number(it.LineTotal ?? 0)
    })),
    "order_item_id"
  );

  await upsert(
    "notifications",
    data.notifications
      .filter((n) => legacyToUuid.has(Number(n.UserId)))
      .map((n) => ({
        id: Number(n.Id),
        legacy_notification_id: Number(n.Id),
        user_id: legacyToUuid.get(Number(n.UserId)),
        type: mapNotificationType(n.Type),
        title: n.Title,
        message: n.Message,
        link: n.Link ?? null,
        is_read: Boolean(n.IsRead),
        created_at: n.CreatedAt ? new Date(n.CreatedAt).toISOString() : new Date().toISOString(),
        related_entity_id: n.RelatedEntityId == null ? null : Number(n.RelatedEntityId)
      })),
    "id"
  );

  console.log("Done.");
  console.log(
    `Note: passwords cannot be migrated; users were created with TEMP_PASSWORD and should reset after first login.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

