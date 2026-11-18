-- PLANO 2B Fase B E2: vehicle_visual_assets + compat + storage privado.
-- Camada 2: NÃO misturar com vehicle_evidence. Visual ≠ fato 2A.
-- Sem loader GLB nesta migration (E3).

-- ---------------------------------------------------------------------------
-- 1) Assets
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_visual_assets (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  display_name text not null,
  storage_path text not null,
  format text not null check (format in ('glb', 'gltf')),
  poly_count integer,
  texture_budget_mb numeric(8, 2),
  source text not null check (source in ('acquired', 'ai', 'first_party')),
  vendor text,
  license text,
  commercial_ok boolean not null default false,
  redistribute_ok boolean not null default false,
  version text not null default '1',
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'rejected', 'revoked')),
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vva_code_unique unique (code),
  constraint vva_storage_path_unique unique (storage_path)
);

comment on table public.vehicle_visual_assets is
  'PLANO 2B Fase B: biblioteca GLB/glTF. Separado de vehicle_evidence.';

create index if not exists vva_status_idx on public.vehicle_visual_assets (status);

-- ---------------------------------------------------------------------------
-- 2) Compatibilidade (desativar sem apagar)
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_visual_asset_compat (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.vehicle_visual_assets (id) on delete cascade,
  manufacturer_id uuid references public.manufacturers (id) on delete set null,
  model_id uuid references public.models (id) on delete set null,
  version_id uuid references public.vehicle_versions (id) on delete set null,
  year_from integer,
  year_to integer,
  generation text,
  body_style text,
  facelift text,
  market text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'revoked')),
  revoked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.vehicle_visual_asset_compat is
  'PLANO 2B Fase B: associação asset↔veículo com estados; revoke sem delete.';

create index if not exists vvac_asset_idx on public.vehicle_visual_asset_compat (asset_id);
create index if not exists vvac_model_idx on public.vehicle_visual_asset_compat (manufacturer_id, model_id);

-- ---------------------------------------------------------------------------
-- 3) RLS
-- ---------------------------------------------------------------------------
alter table public.vehicle_visual_assets enable row level security;
alter table public.vehicle_visual_asset_compat enable row level security;

drop policy if exists vva_select on public.vehicle_visual_assets;
create policy vva_select on public.vehicle_visual_assets
  for select to authenticated
  using (public.is_staff() or status = 'approved');

drop policy if exists vva_staff_write on public.vehicle_visual_assets;
create policy vva_staff_write on public.vehicle_visual_assets
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists vvac_select on public.vehicle_visual_asset_compat;
create policy vvac_select on public.vehicle_visual_asset_compat
  for select to authenticated
  using (
    public.is_staff()
    or (
      status = 'approved'
      and exists (
        select 1 from public.vehicle_visual_assets a
        where a.id = vehicle_visual_asset_compat.asset_id
          and a.status = 'approved'
      )
    )
  );

drop policy if exists vvac_staff_write on public.vehicle_visual_asset_compat;
create policy vvac_staff_write on public.vehicle_visual_asset_compat
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

revoke all on public.vehicle_visual_assets from public;
revoke all on public.vehicle_visual_asset_compat from public;
grant select on public.vehicle_visual_assets to authenticated;
grant select on public.vehicle_visual_asset_compat to authenticated;
-- staff writes via RLS (same grants; policy gates)
grant insert, update, delete on public.vehicle_visual_assets to authenticated;
grant insert, update, delete on public.vehicle_visual_asset_compat to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Lookup: asset aprovado para identity (somente leitura)
-- ---------------------------------------------------------------------------
create or replace function public.find_approved_visual_asset_for_identity(
  p_vehicle_identity_id uuid
)
returns public.vehicle_visual_assets
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_mfr uuid;
  v_model uuid;
  v_ver uuid;
  v_year integer;
  v_row public.vehicle_visual_assets;
begin
  select manufacturer_id, model_id, version_id, year
  into v_mfr, v_model, v_ver, v_year
  from public.vehicle_identities
  where id = p_vehicle_identity_id;

  if not found then
    return null;
  end if;

  select a.*
  into v_row
  from public.vehicle_visual_assets a
  join public.vehicle_visual_asset_compat c on c.asset_id = a.id
  where a.status = 'approved'
    and c.status = 'approved'
    and (c.manufacturer_id is null or c.manufacturer_id = v_mfr)
    and (c.model_id is null or c.model_id = v_model)
    and (c.version_id is null or c.version_id = v_ver)
    and (c.year_from is null or v_year is null or c.year_from <= v_year)
    and (c.year_to is null or v_year is null or c.year_to >= v_year)
  order by
    (c.version_id is not null)::int desc,
    (c.model_id is not null)::int desc,
    (c.manufacturer_id is not null)::int desc,
    a.updated_at desc
  limit 1;

  return v_row;
end;
$$;

revoke all on function public.find_approved_visual_asset_for_identity from public;
grant execute on function public.find_approved_visual_asset_for_identity to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Storage bucket privado (originais / aprovados)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-visual-assets',
  'vehicle-visual-assets',
  false,
  52428800,
  array[
    'model/gltf-binary',
    'model/gltf+json',
    'application/octet-stream',
    'application/gltf-buffer'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists vva_storage_select on storage.objects;
create policy vva_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vehicle-visual-assets'
    and (
      public.is_staff()
      or exists (
        select 1 from public.vehicle_visual_assets a
        where a.storage_path = name
          and a.status = 'approved'
      )
    )
  );

drop policy if exists vva_storage_insert on storage.objects;
create policy vva_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vehicle-visual-assets'
    and public.is_staff()
  );

drop policy if exists vva_storage_update on storage.objects;
create policy vva_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'vehicle-visual-assets' and public.is_staff())
  with check (bucket_id = 'vehicle-visual-assets' and public.is_staff());

drop policy if exists vva_storage_delete on storage.objects;
create policy vva_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vehicle-visual-assets'
    and public.is_staff()
  );
