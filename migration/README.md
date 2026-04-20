# Migration (SQL Server -> Supabase)

## Preconditions
- Supabase project created
- SQL applied:
  - `../supabase/schema.sql`
  - `../supabase/rls.sql`
- You have **service role key** (server secret)

## Run
1) Copy `.env.example` to `.env` and fill values.
2) Install deps + run:

```bash
npm install
npm run migrate
```

## Notes
- Password hashes from the ASP.NET version **cannot** be reused in Supabase Auth.
- Script creates users in Supabase Auth with `TEMP_PASSWORD`. Users should reset password on first login.
- If your DB has > 1000 users, extend the `listUsers` preload logic to paginate.

