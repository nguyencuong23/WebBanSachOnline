-- RLS policies for Supabase

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.books enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

-- Categories / Books
drop policy if exists "categories_select_all" on public.categories;
create policy "categories_select_all"
on public.categories for select
using (true);

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write"
on public.categories for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "books_select_published_or_admin" on public.books;
create policy "books_select_published_or_admin"
on public.books for select
using (is_published = true or public.is_admin());

drop policy if exists "books_admin_write" on public.books;
create policy "books_admin_write"
on public.books for all
using (public.is_admin())
with check (public.is_admin());

-- Orders
drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin"
on public.orders for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
on public.orders for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin"
on public.orders for update
using (public.is_admin())
with check (public.is_admin());

-- Order items (must belong to order the user can see)
drop policy if exists "order_items_select_by_order" on public.order_items;
create policy "order_items_select_by_order"
on public.order_items for select
using (
  public.is_admin() or
  exists (
    select 1 from public.orders o
    where o.order_id = order_items.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "order_items_insert_by_order" on public.order_items;
create policy "order_items_insert_by_order"
on public.order_items for insert
with check (
  public.is_admin() or
  exists (
    select 1 from public.orders o
    where o.order_id = order_items.order_id
      and o.user_id = auth.uid()
  )
);

-- Notifications
drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin"
on public.notifications for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_update_own_or_admin" on public.notifications;
create policy "notifications_update_own_or_admin"
on public.notifications for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_insert_admin" on public.notifications;
create policy "notifications_insert_admin"
on public.notifications for insert
with check (public.is_admin());

-- Settings: read all, write admin
drop policy if exists "settings_select_all" on public.settings;
create policy "settings_select_all"
on public.settings for select
using (true);

drop policy if exists "settings_admin_write" on public.settings;
create policy "settings_admin_write"
on public.settings for all
using (public.is_admin())
with check (public.is_admin());

