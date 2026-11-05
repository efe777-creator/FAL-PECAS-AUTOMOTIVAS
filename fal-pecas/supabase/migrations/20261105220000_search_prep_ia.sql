-- Onda 4 item 22: prep IA na busca (sem modelo vetorial).
-- Sinônimos + flag + função canônica de search_document + rebuild.
-- Hotfix: trigger de medidas referenciava coluna inexistente logistic_profile.

create or replace function public.log_product_measure_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes jsonb := '{}'::jsonb;
  v_source text := coalesce(nullif(current_setting('fal.measure_source', true), ''), 'manual');
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.weight_kg is distinct from new.weight_kg
     or old.weight_origin is distinct from new.weight_origin then
    v_changes := v_changes || jsonb_build_object(
      'weight_kg', jsonb_build_object(
        'old', old.weight_kg, 'new', new.weight_kg,
        'old_origin', old.weight_origin, 'new_origin', new.weight_origin
      )
    );
  end if;

  if old.height_cm is distinct from new.height_cm
     or old.height_origin is distinct from new.height_origin then
    v_changes := v_changes || jsonb_build_object(
      'height_cm', jsonb_build_object(
        'old', old.height_cm, 'new', new.height_cm,
        'old_origin', old.height_origin, 'new_origin', new.height_origin
      )
    );
  end if;

  if old.width_cm is distinct from new.width_cm
     or old.width_origin is distinct from new.width_origin then
    v_changes := v_changes || jsonb_build_object(
      'width_cm', jsonb_build_object(
        'old', old.width_cm, 'new', new.width_cm,
        'old_origin', old.width_origin, 'new_origin', new.width_origin
      )
    );
  end if;

  if old.length_cm is distinct from new.length_cm
     or old.length_origin is distinct from new.length_origin then
    v_changes := v_changes || jsonb_build_object(
      'length_cm', jsonb_build_object(
        'old', old.length_cm, 'new', new.length_cm,
        'old_origin', old.length_origin, 'new_origin', new.length_origin
      )
    );
  end if;

  if old.pol_unit is distinct from new.pol_unit
     or old.pol_origin is distinct from new.pol_origin then
    v_changes := v_changes || jsonb_build_object(
      'pol_unit', jsonb_build_object(
        'old', old.pol_unit, 'new', new.pol_unit,
        'old_origin', old.pol_origin, 'new_origin', new.pol_origin
      )
    );
  end if;

  if old.logistic_porte is distinct from new.logistic_porte
     or old.logistic_profile_origin is distinct from new.logistic_profile_origin then
    v_changes := v_changes || jsonb_build_object(
      'logistic_porte', jsonb_build_object(
        'old', old.logistic_porte, 'new', new.logistic_porte,
        'old_origin', old.logistic_profile_origin,
        'new_origin', new.logistic_profile_origin
      )
    );
  end if;

  if old.own_delivery_allowed is distinct from new.own_delivery_allowed then
    v_changes := v_changes || jsonb_build_object(
      'own_delivery_allowed', jsonb_build_object(
        'old', old.own_delivery_allowed, 'new', new.own_delivery_allowed
      )
    );
  end if;

  if v_changes <> '{}'::jsonb then
    insert into public.product_measure_change_history (
      product_id, changes, source, changed_by
    ) values (
      new.id,
      v_changes,
      case when v_source in ('manual', 'bulk', 'system', 'seed') then v_source else 'manual' end,
      auth.uid()
    );
  end if;

  return new;
end;
$$;

comment on column public.products.search_document is
  'Documento textual unificado para busca ILIKE. Prep IA: fonte de embedding futuro (sem pgvector nesta MARCHA).';

-- 1) Sinônimos (termo do cliente → forma no catálogo)
create table if not exists public.search_synonyms (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  expands_to text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint search_synonyms_term_nonempty check (length(trim(term)) > 0),
  constraint search_synonyms_expands_nonempty check (length(trim(expands_to)) > 0)
);

create unique index if not exists search_synonyms_term_lower_uidx
  on public.search_synonyms (lower(trim(term)));

