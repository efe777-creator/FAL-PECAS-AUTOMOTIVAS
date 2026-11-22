-- Garagem: version_id de VV casca (sem ano/motor/versão) não é identidade — zera no sanitize.

create or replace function public.sanitize_garage_vehicle_fks(
  p_manufacturer_id uuid,
  p_model_id uuid,
  p_version_id uuid,
  out o_manufacturer_id uuid,
  out o_model_id uuid,
  out o_version_id uuid
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_canon uuid;
begin
  o_manufacturer_id := p_manufacturer_id;
  o_model_id := p_model_id;
  o_version_id := p_version_id;

  if o_model_id is not null then
    select canonical_model_id into v_canon
    from public.models
    where id = o_model_id and quality_status = 'superseded';
    if v_canon is not null then
      o_model_id := v_canon;
      o_version_id := null;
    end if;
  end if;

  if o_model_id is not null and not exists (
    select 1 from public.models m
    where m.id = o_model_id and m.status = 'active' and m.quality_status = 'verified'
  ) then
    o_model_id := null;
    o_version_id := null;
  end if;

  if o_manufacturer_id is not null and not exists (
    select 1 from public.manufacturers mk where mk.id = o_manufacturer_id and mk.status = 'active'
  ) then
    o_manufacturer_id := null;
  end if;

  if o_model_id is not null then
    select manufacturer_id into o_manufacturer_id from public.models where id = o_model_id;
  end if;

  -- Exige VV tipada (ano OU motor OU version_name) — cascas Idea/Palio/Siena não contam.
  if o_version_id is not null and not exists (
    select 1
    from public.vehicle_versions vv
    join public.models mo on mo.id = vv.model_id
    where vv.id = o_version_id
      and vv.status = 'active'
      and vv.model_id = o_model_id
      and mo.status = 'active'
      and mo.quality_status = 'verified'
      and (
        vv.year is not null
        or nullif(trim(coalesce(vv.engine, '')), '') is not null
        or nullif(trim(coalesce(vv.version_name, '')), '') is not null
      )
  ) then
    o_version_id := null;
  end if;
end;
$$;

comment on function public.sanitize_garage_vehicle_fks(uuid, uuid, uuid) is
  'Higiene FK garagem; SECURITY DEFINER; rejeita version_id de VV casca sem tipagem.';

revoke all on function public.sanitize_garage_vehicle_fks(uuid, uuid, uuid) from public;
grant execute on function public.sanitize_garage_vehicle_fks(uuid, uuid, uuid) to authenticated;
grant execute on function public.sanitize_garage_vehicle_fks(uuid, uuid, uuid) to service_role;
