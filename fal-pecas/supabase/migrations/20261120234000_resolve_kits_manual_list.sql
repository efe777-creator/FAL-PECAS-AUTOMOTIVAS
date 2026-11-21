-- K2 alinhamento: lista preco-kits-manual elegível no resolve (sem depender de promoção).
-- Priority 20 > Base (0): kit manual vence a Base; itens não devem ter linha nessa lista.

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

  -- public elegíveis: default | promoção ativa | lista manual de kits (K2)
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
      or pl.slug = 'preco-kits-manual'
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
  '6B+K11+K2: override → assigned → public (default|promo|preco-kits-manual) → default fallback.';
