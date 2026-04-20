-- Default settings required by checkout flow
insert into public.settings (key, value)
values
  ('DefaultShippingFee', '30000'),
  ('FreeShippingThreshold', '300000')
on conflict (key) do update set value = excluded.value, updated_at = now();