alter table public.search_synonyms enable row level security;

drop policy if exists search_synonyms_public_read on public.search_synonyms;
create policy search_synonyms_public_read on public.search_synonyms
  for select to anon, authenticated
  using (active = true);

drop policy if exists search_synonyms_staff_write on public.search_synonyms;
create policy search_synonyms_staff_write on public.search_synonyms
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on public.search_synonyms to anon, authenticated;
grant select, insert, update, delete on public.search_synonyms to authenticated;

insert into public.search_synonyms (term, expands_to)
select v.term, v.expands_to
from (
  values
    ('shock', 'amortecedor'),
    ('ponteira', 'terminal'),
    ('barra axial', 'axial'),
    ('disco freio', 'disco'),
    ('coxim motor', 'coxim'),
    ('silent block', 'bucha')
) as v(term, expands_to)
where not exists (
  select 1 from public.search_synonyms s where lower(trim(s.term)) = lower(trim(v.term))
);

-- 2) Flag prep
create table if not exists public.store_search_prep (
  id uuid primary key default gen_random_uuid(),
  synonym_expansion_enabled boolean not null default false,
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists store_search_prep_singleton
  on public.store_search_prep ((true));

alter table public.store_search_prep enable row level security;

drop policy if exists store_search_prep_public_read on public.store_search_prep;
create policy store_search_prep_public_read on public.store_search_prep
  for select to anon, authenticated
  using (true);

drop policy if exists store_search_prep_staff_write on public.store_search_prep;
create policy store_search_prep_staff_write on public.store_search_prep
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on public.store_search_prep to anon, authenticated;
grant select, insert, update on public.store_search_prep to authenticated;

insert into public.store_search_prep (synonym_expansion_enabled)
select false
where not exists (select 1 from public.store_search_prep);

-- 3) Função canônica + rebuild
create or replace function public.build_product_search_document(p_product_id uuid)
returns text
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_parts text := '';
  v_base text;
  v_extra text := '';
begin
  select concat_ws(
    ' ',
    p.name,
    p.sku,
    p.commercial_ref,
    coalesce(p.short_description, ''),
    coalesce(p.description, ''),
    coalesce(p.manufacturer_code, ''),
    coalesce(p.posicao, ''),
    coalesce(p.lado, ''),
    coalesce(pb.name, ''),
    coalesce(pc.name, '')
  )
  into v_base
  from public.products p
  left join public.product_brands pb on pb.id = p.brand_id
  left join public.product_categories pc on pc.id = p.category_id
  where p.id = p_product_id;

  if v_base is null then
    return null;
  end if;

  select coalesce(string_agg(distinct pr.code, ' '), '')
  into v_parts
  from public.product_references pr
  where pr.product_id = p_product_id
    and coalesce(pr.code, '') <> '';

  -- Sinônimos reversos: se o doc contém expands_to, inclui term (busca por apelido).
  select coalesce(string_agg(distinct s.term, ' '), '')
  into v_extra
  from public.search_synonyms s
  where s.active
    and position(
      lower(public.f_unaccent(s.expands_to))
      in lower(public.f_unaccent(v_base || ' ' || coalesce(v_parts, '')))
    ) > 0;

  return lower(trim(both from concat_ws(' ', v_base, nullif(v_parts, ''), nullif(v_extra, ''))));
end;
$$;

create or replace function public.rebuild_product_search_documents(p_ids uuid[] default null)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  n integer := 0;
begin
  if p_ids is null then
    update public.products p
    set search_document = public.build_product_search_document(p.id);
    get diagnostics n = row_count;
  else
    update public.products p
    set search_document = public.build_product_search_document(p.id)
    where p.id = any (p_ids);
    get diagnostics n = row_count;
  end if;
  return n;
end;
$$;

grant execute on function public.build_product_search_document(uuid) to authenticated;
grant execute on function public.rebuild_product_search_documents(uuid[]) to authenticated;

-- 4) Rebuild inicial
select public.rebuild_product_search_documents(null);
