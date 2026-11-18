-- Consolida 3D: status review/retired + matching fino compat + ownership na RPC.

-- 1) Status assets: review + retired (revoked permanece por compatibilidade)
alter table public.vehicle_visual_assets
  drop constraint if exists vehicle_visual_assets_status_check;

alter table public.vehicle_visual_assets
  add constraint vehicle_visual_assets_status_check
  check (status in ('draft', 'review', 'approved', 'rejected', 'revoked', 'retired'));

comment on column public.vehicle_visual_assets.status is
  'draft|review|approved|rejected|revoked|retired — retired = arquivado (alias semântico de revoke).';

-- 2) RPC: matching generation/body_style/facelift + ownership (staff ou dono membership)
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
  v_ok boolean := false;
begin
  -- Ownership: staff OU customer com membership ativa nesta identity
  if public.is_staff() then
    v_ok := true;
  elsif exists (
    select 1
    from public.customer_vehicles cv
    where cv.vehicle_identity_id = p_vehicle_identity_id
      and cv.customer_id = public.current_customer_id()
  ) then
    v_ok := true;
  end if;

  if not v_ok then
    return null;
  end if;

  -- Identity hoje: manufacturer/model/version/year (sem generation/body_style no canônico).
  -- Compat.generation/body_style/facelift são metadados ADM: linhas com esses campos
  -- preenchidos têm prioridade no ORDER BY, mas não bloqueiam o match até o canônico
  -- expor geração/carroceria. Facelift exigente (não-null) é restritivo: só casa se null.
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
    and (c.facelift is null or length(trim(c.facelift)) = 0)
  order by
    (c.version_id is not null)::int desc,
    (c.generation is not null)::int desc,
    (c.body_style is not null)::int desc,
    (c.model_id is not null)::int desc,
    (c.manufacturer_id is not null)::int desc,
    a.updated_at desc
  limit 1;

  return v_row;
end;
$$;

revoke all on function public.find_approved_visual_asset_for_identity from public;
grant execute on function public.find_approved_visual_asset_for_identity to authenticated;
