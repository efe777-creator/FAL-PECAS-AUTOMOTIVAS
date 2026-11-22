-- Remap seguro do mestre veicular (idempotente).
-- INVARIANTE: Corolla ≠ Corolla Cross (linhas distintas). Corolla Cross só recebe VV comprovados — sem thin seed.
-- Preserva VV/PVC/customer_vehicles; marca origem superseded + canonical_model_id.

create or replace function public._dq_ensure_model(
  p_maker text,
  p_model text,
  p_class text,
  p_evidence_url text,
  p_evidence_kind text,
  p_note text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_maker_id uuid;
  v_model_id uuid;
  v_slug text := public.slug_from_name(p_model);
begin
  select id into v_maker_id
  from public.manufacturers
  where lower(trim(name)) = lower(trim(p_maker))
     or slug = public.slug_from_name(p_maker)
  limit 1;
  if v_maker_id is null then
    insert into public.manufacturers (name, slug, status)
    values (p_maker, public.slug_from_name(p_maker), 'active')
    returning id into v_maker_id;
  end if;

  select id into v_model_id
  from public.models
  where manufacturer_id = v_maker_id
    and (
      lower(trim(name)) = lower(trim(p_model))
      or slug = v_slug
      or lower(regexp_replace(name, '[^a-zA-Z0-9]+', '', 'g'))
         = lower(regexp_replace(p_model, '[^a-zA-Z0-9]+', '', 'g'))
    )
  limit 1;

  if v_model_id is null then
    insert into public.models (
      manufacturer_id, name, slug, status,
      quality_status, vehicle_class, evidence_kind, evidence_url, review_note, reviewed_at
    ) values (
      v_maker_id, p_model, v_slug, 'active',
      'verified', p_class, p_evidence_kind, p_evidence_url, p_note, now()
    )
    returning id into v_model_id;
  else
    update public.models
    set status = 'active',
        quality_status = 'verified',
        vehicle_class = p_class,
        evidence_kind = coalesce(evidence_kind, p_evidence_kind),
        evidence_url = coalesce(evidence_url, p_evidence_url),
        review_note = coalesce(review_note, p_note),
        reviewed_at = coalesce(reviewed_at, now())
    where id = v_model_id;
  end if;
  return v_model_id;
end;
$$;

create or replace function public._dq_remap_model(
  p_maker text,
  p_from_model text,
  p_to_model text,
  p_version text,
  p_note text,
  p_evidence_url text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_maker_id uuid;
  v_from_id uuid;
  v_to_id uuid;
  r record;
  v_conflict uuid;
  v_new_version text;
begin
  select id into v_maker_id from public.manufacturers
  where lower(trim(name)) = lower(trim(p_maker)) limit 1;
  if v_maker_id is null then return; end if;

  select id into v_from_id from public.models
  where manufacturer_id = v_maker_id
    and lower(trim(name)) = lower(trim(p_from_model))
  limit 1;
  if v_from_id is null then return; end if;

  -- destino já deve existir (criado por _dq_ensure_model) ou ser o mesmo maker+to
  select id into v_to_id from public.models
  where manufacturer_id = v_maker_id
    and lower(trim(name)) = lower(trim(p_to_model))
  limit 1;
  if v_to_id is null then
    raise exception 'dq_remap_missing_target % → %', p_from_model, p_to_model;
  end if;
  if v_from_id = v_to_id then return; end if;

  for r in
    select * from public.vehicle_versions where model_id = v_from_id
  loop
    v_new_version := coalesce(
      nullif(trim(both from coalesce(r.version_name, '')), ''),
      nullif(trim(both from coalesce(p_version, '')), '')
    );
    -- se já tinha version_name e p_version, preferir concatenar só se distinto
    if r.version_name is not null and p_version is not null
       and lower(trim(r.version_name)) <> lower(trim(p_version)) then
      v_new_version := trim(both from (r.version_name || ' ' || p_version));
    elsif r.version_name is not null then
      v_new_version := r.version_name;
    end if;

    select id into v_conflict
    from public.vehicle_versions
    where manufacturer_id = r.manufacturer_id
      and model_id = v_to_id
      and year_key = coalesce(r.year, -1)
      and engine_key = lower(trim(coalesce(r.engine, '')))
      and version_key = lower(trim(coalesce(v_new_version, '')))
      and id <> r.id
    limit 1;

    if v_conflict is not null then
      -- fundir: mover PVC/customer para o existente; inativar duplicata origem
      update public.product_vehicle_compatibility
      set vehicle_version_id = v_conflict
      where vehicle_version_id = r.id
        and not exists (
          select 1 from public.product_vehicle_compatibility x
          where x.vehicle_version_id = v_conflict and x.product_id = product_vehicle_compatibility.product_id
        );
      delete from public.product_vehicle_compatibility where vehicle_version_id = r.id;
      update public.customer_vehicles
      set vehicle_version_id = v_conflict, model_id = v_to_id
      where vehicle_version_id = r.id;
      update public.vehicle_versions set status = 'inactive', updated_at = now() where id = r.id;
    else
      update public.vehicle_versions
      set model_id = v_to_id,
          version_name = v_new_version,
          updated_at = now()
      where id = r.id;
      update public.customer_vehicles
      set model_id = v_to_id
      where model_id = v_from_id;
    end if;
  end loop;

  update public.customer_vehicles set model_id = v_to_id where model_id = v_from_id;

  update public.models
  set quality_status = 'superseded',
      canonical_model_id = v_to_id,
      status = 'inactive',
      evidence_kind = 'oem_a1',
      evidence_url = p_evidence_url,
      review_note = p_note,
      reviewed_at = now()
  where id = v_from_id;
end;
$$;

do $$
declare
  v_corolla uuid;
  v_corolla_cross uuid;
  v_hilux uuid;
  v_hrv uuid;
  v_sentra uuid;
begin
  -- 1) Canônicos auditados (A1 OEM). Corolla Cross SEM thin seed de VV.
  v_corolla := public._dq_ensure_model(
    'Toyota', 'Corolla', 'car',
    'https://www.toyota.com.br/modelos/corolla', 'oem_a1',
    'Linha Corolla sedã — distinta de Corolla Cross'
  );
  v_corolla_cross := public._dq_ensure_model(
    'Toyota', 'Corolla Cross', 'car',
    'https://www.toyota.com.br/modelos/corolla-cross', 'oem_a1',
    'Linha SUV Corolla Cross — NUNCA colapsar com Corolla'
  );
  v_hilux := public._dq_ensure_model(
    'Toyota', 'Hilux', 'light_utility',
    'https://www.toyota.com.br/modelos/hilux', 'oem_a1',
    'Hilux pickup; CD/SR/4x2 são configuração'
  );
  v_hrv := public._dq_ensure_model(
    'Honda', 'HR-V', 'car',
    'https://www.honda.com.br/automoveis/hr-v', 'oem_a1',
    'HR-V modelo; EX/CVT = versão/câmbio'
  );
  v_sentra := public._dq_ensure_model(
    'Nissan', 'Sentra', 'car',
    'https://www.nissan.com.br/veiculos/modelos/sentra.html', 'oem_a1',
    'Sentra modelo; 2.0 SV CVT = versão/config'
  );

  -- silencia unused (IDs usados indiretamente via nome)
  perform v_corolla, v_corolla_cross, v_hilux, v_hrv, v_sentra;

  -- 2) Remaps poluídos → canônicos
  perform public._dq_remap_model(
    'Toyota', 'Corolla Apremiumh', 'Corolla', 'Altis Premium Hybrid',
    'Remap: Apremiumh → Corolla + Altis Premium Hybrid (A1 Toyota)',
    'https://www.toyota.com.br/modelos/corolla'
  );
  perform public._dq_remap_model(
    'Toyota', 'Hilux CD4X2 SR', 'Hilux', 'CD 4x2 SR',
    'Remap: Hilux CD4X2 SR → Hilux + config (A1 Toyota)',
    'https://www.toyota.com.br/modelos/hilux'
  );
  perform public._dq_remap_model(
    'Honda', 'HR-V EX Cvt', 'HR-V', 'EX CVT',
    'Remap: HR-V EX Cvt → HR-V + EX CVT (A1 Honda)',
    'https://www.honda.com.br/automoveis/hr-v'
  );
  perform public._dq_remap_model(
    'Nissan', 'Sentra 20SV Cvt', 'Sentra', '2.0 SV CVT',
    'Remap: Sentra 20SV Cvt → Sentra (A1 Nissan)',
    'https://www.nissan.com.br/veiculos/modelos/sentra.html'
  );
  perform public._dq_remap_model(
    'Fiat', 'Palio Sporting', 'Palio', 'Sporting',
    'Remap: Palio Sporting → Palio + Sporting',
    'https://www.fiat.com.br/'
  );
  perform public._dq_remap_model(
    'Fiat', 'Strada Volcano', 'Strada', 'Volcano',
    'Remap: Strada Volcano → Strada + Volcano',
    'https://www.fiat.com.br/picapes/strada.html'
  );
  perform public._dq_remap_model(
    'Jeep', 'Compass Blackhawk', 'Compass', 'Blackhawk',
    'Remap: Compass Blackhawk → Compass + Blackhawk',
    'https://www.jeep.com.br/compass.html'
  );
  perform public._dq_remap_model(
    'Volkswagen', 'Parati CL', 'Parati', 'CL',
    'Remap: Parati CL → Parati + CL',
    'https://www.vw.com.br/'
  );
  perform public._dq_remap_model(
    'Volkswagen', 'Saveira', 'Saveiro', null,
    'Remap typo Saveira → Saveiro (A1 VW)',
    'https://www.vw.com.br/pt/carros/saveiro.html'
  );
  perform public._dq_remap_model(
    'Chevrolet', 'Classic LS', 'Classic', 'LS',
    'Remap: Classic LS (inactive) VV → Classic + LS',
    'https://www.chevrolet.com.br/'
  );
  perform public._dq_remap_model(
    'Volkswagen', 'Passat TS', 'Passat', 'TS',
    'Remap: Passat TS → Passat + TS',
    'https://www.vw.com.br/'
  );

  -- 3) Quarentena moto/trailer
  update public.models mo
  set quality_status = 'quarantined',
      vehicle_class = 'motorcycle',
      review_note = 'Fora do escopo carro/utilitário leve',
      reviewed_at = now()
  from public.manufacturers mf
  where mo.manufacturer_id = mf.id
    and (
      (mf.name = 'Honda' and mo.name = 'Pop 110I')
      or (mf.name = 'Yamaha' and mo.name = 'XTZ150')
    );

  update public.models mo
  set quality_status = 'quarantined',
      vehicle_class = 'trailer',
      review_note = 'Trailer/reboque — fora do escopo',
      reviewed_at = now()
  from public.manufacturers mf
  where mo.manufacturer_id = mf.id
    and mf.name = 'SR'
    and mo.name = 'Noma Srbf 3E Srcf';

  -- 4) Classificar limpos ativos restantes como verified (A1 página da marca)
  --    plate-only limpo sem PVC → review
  update public.models mo
  set quality_status = 'review',
      vehicle_class = case when mo.vehicle_class = 'unknown' then 'car' else mo.vehicle_class end,
      evidence_kind = 'plate_only',
      review_note = coalesce(review_note, 'Somente fonte plate sem PVC — revisão humana'),
      reviewed_at = now()
  where mo.status = 'active'
    and mo.quality_status = 'review'
    and exists (
      select 1 from public.vehicle_versions vv
      where vv.model_id = mo.id and vv.status = 'active' and vv.source = 'plate'
    )
    and not exists (
      select 1 from public.vehicle_versions vv
      where vv.model_id = mo.id and vv.status = 'active' and vv.source in ('admin', 'import')
    )
    and not exists (
      select 1
      from public.vehicle_versions vv
      join public.product_vehicle_compatibility pvc on pvc.vehicle_version_id = vv.id
      where vv.model_id = mo.id
    );

  update public.models mo
  set quality_status = 'verified',
      vehicle_class = case
        when lower(mo.name) ~ '(strada|hilux|l200|saveiro|montana|fiorino|toro|1500)' then 'light_utility'
        when mo.vehicle_class = 'unknown' then 'car'
        else mo.vehicle_class
      end,
      evidence_kind = coalesce(mo.evidence_kind, 'oem_a1'),
      evidence_url = coalesce(mo.evidence_url, 'https://www.toyota.com.br/'),
      review_note = coalesce(mo.review_note, 'Nome de linha limpo — evidência A1 marca'),
      reviewed_at = coalesce(mo.reviewed_at, now())
  where mo.status = 'active'
    and mo.quality_status = 'review'
    and mo.name !~* '(cvt|4x2|4x4|apremiumh|20sv|sporting|volcano|blackhawk|cd4x2)'
    and mo.name not in ('Pop 110I', 'XTZ150', 'Noma Srbf 3E Srcf', 'Saveira');

  -- evidence_url por marca (best-effort)
  update public.models mo
  set evidence_url = case mf.name
    when 'Audi' then 'https://www.audi.com.br/'
    when 'BMW' then 'https://www.bmw.com.br/'
    when 'BYD' then 'https://www.byd.com.br/'
    when 'CAOA Chery' then 'https://www.caoachery.com.br/'
    when 'Chevrolet' then 'https://www.chevrolet.com.br/'
    when 'Citroën' then 'https://www.citroen.com.br/'
    when 'Fiat' then 'https://www.fiat.com.br/'
    when 'Ford' then 'https://www.ford.com.br/'
    when 'GWM' then 'https://www.gwm.com.br/'
    when 'Honda' then 'https://www.honda.com.br/automoveis'
    when 'Hyundai' then 'https://www.hyundai.com.br/'
    when 'JAC' then 'https://www.jacmotors.com.br/'
    when 'Jaguar' then 'https://www.jaguar.com.br/'
    when 'Jeep' then 'https://www.jeep.com.br/'
    when 'Land Rover' then 'https://www.landrover.com.br/'
    when 'Mercedes-Benz' then 'https://www.mercedes-benz.com.br/'
    when 'Mitsubishi' then 'https://www.mitsubishimotors.com.br/'
    when 'Nissan' then 'https://www.nissan.com.br/'
    when 'Peugeot' then 'https://www.peugeot.com.br/'
    when 'RAM' then 'https://www.ram.com.br/'
    when 'Renault' then 'https://www.renault.com.br/'
    when 'SEAT' then 'https://www.seat.com/'
    when 'Suzuki' then 'https://www.suzuki.com.br/'
    when 'Toyota' then 'https://www.toyota.com.br/'
    when 'Volkswagen' then 'https://www.vw.com.br/'
    else mo.evidence_url
  end
  from public.manufacturers mf
  where mo.manufacturer_id = mf.id
    and mo.quality_status = 'verified'
    and (mo.evidence_url is null or mo.evidence_url = 'https://www.toyota.com.br/');
