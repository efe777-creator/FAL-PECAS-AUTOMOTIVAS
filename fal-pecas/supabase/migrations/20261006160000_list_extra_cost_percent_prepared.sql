-- PREPARED — NÃO APLICAR automaticamente (auditoria operacional 2026-10-06).
-- Adicional de custo (%) da lista: coluna nova, paralelo a list_extra_cost (R$).
--
-- Compatibilidade:
--   * list_extra_cost (R$) NÃO é removido nem muda de significado (placeholder / fora do cálculo).
--   * list_extra_cost_percent é campo ADICIONAL.
--
-- Fórmula alvo:
--   custo_total = product_base_cost(product) * (1 + list_extra_cost_percent/100)
--                 + price_list_items.extra_cost
--   list_extra_cost (R$) permanece FORA do cálculo.

-- ---------------------------------------------------------------------------
-- Coluna
-- ---------------------------------------------------------------------------
alter table public.price_lists
  add column if not exists list_extra_cost_percent numeric(8, 4) not null default 0
    check (list_extra_cost_percent >= 0);

comment on column public.price_lists.list_extra_cost is
  'F8.1 D15: placeholder custo_adicional_da_lista em R$. Sem rateio; NÃO entra no cálculo.';

comment on column public.price_lists.list_extra_cost_percent is
  'Adicional de custo (%) da lista. Entra em custo_total = base*(1+pct/100)+extra_cost do item.';

-- ---------------------------------------------------------------------------
-- compute_item_cost_total: passa a considerar % da lista (via price_list_id no item)
-- Assinatura antiga (product_id, extra_cost) mantida para compat: aí % = 0.
-- Nova overload com price_list_id aplica o %.
-- ---------------------------------------------------------------------------
create or replace function public.compute_item_cost_total(
  p_product_id uuid,
  p_extra_cost numeric
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_base numeric;
  v_extra numeric := coalesce(p_extra_cost, 0);
begin
  v_base := public.product_base_cost(p_product_id);
  if v_base is null then
    return null;
  end if;
  if v_base < 0 or v_extra < 0 then
    return null;
  end if;
  -- Sem price_list_id: comportamento legado (sem % de lista)
  return round(v_base + v_extra, 2);
end;
$$;

create or replace function public.compute_item_cost_total(
  p_product_id uuid,
  p_extra_cost numeric,
  p_price_list_id uuid
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_base numeric;
  v_extra numeric := coalesce(p_extra_cost, 0);
  v_pct numeric := 0;
begin
  v_base := public.product_base_cost(p_product_id);
  if v_base is null then
    return null;
  end if;
  if v_base < 0 or v_extra < 0 then
    return null;
  end if;

  if p_price_list_id is not null then
    select coalesce(pl.list_extra_cost_percent, 0)
      into v_pct
    from public.price_lists pl
    where pl.id = p_price_list_id;
  end if;

  if v_pct < 0 then
    return null;
  end if;

  -- list_extra_cost (R$) permanece FORA
  return round(v_base * (1 + v_pct / 100.0) + v_extra, 2);
end;
$$;

revoke all on function public.compute_item_cost_total(uuid, numeric) from public;
grant execute on function public.compute_item_cost_total(uuid, numeric) to authenticated;
revoke all on function public.compute_item_cost_total(uuid, numeric, uuid) from public;
grant execute on function public.compute_item_cost_total(uuid, numeric, uuid) to authenticated;

-- Após aplicar: atualizar callers de recalc para usar a overload com p_price_list_id
-- (recalculate_price_list_items / set_price_list_item_pricing) — revisão manual.
-- NÃO altera resolve_product_price(s) nesta prepared.
