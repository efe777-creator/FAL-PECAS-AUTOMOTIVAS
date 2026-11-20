-- Liga produtos com SKU PVI* à marca Nakata (quando existir e brand_id ainda nulo).
-- Contrato Fase 3: fabricante via product_brands / product_references — não coluna codigo_nakata.
-- Também cria referência manufacturer com o próprio SKU quando ainda não houver refs.

do $$
declare
  v_brand_id uuid;
begin
  select id into v_brand_id
  from public.product_brands
  where lower(name) = 'nakata'
  limit 1;

  if v_brand_id is null then
    raise notice 'Marca Nakata ausente — skip link PVI';
    return;
  end if;

  update public.products p
  set brand_id = v_brand_id
  where p.brand_id is null
    and p.sku ilike 'PVI%';

  insert into public.product_references (product_id, code, ref_type, brand_label, status)
  select p.id, p.sku, 'manufacturer', 'Nakata', 'active'
  from public.products p
  where p.brand_id = v_brand_id
    and p.sku ilike 'PVI%'
  on conflict (product_id, code, ref_type) do update
    set brand_label = excluded.brand_label,
        status = 'active';

  perform public.rebuild_product_search_documents(
    array(
      select p.id
      from public.products p
      where p.brand_id = v_brand_id
        and p.sku ilike 'PVI%'
    )
  );
end $$;