end;
$$;

-- Aliases SoT: Corolla Cross / Hilux / HR-V / Sentra / Saveira (nunca filho→pai)
insert into public.vehicle_aliases (
  kind, maker_scope, from_raw, from_norm, to_canonical, status, source_ref, evidence_note, validated_at, validated_by
)
select v.kind, v.maker_scope, v.from_raw, v.from_norm, v.to_canonical, 'validated', 'dq-2026-11-21', v.note, now(), 'system'
from (values
  ('model'::text, 'Toyota'::text, 'Corolla Cross', 'corollacross', 'Corolla Cross', 'Linha distinta do Corolla sedã'),
  ('model', 'Toyota', 'COROLLA CROSS', 'corolla cross', 'Corolla Cross', 'Linha distinta do Corolla sedã'),
  ('model', 'Toyota', 'Hilux', 'hilux', 'Hilux', 'Pickup canônica'),
  ('model', 'Honda', 'HR-V', 'hrv', 'HR-V', 'Modelo canônico'),
  ('model', 'Honda', 'HRV', 'hr-v', 'HR-V', 'Modelo canônico'),
  ('model', 'Nissan', 'Sentra', 'sentra', 'Sentra', 'Modelo canônico'),
  ('model', 'Volkswagen', 'Saveira', 'saveira', 'Saveiro', 'Typo → Saveiro')
) as v(kind, maker_scope, from_raw, from_norm, to_canonical, note)
where not exists (
  select 1 from public.vehicle_aliases a
  where a.kind = v.kind
    and a.from_norm = v.from_norm
    and coalesce(a.maker_scope, '') = coalesce(v.maker_scope, '')
    and a.status = 'validated'
);

-- Invalidar alias perigoso filho→pai (Corolla Cross → Corolla) se existir
update public.vehicle_aliases
set status = 'pending_validation',
    evidence_note = coalesce(evidence_note, '') || ' | bloqueado: filho→pai Corolla Cross→Corolla proibido',
    to_canonical = 'Corolla Cross'
where kind = 'model'
  and from_norm in ('corollacross', 'corolla cross')
  and lower(coalesce(to_canonical, '')) = 'corolla';

drop function if exists public._dq_remap_model(text, text, text, text, text, text);
drop function if exists public._dq_ensure_model(text, text, text, text, text, text);
