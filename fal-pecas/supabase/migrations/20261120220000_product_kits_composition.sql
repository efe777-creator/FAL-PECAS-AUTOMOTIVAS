-- K1 Kits: natureza comercial + composição BOM + histórico de eventos.
-- Alternativa A: kit ∈ products; sem segundo catálogo.

-- ---------------------------------------------------------------------------
-- products.product_kind + kit_price_mode (K2 antecipado no schema)
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists product_kind text not null default 'item';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_product_kind_check'
  ) then
    alter table public.products
      add constraint products_product_kind_check
      check (product_kind in ('item', 'kit'));
  end if;
end $$;

alter table public.products
  add column if not exists kit_price_mode text not null default 'auto';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_kit_price_mode_check'
  ) then
    alter table public.products
      add constraint products_kit_price_mode_check
      check (kit_price_mode in ('auto', 'manual'));
  end if;
end $$;

comment on column public.products.product_kind is
  'Natureza comercial: item (SKU unitário) ou kit (composição BOM).';
comment on column public.products.kit_price_mode is
  'Só relevante quando product_kind=kit: auto=soma componentes; manual=lista exclusiva.';

create index if not exists products_product_kind_idx
  on public.products (product_kind);

-- ---------------------------------------------------------------------------
-- product_kit_components
-- ---------------------------------------------------------------------------
create table if not exists public.product_kit_components (
  id uuid primary key default gen_random_uuid(),
  kit_product_id uuid not null references public.products (id) on delete cascade,
  component_product_id uuid not null references public.products (id) on delete restrict,
  quantity numeric(12, 3) not null check (quantity > 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_kit_components_no_self check (kit_product_id <> component_product_id),
  constraint product_kit_components_unique unique (kit_product_id, component_product_id)
);

create index if not exists product_kit_components_kit_idx
  on public.product_kit_components (kit_product_id, sort_order);

create index if not exists product_kit_components_component_idx
  on public.product_kit_components (component_product_id);

comment on table public.product_kit_components is
  'BOM do kit: kit_product_id → componentes + quantidade. Sem estoque próprio do kit.';

-- Kit deve ser kind=kit; componente deve ser kind=item (v1: sem kit-dentro-de-kit).
create or replace function public.enforce_product_kit_component_kinds()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_kit_kind text;
  v_comp_kind text;
begin
  select product_kind into v_kit_kind from public.products where id = new.kit_product_id;
  if v_kit_kind is distinct from 'kit' then
    raise exception 'product_kit_components: kit_product_id deve ter product_kind=kit';
  end if;
  select product_kind into v_comp_kind from public.products where id = new.component_product_id;
  if v_comp_kind is distinct from 'item' then
    raise exception 'product_kit_components: componente deve ter product_kind=item (v1)';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_product_kit_component_kinds on public.product_kit_components;
create trigger trg_enforce_product_kit_component_kinds
  before insert or update on public.product_kit_components
  for each row execute function public.enforce_product_kit_component_kinds();

-- ---------------------------------------------------------------------------
-- product_kit_component_events (auditoria de composição)
-- ---------------------------------------------------------------------------
create table if not exists public.product_kit_component_events (
  id uuid primary key default gen_random_uuid(),
  kit_product_id uuid not null references public.products (id) on delete cascade,
  event_type text not null
    check (event_type in ('add', 'remove', 'replace', 'qty_change')),
  component_product_id uuid references public.products (id) on delete set null,
  previous_component_product_id uuid references public.products (id) on delete set null,
  quantity numeric(12, 3),
  previous_quantity numeric(12, 3),
  actor_id uuid references auth.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists product_kit_component_events_kit_idx
  on public.product_kit_component_events (kit_product_id, created_at desc);

comment on table public.product_kit_component_events is
  'Histórico de alterações de composição do kit (add/remove/replace/qty_change).';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.product_kit_components enable row level security;
alter table public.product_kit_component_events enable row level security;

-- Público: só composição de kits publicados (sem is_staff — anon não tem EXECUTE).
drop policy if exists product_kit_components_public_read on public.product_kit_components;
create policy product_kit_components_public_read on public.product_kit_components
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = kit_product_id
        and p.status = 'published'
    )
  );

drop policy if exists product_kit_components_staff_all on public.product_kit_components;
create policy product_kit_components_staff_all on public.product_kit_components
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists product_kit_component_events_staff_read on public.product_kit_component_events;
create policy product_kit_component_events_staff_read on public.product_kit_component_events
  for select to authenticated
  using (public.is_staff());

drop policy if exists product_kit_component_events_staff_insert on public.product_kit_component_events;
create policy product_kit_component_events_staff_insert on public.product_kit_component_events
  for insert to authenticated
  with check (public.is_staff());

grant select on public.product_kit_components to anon, authenticated;
grant select, insert, update, delete on public.product_kit_components to authenticated;
grant select, insert on public.product_kit_component_events to authenticated;
