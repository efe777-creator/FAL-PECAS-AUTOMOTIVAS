-- Onda 2: sugestões do SearchBar — payload mínimo, sem filtros veículo/categoria,
-- sem total_count; resolve de preço + imagem só no top-N.

create or replace function public.search_product_suggestions(
  p_q text,
  p_limit integer default 6
)
returns table (
  id uuid,
  sku text,
  name text,
  slug text,
  commercial_ref text,
  brand_name text,
  price numeric,
  promo_price numeric,
  resolved_amount numeric,
  image_path text,
  relevance_score numeric
)
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  v_q text := nullif(trim(p_q), '');
  v_limit integer := least(greatest(coalesce(p_limit, 6), 1), 12);
  v_terms text[];
begin
  if v_q is null or length(v_q) < 2 then
    return;
  end if;

  select coalesce(array_agg(t), '{}'::text[])
  into v_terms
  from (
    select lower(public.f_unaccent(term)) as t
    from unnest(regexp_split_to_array(v_q, '\s+')) as term
    where length(trim(term)) > 0
  ) s
  where t <> '';

  if cardinality(v_terms) = 0 then
    return;
  end if;

  return query
  with scored as (
    select
      p.id,
      p.sku,
      p.name,
      p.slug,
      p.price,
      p.promo_price,
      p.commercial_ref,
      pb.name as brand_name,
      (
        select coalesce(sum(term_score), 0)
        from (
          select
            greatest(
              case when lower(public.f_unaccent(p.sku)) = t then 1000 else 0 end,
              case when lower(public.f_unaccent(p.commercial_ref)) = t then 950 else 0 end,
              case
                when exists (
                  select 1
                  from public.product_references pr
                  where pr.product_id = p.id
                    and pr.status = 'active'
                    and lower(public.f_unaccent(pr.code)) = t
                ) then 800
                else 0
              end,
              case
                when lower(public.f_unaccent(p.name)) like '%' || t || '%' then 400
                else 0
              end,
              case
                when lower(public.f_unaccent(coalesce(p.search_document, ''))) like '%' || t || '%'
                  or lower(public.f_unaccent(coalesce(p.manufacturer_code, ''))) like '%' || t || '%'
                  or lower(public.f_unaccent(coalesce(pb.name, ''))) like '%' || t || '%'
                  or lower(public.f_unaccent(p.commercial_ref)) like '%' || t || '%'
                then 200
                else 0
              end
            ) as term_score
          from unnest(v_terms) as t
        ) scores
      )::numeric as relevance_score
    from public.products p
    left join public.product_brands pb on pb.id = p.brand_id
    where p.status = 'published'
      and (
        select bool_and(matched)
        from (
          select (
            lower(public.f_unaccent(p.sku)) like '%' || t || '%'
            or lower(public.f_unaccent(p.commercial_ref)) like '%' || t || '%'
            or lower(public.f_unaccent(p.name)) like '%' || t || '%'
            or lower(public.f_unaccent(coalesce(p.search_document, ''))) like '%' || t || '%'
            or lower(public.f_unaccent(coalesce(p.manufacturer_code, ''))) like '%' || t || '%'
            or lower(public.f_unaccent(coalesce(pb.name, ''))) like '%' || t || '%'
            or exists (
              select 1
              from public.product_references pr
              where pr.product_id = p.id
                and pr.status = 'active'
                and lower(public.f_unaccent(pr.code)) like '%' || t || '%'
            )
          ) as matched
          from unnest(v_terms) as t
        ) m
      )
    order by relevance_score desc nulls last, p.name asc
    limit v_limit
  )
  select
    s.id,
    s.sku,
    s.name,
    s.slug,
    s.commercial_ref,
    s.brand_name,
    s.price,
    s.promo_price,
    public.try_resolve_product_amount(s.id, null, now()) as resolved_amount,
    (
      select pi.storage_path
      from public.product_images pi
      where pi.product_id = s.id
      order by pi.is_primary desc, pi.sort_order asc
      limit 1
    ) as image_path,
    s.relevance_score
  from scored s
  order by s.relevance_score desc nulls last, s.name asc;
end;
$$;

revoke all on function public.search_product_suggestions(text, integer) from public;
grant execute on function public.search_product_suggestions(text, integer) to anon, authenticated;

comment on function public.search_product_suggestions is
  'Onda 2 SearchBar: top-N leve (sem veículo/categoria/total); resolve+imagem só no limite.';
