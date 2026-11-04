-- Etapa 2 deploy: anon SELECT só leitura para cotação guest (D-FRETE B).
-- Write continua exclusivo staff (policies is_staff existentes).

grant select on public.store_shipping_origin to anon;
grant select on public.store_own_delivery_settings to anon;

drop policy if exists store_shipping_origin_anon_read on public.store_shipping_origin;
create policy store_shipping_origin_anon_read on public.store_shipping_origin
  for select to anon using (true);

drop policy if exists store_own_delivery_settings_anon_read on public.store_own_delivery_settings;
create policy store_own_delivery_settings_anon_read on public.store_own_delivery_settings
  for select to anon using (true);
