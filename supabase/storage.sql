-- Public read (for published book images)
drop policy if exists "book_images_public_read" on storage.objects;
create policy "book_images_public_read"
on storage.objects for select
using (bucket_id = 'book-images');

-- Admin write
drop policy if exists "book_images_admin_write" on storage.objects;
create policy "book_images_admin_write"
on storage.objects for all
using (
  bucket_id = 'book-images'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  bucket_id = 'book-images'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
  )
);

-- Public read for notification images
drop policy if exists "notification_images_public_read" on storage.objects;
create policy "notification_images_public_read"
on storage.objects for select
using (bucket_id = 'notification-history-images');

-- Admin write for notification images
drop policy if exists "notification_images_admin_write" on storage.objects;
create policy "notification_images_admin_write"
on storage.objects for all
using (
  bucket_id = 'notification-history-images'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  bucket_id = 'notification-history-images'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
  )
);

create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer set search_path = public;

-- 1. BẢNG BOOKS (SÁCH)
create policy "Công khai xem sách" on public.books for select using ( true );
create policy "Admin toàn quyền sách" on public.books for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );

-- 2. BẢNG CATEGORIES (THỂ LOẠI)
create policy "Công khai xem thể loại" on public.categories for select using ( true );
create policy "Admin toàn quyền thể loại" on public.categories for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );

-- 3. BẢNG VOUCHERS (MÃ GIẢM GIÁ)
create policy "Công khai xem voucher" on public.vouchers for select using ( true );
create policy "Admin toàn quyền voucher" on public.vouchers for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );

-- 4. BẢNG PROFILES (HỒ SƠ)
create policy "Cá nhân xem hồ sơ hoặc Admin toàn quyền" on public.profiles for all to authenticated using ( auth.uid() = user_id or public.is_admin() ) with check ( auth.uid() = user_id or public.is_admin() );

-- 5. BẢNG NOTIFICATIONS (THÔNG BÁO)
create policy "Cá nhân xem thông báo hoặc Admin toàn quyền" on public.notifications for all to authenticated using ( auth.uid() = user_id or public.is_admin() ) with check ( auth.uid() = user_id or public.is_admin() );

-- 6. BẢNG ORDERS (ĐƠN HÀNG)
create policy "Cá nhân xem đơn hàng hoặc Admin toàn quyền" on public.orders for all to authenticated using ( auth.uid() = user_id or public.is_admin() ) with check ( auth.uid() = user_id or public.is_admin() );

-- 7. BẢNG ORDER_ITEMS (CHI TIẾT ĐƠN HÀNG)
create policy "Cá nhân xem chi tiết đơn hoặc Admin toàn quyền" on public.order_items for all to authenticated 
using ( order_id in (select order_id from public.orders where user_id = auth.uid()) or public.is_admin() )
with check ( order_id in (select order_id from public.orders where user_id = auth.uid()) or public.is_admin() );

-- 8. BẢNG SETTINGS (CÀI ĐẶT)
create policy "Admin toàn quyền cài đặt" on public.settings for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );

create policy "Công khai xem ảnh"
on storage.objects for select
using ( true );

drop policy if exists "Admin toàn quyền storage" on storage.objects;
create policy "Admin toàn quyền storage"
on storage.objects for all 
to authenticated
using ( (select role from public.profiles where user_id = auth.uid()) = 'admin' )
with check ( (select role from public.profiles where user_id = auth.uid()) = 'admin' );

alter table public.cart_items enable row level security;
create policy "Users can view their own cart items"
on public.cart_items for select
using ( auth.uid() = user_id );
create policy "Users can insert their own cart items"
on public.cart_items for insert
with check ( auth.uid() = user_id );
create policy "Users can update their own cart items"
on public.cart_items for update
using ( auth.uid() = user_id );
create policy "Users can delete their own cart items"
on public.cart_items for delete
using ( auth.uid() = user_id );
create policy "Admins can do everything on cart_items"
on public.cart_items for all
using (
  exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- 9. AVATARS STORAGE
-- Đảm bảo bucket 'avatars' là công khai
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Cho phép mọi người (kể cả chưa đăng nhập) xem ảnh đại diện
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects for select
to public
using (bucket_id = 'avatars');

-- Cho phép người dùng tải lên và quản lý ảnh đại diện của chính mình
drop policy if exists "avatars_user_manage" on storage.objects;
create policy "avatars_user_manage"
on storage.objects for all
to authenticated
using (
  bucket_id = 'avatars' 
  and (name = auth.uid()::text or name like auth.uid()::text || '.%')
)
with check (
  bucket_id = 'avatars'
  and (name = auth.uid()::text or name like auth.uid()::text || '.%')
);

-- 10. BẢNG REVIEWS (ĐÁNH GIÁ SÁCH)
-- Ai cũng đọc được đánh giá
drop policy if exists "reviews_select_all" on public.reviews;
create policy "reviews_select_all"
on public.reviews for select
using ( true );

-- User chỉ tạo đánh giá với user_id của chính mình
drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own"
on public.reviews for insert
to authenticated
with check ( auth.uid() = user_id );

-- User chỉ sửa đánh giá của chính mình
drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own"
on public.reviews for update
to authenticated
using ( auth.uid() = user_id );

-- User xóa đánh giá của mình, admin xóa bất kỳ
drop policy if exists "reviews_delete_own_or_admin" on public.reviews;
create policy "reviews_delete_own_or_admin"
on public.reviews for delete
to authenticated
using ( auth.uid() = user_id or public.is_admin() );
