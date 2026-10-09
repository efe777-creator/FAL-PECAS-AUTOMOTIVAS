-- FAL-IMP-08 / DIV-002: custo base único na SQL (principal → fallback FAL-SUP-01).
-- Autoridade: product_base_cost / product_base_costs. Preview admin consome estas RPCs.

create or replace function public.product_base_cost(p_product_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with principal as (
    select sp.cost
    from public.products p
    join public.supplier_products sp
      on sp.product_id = p.id
     and sp.supplier_id = p.supplier_id
    where p.id = p_product_id
      and p.supplier_id is not null
      and sp.cost is not null
    limit 1
  ),
  fal as (
    select sp.cost
    from public.supplier_products sp
    join public.suppliers s on s.id = sp.supplier_id
    where sp.product_id = p_product_id
      and upper(trim(both from coalesce(s.code, ''))) = 'FAL-SUP-01'
      and s.status = 'active'
      and sp.cost is not null
    limit 1
  )
  select coalesce((select cost from principal), (select cost from fal));
$$;

comment on function public.product_base_cost(uuid) is
  'Custo base oficial: products.supplier_id → supplier_products.cost; se ausente, fallback FAL-SUP-01 ativo.';

revoke all on function public.product_base_cost(uuid) from public;
grant execute on function public.product_base_cost(uuid) to authenticated;

-- Lote para admin/preview (evita N+1 e remove regra duplicada no TS).
create or replace function public.product_base_costs(p_product_ids uuid[])
returns table (
  product_id uuid,
  base_cost numeric,
  cost_supplier_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  with ids as (
    select distinct x as id
    from unnest(coalesce(p_product_ids, array[]::uuid[])) as x
    where x is not null
  ),
  fal_sup as (
    select s.id
    from public.suppliers s
    where upper(trim(both from coalesce(s.code, ''))) = 'FAL-SUP-01'
      and s.status = 'active'
    limit 1
  ),
  principal as (
    select
      p.id as product_id,
      sp.cost as base_cost,
      sp.supplier_id as cost_supplier_id
    from ids i
    join public.products p on p.id = i.id
    join public.supplier_products sp
      on sp.product_id = p.id
     and sp.supplier_id = p.supplier_id
    where p.supplier_id is not null
      and sp.cost is not null
  ),
  fal as (
    select
      i.id as product_id,
      sp.cost as base_cost,
      sp.supplier_id as cost_supplier_id
    from ids i
    cross join fal_sup fs
    join public.supplier_products sp
      on sp.product_id = i.id
     and sp.supplier_id = fs.id
    where sp.cost is not null
  )
  select
    i.id as product_id,
    coalesce(pr.base_cost, f.base_cost) as base_cost,
    case
      when pr.base_cost is not null then pr.cost_supplier_id
      else f.cost_supplier_id
    end as cost_supplier_id
  from ids i
  left join principal pr on pr.product_id = i.id
  left join fal f on f.product_id = i.id
  where coalesce(pr.base_cost, f.base_cost) is not null;
$$;

comment on function public.product_base_costs(uuid[]) is
  'Lote oficial de custo base (mesma regra de product_base_cost) + supplier usado.';

revoke all on function public.product_base_costs(uuid[]) from public;
grant execute on function public.product_base_costs(uuid[]) to authenticated;
