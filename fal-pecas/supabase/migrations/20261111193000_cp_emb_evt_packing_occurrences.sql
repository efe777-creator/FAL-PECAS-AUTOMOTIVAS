-- CP-EMB-01: packing multi-volume neutro em shipments.metadata.packing
-- CP-EVT-01: ocorrência staff via order_events + occurrence_id (imutável)

-- ---------------------------------------------------------------------------
-- Packing
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_order_packing(
  p_order_id uuid,
  p_volumes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_ship public.shipments%rowtype;
  v_meta jsonb;
  v_packing jsonb;
  v_vol jsonb;
  v_i int := 0;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Apenas staff' using errcode = '42501';
  end if;

  if p_volumes is null or jsonb_typeof(p_volumes) is distinct from 'array' then
    raise exception 'volumes deve ser array JSON' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status in ('enviado', 'entregue', 'cancelado') then
    raise exception 'Packing bloqueado apos despacho/cancelamento' using errcode = 'P0001';
  end if;

  for v_vol in select * from jsonb_array_elements(p_volumes)
  loop
    v_i := v_i + 1;
    if coalesce(v_vol->>'id', '') = '' then
      raise exception 'Volume % sem id', v_i using errcode = 'P0001';
    end if;
    if coalesce((v_vol->>'lengthCm')::numeric, 0) <= 0
       or coalesce((v_vol->>'widthCm')::numeric, 0) <= 0
       or coalesce((v_vol->>'heightCm')::numeric, 0) <= 0 then
      raise exception 'Volume %: L/A/P devem ser > 0 (cm)', v_i using errcode = 'P0001';
    end if;
    if coalesce((v_vol->>'weightKg')::numeric, -1) < 0 then
      raise exception 'Volume %: pesoKg invalido', v_i using errcode = 'P0001';
    end if;
  end loop;

  select * into v_ship
  from public.shipments
  where order_id = p_order_id
  order by created_at asc nulls last, id asc
  limit 1
  for update;

  if not found then
    insert into public.shipments (order_id, provider, status, amount, metadata)
    values (
      p_order_id,
      'pending',
      'pending',
      coalesce(v_order.shipping_amount, 0),
      '{}'::jsonb
    )
    returning * into v_ship;
  end if;

  v_meta := coalesce(v_ship.metadata, '{}'::jsonb);
  v_packing := jsonb_build_object(
    'volumes', p_volumes,
    'updatedAt', now(),
    'updatedBy', v_uid
  );
  v_meta := jsonb_set(v_meta, '{packing}', v_packing, true);

  update public.shipments
  set metadata = v_meta
  where id = v_ship.id;

  perform public.emit_order_event(
    p_order_id,
    'packing_updated',
    'internal',
    jsonb_build_object(
      'volume_count', jsonb_array_length(p_volumes),
      'packing', v_packing
    ),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'shipment_id', v_ship.id,
    'packing', v_packing
  );
end;
$$;

comment on function public.admin_set_order_packing(uuid, jsonb) is
  'CP-EMB-01: grava volumes neutros em shipments.metadata.packing (nao toca metadata.me).';

revoke all on function public.admin_set_order_packing(uuid, jsonb) from public;
grant execute on function public.admin_set_order_packing(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Ocorrências
-- ---------------------------------------------------------------------------
create or replace function public.admin_occurrence_action(
  p_order_id uuid,
  p_action text,
  p_occurrence_id uuid default null,
  p_tipo text default null,
  p_gravidade text default 'media',
  p_note text default null,
  p_solucao text default null,
  p_visibility text default 'internal'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_occ uuid;
  v_event text;
  v_payload jsonb;
  v_vis text := coalesce(nullif(trim(p_visibility), ''), 'internal');
  v_event_id uuid;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Apenas staff' using errcode = '42501';
  end if;

  if not exists (select 1 from public.orders where id = p_order_id) then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_vis not in ('internal', 'customer') then
    raise exception 'visibility invalida' using errcode = 'P0001';
  end if;

  if p_action not in ('open', 'update', 'resolve') then
    raise exception 'acao invalida' using errcode = 'P0001';
  end if;

  if p_action = 'open' then
    v_occ := coalesce(p_occurrence_id, gen_random_uuid());
    v_event := 'occurrence_opened';
    if coalesce(nullif(trim(p_tipo), ''), '') = '' then
      raise exception 'tipo obrigatorio ao abrir ocorrencia' using errcode = 'P0001';
    end if;
  else
    if p_occurrence_id is null then
      raise exception 'occurrence_id obrigatorio' using errcode = 'P0001';
    end if;
    v_occ := p_occurrence_id;
    if p_action = 'update' then
      v_event := 'occurrence_updated';
    else
      v_event := 'occurrence_resolved';
      if coalesce(nullif(trim(p_solucao), ''), '') = '' then
        raise exception 'solucao obrigatoria ao resolver' using errcode = 'P0001';
      end if;
    end if;
  end if;

  if p_gravidade is not null and p_gravidade not in ('baixa', 'media', 'alta') then
    raise exception 'gravidade invalida' using errcode = 'P0001';
  end if;

  v_payload := jsonb_build_object(
    'occurrence_id', v_occ,
    'tipo', nullif(trim(coalesce(p_tipo, '')), ''),
    'gravidade', coalesce(nullif(trim(p_gravidade), ''), 'media'),
    'note', nullif(trim(coalesce(p_note, '')), ''),
    'solucao', nullif(trim(coalesce(p_solucao, '')), ''),
    'responsavel_id', v_uid
  );

  v_event_id := public.emit_order_event(
    p_order_id,
    v_event,
    v_vis,
    v_payload,
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'occurrence_id', v_occ,
    'event_type', v_event,
    'event_id', v_event_id,
    'payload', v_payload
  );
end;
$$;

comment on function public.admin_occurrence_action(uuid, text, uuid, text, text, text, text, text) is
  'CP-EVT-01: open/update/resolve — cadeia imutavel order_events com occurrence_id.';

revoke all on function public.admin_occurrence_action(uuid, text, uuid, text, text, text, text, text) from public;
grant execute on function public.admin_occurrence_action(uuid, text, uuid, text, text, text, text, text) to authenticated;
