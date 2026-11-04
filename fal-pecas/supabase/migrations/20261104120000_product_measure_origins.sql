-- MARCHA_LOGISTICA_MEDIDAS_PRODUTOS: origem Manual|Global por campo logístico
-- Analogia: price_list_items.price_origin (manual protegido de recalc/bulk).

alter table public.products
  add column if not exists weight_origin text not null default 'global'
    check (weight_origin in ('manual', 'global'));

alter table public.products
  add column if not exists height_origin text not null default 'global'
    check (height_origin in ('manual', 'global'));

alter table public.products
  add column if not exists width_origin text not null default 'global'
    check (width_origin in ('manual', 'global'));

alter table public.products
  add column if not exists length_origin text not null default 'global'
    check (length_origin in ('manual', 'global'));

comment on column public.products.weight_origin is
  'Origem da medida: manual (protegido de bulk) | global (elegível a alteração global).';
comment on column public.products.height_origin is
  'Origem da medida: manual | global.';
comment on column public.products.width_origin is
  'Origem da medida: manual | global.';
comment on column public.products.length_origin is
  'Origem da medida: manual | global.';

-- Valor já preenchido = tratado como manual (não sobrescrever em bulk padrão).
update public.products
set
  weight_origin = case when weight_kg is not null then 'manual' else 'global' end,
  height_origin = case when height_cm is not null then 'manual' else 'global' end,
  width_origin = case when width_cm is not null then 'manual' else 'global' end,
  length_origin = case when length_cm is not null then 'manual' else 'global' end;
