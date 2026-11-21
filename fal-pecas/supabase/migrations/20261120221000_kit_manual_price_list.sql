-- K2: lista pública exclusiva para preços manuais de kits (motor 6B, sem segundo resolve).
-- Priority > Base para que o preço manual do kit vença quando cadastrado.

insert into public.price_lists (
  id, name, slug, description, status, scope, priority, is_default
)
values (
  'a1111111-1111-1111-1111-111111111103',
  'Preços manuais de kits',
  'preco-kits-manual',
  'Lista exclusiva para kits com kit_price_mode=manual. Auto continua na Lista Base.',
  'active',
  'public',
  20,
  false
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  status = excluded.status,
  scope = excluded.scope,
  priority = excluded.priority,
  is_default = excluded.is_default,
  updated_at = now();

comment on table public.price_lists is
  'Listas comerciais F6B. Inclui preco-kits-manual (K2) para preços manuais de kits.';
