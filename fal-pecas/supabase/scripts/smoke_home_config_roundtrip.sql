update public.store_home_settings
set show_oferta_badge = false, show_discount_percent = false, updated_at = now()
where id = '16a1d803-f0df-4283-bb06-a570783df447';

update public.store_home_settings
set show_oferta_badge = true, show_discount_percent = true, updated_at = now()
where id = '16a1d803-f0df-4283-bb06-a570783df447';

select show_oferta_badge, show_discount_percent, featured_display_limit
from public.store_home_settings
limit 1;
