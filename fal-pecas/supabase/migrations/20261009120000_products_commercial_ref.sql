-- FAL-IMP-03 / D-REF: referência comercial distinta do SKU técnico.
-- Código referência (UI) → products.commercial_ref
-- SKU FAL (técnico/import) → products.sku

alter table public.products
  add column if not exists commercial_ref text;

update public.products
set commercial_ref = sku
where commercial_ref is null or btrim(commercial_ref) = '';

alter table public.products
  alter column commercial_ref set not null;

create unique index if not exists products_commercial_ref_uidx
  on public.products (commercial_ref);

comment on column public.products.commercial_ref is
  'Código referência comercial (UI). Distinto do sku técnico; backfill inicial = sku.';

comment on column public.products.sku is
  'SKU FAL técnico estável (import/matching). Não confundir com commercial_ref.';

-- Inclui commercial_ref no documento de busca legado.
update public.products
set search_document = lower(
  concat_ws(
    ' ',
    name,
    sku,
    commercial_ref,
    coalesce(short_description, ''),
    coalesce(description, ''),
    coalesce(posicao, ''),
    coalesce(lado, '')
  )
);
