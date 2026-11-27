-- Fase 2 — enriquecimento seguro de atributos técnicos (só NULL; conflitos no retorno).
-- Não altera a assinatura de upsert_vehicle_canonical (placa / 7 args permanece).

create or replace function public.enrich_vehicle_version_tech(
  p_version_id uuid,
  p_fuel text default null,
  p_transmission text default null,
  p_transmission_detail text default null,
  p_traction text default null,
  p_traction_detail text default null,
  p_body_configuration text default null,
  p_vehicle_class text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.vehicle_versions%rowtype;
  v_fuel text := nullif(trim(both from coalesce(p_fuel, '')), '');
  v_transmission text := lower(nullif(trim(both from coalesce(p_transmission, '')), ''));
  v_transmission_detail text := lower(nullif(trim(both from coalesce(p_transmission_detail, '')), ''));
  v_traction text := lower(nullif(trim(both from coalesce(p_traction, '')), ''));
  v_traction_detail text := lower(nullif(trim(both from coalesce(p_traction_detail, '')), ''));
  v_body text := lower(nullif(trim(both from coalesce(p_body_configuration, '')), ''));
  v_class text := lower(nullif(trim(both from coalesce(p_vehicle_class, '')), ''));
  v_conflicts jsonb := '[]'::jsonb;
  v_enriched text[] := '{}';
begin
  if not public.is_staff()
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'staff_or_service_role_required' using errcode = '42501';
  end if;

  select * into v_row from public.vehicle_versions where id = p_version_id;
  if v_row.id is null then
    raise exception 'vehicle_version_not_found' using errcode = 'P0001';
  end if;

  if v_transmission is not null
     and v_transmission not in ('manual', 'automatica', 'automatizada') then
    raise exception 'invalid_transmission' using errcode = '22023';
  end if;
  if v_transmission_detail is not null
     and v_transmission_detail not in ('cvt', 'at', 'amt') then
    raise exception 'invalid_transmission_detail' using errcode = '22023';
  end if;
  if v_traction is not null and v_traction not in ('4x2', '4x4', 'awd') then
    raise exception 'invalid_traction' using errcode = '22023';
  end if;
  if v_traction_detail is not null
     and v_traction_detail not in ('dianteira', 'traseira') then
    raise exception 'invalid_traction_detail' using errcode = '22023';
  end if;
  if v_body is not null
     and v_body not in (
       'hatch', 'sedan', 'perua', 'cabine_simples', 'cabine_estendida',
       'cabine_dupla', 'furgao', 'chassi', 'picape'
     ) then
    raise exception 'invalid_body_configuration' using errcode = '22023';
  end if;
  if v_class is not null
     and v_class not in ('car', 'light_utility', 'motorcycle', 'trailer', 'unknown') then
    raise exception 'invalid_vehicle_class' using errcode = '22023';
  end if;

  if v_fuel is not null then
    if nullif(trim(coalesce(v_row.fuel, '')), '') is null then
      update public.vehicle_versions
        set fuel = v_fuel, updated_at = now()
      where id = p_version_id;
      v_enriched := array_append(v_enriched, 'fuel');
      v_row.fuel := v_fuel;
    elsif lower(trim(v_row.fuel)) <> lower(v_fuel) then
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'attribute', 'fuel', 'current', v_row.fuel, 'incoming', v_fuel
      ));
    end if;
  end if;

  if v_transmission is not null then
    if nullif(trim(coalesce(v_row.transmission, '')), '') is null then
      update public.vehicle_versions
      set transmission = v_transmission,
          transmission_detail = coalesce(v_transmission_detail, transmission_detail),
          updated_at = now()
      where id = p_version_id;
      v_enriched := array_append(v_enriched, 'transmission');
      v_row.transmission := v_transmission;
      if v_transmission_detail is not null then
        v_row.transmission_detail := v_transmission_detail;
        v_enriched := array_append(v_enriched, 'transmission_detail');
      end if;
    elsif lower(trim(v_row.transmission)) <> v_transmission then
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'attribute', 'transmission', 'current', v_row.transmission, 'incoming', v_transmission
      ));
    end if;
  end if;

  if v_transmission_detail is not null
     and nullif(trim(coalesce(v_row.transmission, '')), '') is not null then
    if nullif(trim(coalesce(v_row.transmission_detail, '')), '') is null then
      update public.vehicle_versions
      set transmission_detail = v_transmission_detail, updated_at = now()
      where id = p_version_id;
      if not ('transmission_detail' = any (v_enriched)) then
        v_enriched := array_append(v_enriched, 'transmission_detail');
      end if;
      v_row.transmission_detail := v_transmission_detail;
    elsif lower(trim(v_row.transmission_detail)) <> v_transmission_detail then
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'attribute', 'transmission_detail',
        'current', v_row.transmission_detail,
        'incoming', v_transmission_detail
      ));
    end if;
  end if;

  if v_traction is not null then
    if nullif(trim(coalesce(v_row.traction, '')), '') is null then
      update public.vehicle_versions
      set traction = v_traction,
          traction_detail = coalesce(v_traction_detail, traction_detail),
          updated_at = now()
      where id = p_version_id;
      v_enriched := array_append(v_enriched, 'traction');
      v_row.traction := v_traction;
      if v_traction_detail is not null then
        v_row.traction_detail := v_traction_detail;
        v_enriched := array_append(v_enriched, 'traction_detail');
      end if;
    elsif lower(trim(v_row.traction)) <> v_traction then
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'attribute', 'traction', 'current', v_row.traction, 'incoming', v_traction
      ));
    end if;
  end if;

  if v_traction_detail is not null
     and nullif(trim(coalesce(v_row.traction, '')), '') is not null then
    if nullif(trim(coalesce(v_row.traction_detail, '')), '') is null then
      update public.vehicle_versions
      set traction_detail = v_traction_detail, updated_at = now()
      where id = p_version_id;
      if not ('traction_detail' = any (v_enriched)) then
        v_enriched := array_append(v_enriched, 'traction_detail');
      end if;
      v_row.traction_detail := v_traction_detail;
    elsif lower(trim(v_row.traction_detail)) <> v_traction_detail then
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'attribute', 'traction_detail',
        'current', v_row.traction_detail,
        'incoming', v_traction_detail
      ));
    end if;
  end if;

  if v_body is not null then
    if nullif(trim(coalesce(v_row.body_configuration, '')), '') is null then
      update public.vehicle_versions
      set body_configuration = v_body, updated_at = now()
      where id = p_version_id;
      v_enriched := array_append(v_enriched, 'body_configuration');
      v_row.body_configuration := v_body;
    elsif lower(trim(v_row.body_configuration)) <> v_body then
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'attribute', 'body_configuration',
        'current', v_row.body_configuration,
        'incoming', v_body
      ));
    end if;
  end if;

  if v_class is not null then
    if nullif(trim(coalesce(v_row.vehicle_class, '')), '') is null then
      update public.vehicle_versions
      set vehicle_class = v_class, updated_at = now()
      where id = p_version_id;
      v_enriched := array_append(v_enriched, 'vehicle_class');
      v_row.vehicle_class := v_class;
    elsif lower(trim(v_row.vehicle_class)) <> v_class then
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'attribute', 'vehicle_class',
        'current', v_row.vehicle_class,
        'incoming', v_class
      ));
    end if;
  end if;

  return jsonb_build_object(
    'versionId', p_version_id,
    'enriched', to_jsonb(v_enriched),
    'conflicts', v_conflicts
  );
end;
$$;

revoke all on function public.enrich_vehicle_version_tech(
  uuid, text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.enrich_vehicle_version_tech(
  uuid, text, text, text, text, text, text, text
) to authenticated, service_role;

comment on function public.enrich_vehicle_version_tech is
  'Enriquece só campos NULL em vehicle_versions; divergências voltam em conflicts (sem sobrescrever).';
