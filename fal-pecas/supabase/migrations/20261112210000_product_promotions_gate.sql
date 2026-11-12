-- HOME-03 Opção A — gate promocional individual + filtro em resolve_product_price
-- Spec: docs/planejamento/FAL_SPEC_HOME_CONSOLIDACAO_GATE_PAG_2026-11-12.md
-- Preço continua em price_list_items; esta tabela só ativa/desativa efetividade.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
create table if not exists public.product_promotions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  price_list_id uuid not null references public.price_lists (id) on delete restrict,
  status text not null default 'inactive'
    check (status in ('active', 'inactive')),
  starts_at timestamptz,
  ends_at timestamptz,
  activated_by uuid references auth.users (id) on delete set null,
  deactivated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_promotions_ends_after_starts_chk
    check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create unique index if not exists product_promotions_one_active_per_product_uidx
  on public.product_promotions (product_id)
  where status = 'active';

create index if not exists product_promotions_list_product_idx
  on public.product_promotions (price_list_id, product_id)
  where status = 'active';

create index if not exists product_promotions_product_idx
  on public.product_promotions (product_id);

drop trigger if exists product_promotions_updated_at on public.product_promotions;
create trigger product_promotions_updated_at
  before update on public.product_promotions
  for each row execute function public.set_updated_at();

create table if not exists public.product_promotion_events (
  id uuid primary key default gen_random_uuid(),
  product_promotion_id uuid references public.product_promotions (id) on delete set null,
  product_id uuid not null references public.products (id) on delete cascade,
  price_list_id uuid references public.price_lists (id) on delete set null,
  action text not null
    check (action in ('activate', 'deactivate', 'expire', 'reassign_list', 'seed')),
  at timestamptz not null default now(),
  by_user uuid references auth.users (id) on delete set null,
  meta jsonb
);

create index if not exists product_promotion_events_product_idx
  on public.product_promotion_events (product_id, at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.product_promotions enable row level security;
alter table public.product_promotion_events enable row level security;

drop policy if exists product_promotions_public_read on public.product_promotions;
create policy product_promotions_public_read on public.product_promotions
  for select to anon, authenticated
  using (true);

drop policy if exists product_promotions_staff_write on public.product_promotions;
create policy product_promotions_staff_write on public.product_promotions
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists product_promotion_events_staff_read on public.product_promotion_events;
create policy product_promotion_events_staff_read on public.product_promotion_events
  for select to authenticated
  using (public.is_staff());

drop policy if exists product_promotion_events_staff_insert on public.product_promotion_events;
create policy product_promotion_events_staff_insert on public.product_promotion_events
  for insert to authenticated
  with check (public.is_staff());

grant select on public.product_promotions to anon, authenticated;
grant select, insert, update, delete on public.product_promotions to authenticated;
grant select, insert on public.product_promotion_events to authenticated;

-- ---------------------------------------------------------------------------
-- resolve_product_price — filtro gate (lista default OU promoção ativa vigente)
-- ---------------------------------------------------------------------------
create or replace function public.resolve_product_price(
  p_product_id uuid,
  p_customer_id uuid default null,
  p_at timestamptz default now()
)
returns table (
  product_id uuid,
  amount numeric,
  price_list_id uuid,
  price_list_slug text,
  used_override boolean,
  used_default_fallback boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_at timestamptz := coalesce(p_at, now());
  v_row record;
  v_ov_amount numeric;
begin
  -- 0) Preço avulso válido
  select o.amount into v_ov_amount
  from public.product_price_overrides o
  where o.product_id = p_product_id
    and o.status = 'active'
    and (o.valid_from is null or o.valid_from <= v_at)
    and (o.valid_until is null or o.valid_until >= v_at)
  order by o.updated_at desc
  limit 1;

  if found then
    product_id := p_product_id;
    amount := v_ov_amount;
    price_list_id := null;
    price_list_slug := 'override';
    used_override := true;
    used_default_fallback := false;
    return next;
    return;
  end if;

  -- 1) Listas public elegíveis: default SEMPRE candidata; demais só com promoção ativa
  select
    pli.product_id,
    pli.price as amount,
    pl.id as price_list_id,
    pl.slug as price_list_slug
  into v_row
  from public.price_list_items pli
  join public.price_lists pl on pl.id = pli.price_list_id
  where pli.product_id = p_product_id
    and pl.scope = 'public'
    and pl.status = 'active'
    and (pl.valid_from is null or pl.valid_from <= v_at)
    and (pl.valid_until is null or pl.valid_until >= v_at)
    and (
      pl.is_default = true
      or exists (
        select 1
        from public.product_promotions pp
        where pp.product_id = p_product_id
          and pp.price_list_id = pl.id
          and pp.status = 'active'
          and (pp.starts_at is null or pp.starts_at <= v_at)
          and (pp.ends_at is null or pp.ends_at >= v_at)
      )
    )
  order by pl.priority desc, pl.updated_at desc
  limit 1;

  if found then
    product_id := v_row.product_id;
    amount := v_row.amount;
    price_list_id := v_row.price_list_id;
    price_list_slug := v_row.price_list_slug;
    used_override := false;
    used_default_fallback := false;
    return next;
    return;
  end if;

  -- 2) Fallback lista default
  select
    pli.product_id,
    pli.price as amount,
    pl.id as price_list_id,
    pl.slug as price_list_slug
  into v_row
  from public.price_list_items pli
  join public.price_lists pl on pl.id = pli.price_list_id
  where pli.product_id = p_product_id
    and pl.is_default = true
  limit 1;

  if found then
    product_id := v_row.product_id;
    amount := v_row.amount;
    price_list_id := v_row.price_list_id;
    price_list_slug := v_row.price_list_slug;
    used_override := false;
    used_default_fallback := true;
    return next;
    return;
  end if;

  raise exception 'price_unresolved: produto % sem preço em lista', p_product_id
    using errcode = 'P0001';
end;
$$;

revoke all on function public.resolve_product_price(uuid, uuid, timestamptz) from public;
grant execute on function public.resolve_product_price(uuid, uuid, timestamptz) to anon, authenticated;

-- resolve_product_prices permanece delegando à função acima

-- ---------------------------------------------------------------------------
-- Seed: preservar vitrine atual (1 ativação ativa por produto; maior priority)
-- ---------------------------------------------------------------------------
insert into public.product_promotions (product_id, price_list_id, status)
select distinct on (pli.product_id)
  pli.product_id,
  pli.price_list_id,
  'active'
from public.price_list_items pli
join public.price_lists pl on pl.id = pli.price_list_id
where pl.is_default = false
  and pl.scope = 'public'
  and pl.status = 'active'
  and not exists (
    select 1 from public.product_promotions pp
    where pp.product_id = pli.product_id and pp.status = 'active'
  )
order by pli.product_id, pl.priority desc, pl.updated_at desc;

insert into public.product_promotion_events (product_promotion_id, product_id, price_list_id, action, meta)
select pp.id, pp.product_id, pp.price_list_id, 'seed', jsonb_build_object('reason', 'home03_transition')
from public.product_promotions pp
where pp.status = 'active'
  and not exists (
    select 1 from public.product_promotion_events e
    where e.product_promotion_id = pp.id and e.action = 'seed'
  );

comment on table public.product_promotions is
  'HOME-03: ativação individual de promoção. Lista cadastrada ≠ promoção ativa.';
