-- K11: listas assigned/B2B aplicáveis a itens e kits via resolve (sem segundo motor).

alter table public.customers
  add column if not exists assigned_price_list_id uuid
    references public.price_lists (id) on delete set null;

comment on column public.customers.assigned_price_list_id is
  'K11: lista scope=assigned do cliente (B2B). Kits e itens usam o mesmo resolve.';

create index if not exists customers_assigned_price_list_idx
  on public.customers (assigned_price_list_id)
  where assigned_price_list_id is not null;

create or replace function public.enforce_customer_assigned_price_list_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text;
begin
  if tg_op = 'UPDATE'
     and new.assigned_price_list_id is distinct from old.assigned_price_list_id
     and not public.is_staff()
  then
    raise exception 'apenas staff pode alterar assigned_price_list_id';
  end if;

  if new.assigned_price_list_id is null then
    return new;
  end if;
  select scope into v_scope from public.price_lists where id = new.assigned_price_list_id;
  if v_scope is distinct from 'assigned' then
    raise exception 'customers.assigned_price_list_id deve apontar para lista scope=assigned';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_customer_assigned_price_list_scope on public.customers;
create trigger trg_enforce_customer_assigned_price_list_scope
  before insert or update of assigned_price_list_id on public.customers
  for each row execute function public.enforce_customer_assigned_price_list_scope();

-- resolve: override → assigned (cliente) → public/promo → default
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
set search_path to 'public', 'pg_temp'
as $$
declare
  v_at timestamptz := coalesce(p_at, now());
  v_row record;
  v_ov_amount numeric;
  v_assigned_list uuid;
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

  -- 0.5) Lista assigned do cliente (B2B / K11) — itens e kits
  if p_customer_id is not null then
    select c.assigned_price_list_id into v_assigned_list
    from public.customers c
    where c.id = p_customer_id;

    if v_assigned_list is not null then
      select
        pli.product_id,
        pli.price as amount,
        pl.id as price_list_id,
        pl.slug as price_list_slug
      into v_row
      from public.price_list_items pli
      join public.price_lists pl on pl.id = pli.price_list_id
      where pli.product_id = p_product_id
        and pl.id = v_assigned_list
        and pl.scope = 'assigned'
        and pl.status = 'active'
        and (pl.valid_from is null or pl.valid_from <= v_at)
        and (pl.valid_until is null or pl.valid_until >= v_at)
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
    end if;
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

comment on function public.resolve_product_price(uuid, uuid, timestamptz) is
  '6B+K11: override → assigned do cliente → public/promo → default. Kits = products.';

drop policy if exists customers_staff_select on public.customers;
create policy customers_staff_select on public.customers
  for select to authenticated
  using (public.is_staff());

drop policy if exists customers_staff_update on public.customers;
create policy customers_staff_update on public.customers
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());
