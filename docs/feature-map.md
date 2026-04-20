# Feature map (ASP.NET -> React + Node + Supabase)

## 1) Auth & Profile

### React routes
- `/login`
- `/forgot-password`
- `/reset-password`
- `/profile`

### Node API (BFF)
- `GET /health`
- `GET /me` (returns auth user + profile)
- `PATCH /me` (update profile: full_name, email, phone)

### Supabase
- Auth handled by Supabase (`signInWithPassword`, `resetPasswordForEmail`, `updateUser`).
- `public.profiles` stores app fields (role, is_active, etc).

## 2) Catalog (Client)

### React routes
- `/` (home: latest books)
- `/search` (search by title/author)
- `/books/:bookId`

### Node API
- `GET /books?search=&sort=`
- `GET /books/latest?limit=10`
- `GET /books/:bookId`

### Supabase tables
- `public.categories`
- `public.books`

## 3) Cart (Client)

### React routes
- `/cart`

### Node API
- `GET /cart` (read server-side cart, optional; can be FE-local)
- `POST /cart/items` (add)
- `PATCH /cart/items/:bookId` (update qty)
- `DELETE /cart/items/:bookId` (remove)
- `DELETE /cart` (clear)

### Notes
- With Supabase + SPA, cart can be client-side (localStorage) and only `POST /checkout` hits server.

## 4) Checkout & Orders (Client)

### React routes
- `/checkout`
- `/checkout/success/:orderId`
- `/orders`
- `/orders/:orderId`

### Node API
- `POST /checkout` (place order: stock check + reduce stock + create order/items + shipping fee)
- `GET /orders` (current user orders)
- `GET /orders/:orderId` (current user order details)

### Supabase tables
- `public.orders`
- `public.order_items`
- `public.addresses` (optional; or embed shipping address in order)
- `public.settings` (shipping fee / free threshold)

## 5) Notifications

### React routes / UI
- Notification dropdown/bell in layouts

### Node API (optional) or Supabase direct
- `GET /notifications`
- `GET /notifications/unread-count`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`

### Supabase
- `public.notifications` with RLS per-user

## 6) Admin

### React routes
- `/admin`
- `/admin/dashboard`
- `/admin/books` (+ create/edit)
- `/admin/categories` (+ create/edit)
- `/admin/orders` (+ filters)
- `/admin/orders/:orderId`
- `/admin/settings`

### Node API
- `GET /admin/dashboard/summary`
- `GET /admin/dashboard/stats`
- `GET /admin/dashboard/monthly-stats`
- `GET /admin/dashboard/borrowing-trends`
- `GET /admin/orders?status=&paymentMethod=`
- `GET /admin/orders/:orderId`
- `POST /admin/orders/:orderId/confirm-bank-transfer`
- `POST /admin/orders/:orderId/status` (update status)
- `POST /admin/orders/:orderId/cancel` (cancel + restock)
- `CRUD /admin/books`
- `CRUD /admin/categories`
- `GET /admin/settings` / `PUT /admin/settings`

### Notes
- Librarian features are merged into Admin per requirement.

