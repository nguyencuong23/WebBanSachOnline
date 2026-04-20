# btllib-api (NodeJS + Supabase)

## Environment
Copy `.env.example` to `.env` and fill:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only secret)

## Run
```bash
npm install
npm run dev
```

## Auth
- Protected endpoints require `Authorization: Bearer <supabase_access_token>`.
- Admin endpoints require the caller's `public.profiles.role = 'admin'`.

## Endpoints (current)
- `GET /health`
- `GET /me`
- `PATCH /me`
- `GET /categories`
- `GET /books/latest?limit=10`
- `GET /books?search=&sort=`
- `GET /books/:bookId`
- `POST /checkout`
- `GET /orders`
- `GET /orders/:orderId`
- `GET /notifications`
- `GET /notifications/unread-count`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`
- `GET /settings`
- `GET /admin/dashboard/summary`
- `GET /admin/orders?status=&paymentMethod=`
- `GET /admin/orders/:orderId`
- `POST /admin/orders/:orderId/confirm-bank-transfer`
- `POST /admin/orders/:orderId/status`

