-- Supabase Storage bucket policy (books images)
-- Create bucket `book-images` from dashboard, then apply policies below.

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

