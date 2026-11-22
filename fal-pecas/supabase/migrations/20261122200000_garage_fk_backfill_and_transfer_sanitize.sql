-- Backfill FKs sujas + sanitize reutilizável em transferências.

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

  if o_version_id is not null and not exists (
    select 1
    from public.vehicle_versions vv
    join public.models mo on mo.id = vv.model_id
    where vv.id = o_version_id
      and vv.status = 'active'
      and vv.model_id = o_model_id
      and mo.status = 'active'
      and mo.quality_status = 'verified'
  ) then
    o_version_id := null;
  end if;
end;
$$;

revoke all on function public.sanitize_garage_vehicle_fks(uuid, uuid, uuid) from public;
grant execute on function public.sanitize_garage_vehicle_fks(uuid, uuid, uuid) to authenticated;
grant execute on function public.sanitize_garage_vehicle_fks(uuid, uuid, uuid) to service_role;

-- Backfill vehicle_identities
update public.vehicle_identities vi
set
  manufacturer_id = s.o_manufacturer_id,
  model_id = s.o_model_id,
  version_id = s.o_version_id
from (
  select vi2.id, x.o_manufacturer_id, x.o_model_id, x.o_version_id
  from public.vehicle_identities vi2
  cross join lateral public.sanitize_garage_vehicle_fks(vi2.manufacturer_id, vi2.model_id, vi2.version_id) x
) s
where vi.id = s.id
  and (
    vi.model_id is distinct from s.o_model_id
    or vi.version_id is distinct from s.o_version_id
    or vi.manufacturer_id is distinct from s.o_manufacturer_id
  );

-- Backfill customer_vehicles
update public.customer_vehicles cv
set
  manufacturer_id = s.o_manufacturer_id,
  model_id = s.o_model_id,
  version_id = s.o_version_id
from (
  select cv2.id, x.o_manufacturer_id, x.o_model_id, x.o_version_id
  from public.customer_vehicles cv2
  cross join lateral public.sanitize_garage_vehicle_fks(cv2.manufacturer_id, cv2.model_id, cv2.version_id) x
) s
where cv.id = s.id
  and (
    cv.model_id is distinct from s.o_model_id
    or cv.version_id is distinct from s.o_version_id
    or cv.manufacturer_id is distinct from s.o_manufacturer_id
  );

-- transfer_vehicle_ownership_base: sanitiza ao clonar membership
create or replace function public.transfer_vehicle_ownership_base(
  p_vehicle_identity_id uuid,
  p_new_customer_id uuid,
  p_create_membership boolean default true
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_caller uuid := public.current_customer_id();
  v_open_id uuid;
  v_new_period_id uuid;
  v_identity public.vehicle_identities%rowtype;
  v_maker uuid;
  v_model uuid;
  v_version uuid;
begin
  if v_caller is null then
    raise exception 'customer not found' using errcode = '42501';
  end if;

  if p_new_customer_id is null or p_new_customer_id = v_caller then
    raise exception 'invalid new customer' using errcode = '22023';
  end if;

  select * into v_identity
  from public.vehicle_identities
  where id = p_vehicle_identity_id and merged_into_id is null
  for update;

  if not found then
    raise exception 'identity not found' using errcode = 'P0002';
  end if;

  select id into v_open_id
  from public.vehicle_ownership_periods
  where vehicle_identity_id = p_vehicle_identity_id
    and customer_id = v_caller
    and ended_at is null
  for update;

  if v_open_id is null then
    raise exception 'caller is not current owner' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.vehicle_ownership_periods
    where vehicle_identity_id = p_vehicle_identity_id
      and ended_at is null
      and id <> v_open_id
  ) then
    raise exception 'concurrent open ownership' using errcode = '40001';
  end if;

  select s.o_manufacturer_id, s.o_model_id, s.o_version_id
  into v_maker, v_model, v_version
  from public.sanitize_garage_vehicle_fks(
    v_identity.manufacturer_id, v_identity.model_id, v_identity.version_id
  ) s;

  -- Espelha higiene na identity fonte
  update public.vehicle_identities
  set manufacturer_id = v_maker, model_id = v_model, version_id = v_version
  where id = p_vehicle_identity_id
    and (
      manufacturer_id is distinct from v_maker
      or model_id is distinct from v_model
      or version_id is distinct from v_version
    );

  update public.vehicle_ownership_periods
  set ended_at = now(), ended_reason = 'transfer'
  where id = v_open_id;

  insert into public.vehicle_ownership_periods (
    vehicle_identity_id, customer_id,
    started_at, started_certainty, registered_at
  ) values (
    p_vehicle_identity_id, p_new_customer_id,
    null, 'unknown', now()
  )
  returning id into v_new_period_id;

  if coalesce(p_create_membership, true) then
    insert into public.customer_vehicles (
      customer_id, manufacturer_id, model_id, version_id,
      year, engine, maker_text, model_text, version_text, engine_text,
      plate, plate_normalized, vehicle_identity_id, is_primary
    )
    select
      p_new_customer_id,
      v_maker, v_model, v_version,
      v_identity.year, v_identity.engine_text,
      v_identity.maker_text, v_identity.model_text, v_identity.version_text, v_identity.engine_text,
      v_identity.plate_current, v_identity.plate_normalized_current,
      p_vehicle_identity_id, false
    where not exists (
      select 1 from public.customer_vehicles cv
      where cv.customer_id = p_new_customer_id
        and cv.vehicle_identity_id = p_vehicle_identity_id
    );
  end if;

  return v_new_period_id;
end;
$$;

-- accept_vehicle_transfer: sanitiza no insert de membership
create or replace function public.accept_vehicle_transfer(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer uuid := public.current_customer_id();
  v_row public.vehicle_transfer_requests;
  v_period uuid;
  v_maker uuid;
  v_model uuid;
  v_version uuid;
begin
  select * into v_row from public.vehicle_transfer_requests where id = p_request_id for update;
  if not found then raise exception 'request not found' using errcode = 'P0002'; end if;
  if v_row.to_customer_id <> v_customer then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'not pending' using errcode = '22023';
  end if;
  if v_row.expires_at < now() then
    update public.vehicle_transfer_requests
    set status = 'expired', resolved_at = now()
    where id = p_request_id;
    raise exception 'transfer expired' using errcode = '22023';
  end if;

  perform set_config('request.jwt.claim.sub', coalesce(auth.uid()::text, ''), true);

  if not exists (
    select 1 from public.vehicle_ownership_periods
    where vehicle_identity_id = v_row.vehicle_identity_id
      and customer_id = v_row.from_customer_id and ended_at is null
  ) then
    raise exception 'source no longer owner' using errcode = '42501';
  end if;

  select s.o_manufacturer_id, s.o_model_id, s.o_version_id
  into v_maker, v_model, v_version
  from public.vehicle_identities i
  cross join lateral public.sanitize_garage_vehicle_fks(i.manufacturer_id, i.model_id, i.version_id) s
  where i.id = v_row.vehicle_identity_id;

  update public.vehicle_identities
  set manufacturer_id = v_maker, model_id = v_model, version_id = v_version
  where id = v_row.vehicle_identity_id
    and (
      manufacturer_id is distinct from v_maker
      or model_id is distinct from v_model
      or version_id is distinct from v_version
    );

  update public.vehicle_ownership_periods
  set ended_at = now(), ended_reason = 'transfer'
  where vehicle_identity_id = v_row.vehicle_identity_id
    and customer_id = v_row.from_customer_id
    and ended_at is null;

  insert into public.vehicle_ownership_periods (
    vehicle_identity_id, customer_id, started_at, started_certainty, registered_at, transfer_id
  ) values (
    v_row.vehicle_identity_id, v_row.to_customer_id, null, 'unknown', now(), v_row.id
  )
  returning id into v_period;

  insert into public.customer_vehicles (
    customer_id, manufacturer_id, model_id, version_id,
    year, engine, maker_text, model_text, version_text, engine_text,
    plate, plate_normalized, vehicle_identity_id, is_primary
  )
  select
    v_row.to_customer_id,
    v_maker, v_model, v_version,
    i.year, i.engine_text, i.maker_text, i.model_text, i.version_text, i.engine_text,
    i.plate_current, i.plate_normalized_current, i.id, false
  from public.vehicle_identities i
  where i.id = v_row.vehicle_identity_id
    and not exists (
      select 1 from public.customer_vehicles cv
      where cv.customer_id = v_row.to_customer_id
        and cv.vehicle_identity_id = v_row.vehicle_identity_id
    );

  update public.vehicle_shares
  set revoked_at = now(), revoked_by = v_customer
  where vehicle_identity_id = v_row.vehicle_identity_id
    and grantor_customer_id = v_row.from_customer_id
    and revoked_at is null;

  if v_row.consent_share_private_evidence then
    update public.vehicle_evidence e
    set visibility = 'shared'
    where e.vehicle_identity_id = v_row.vehicle_identity_id
      and e.visibility = 'private_owner'
      and e.uploaded_by_customer_id = v_row.from_customer_id;
  end if;

  update public.vehicle_transfer_requests
  set status = 'accepted', resolved_at = now(), resolved_by = v_customer
  where id = p_request_id;

  perform public.log_vehicle_access(
    v_row.vehicle_identity_id, 'transfer_accept', 'vehicle_transfer_request', p_request_id,
    jsonb_build_object(
      'new_period', v_period,
      'consent_history', v_row.consent_share_history,
      'consent_private_evidence', v_row.consent_share_private_evidence
    )
  );

  return v_period;
end;
$$;

revoke all on function public.transfer_vehicle_ownership_base(uuid, uuid, boolean) from public;
grant execute on function public.transfer_vehicle_ownership_base(uuid, uuid, boolean) to authenticated;
revoke all on function public.accept_vehicle_transfer(uuid) from public;
grant execute on function public.accept_vehicle_transfer(uuid) to authenticated;
