-- Pós-separação por modalidade: autorizar retirada; own sem packing no ship;
-- confirmar retirada (mock:pickup); update tracking pós-despacho.

create or replace function public.shipment_is_store_pickup(p_ship public.shipments)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_service text := lower(coalesce(p_ship.service, ''));
  v_carrier text := lower(coalesce(p_ship.carrier, ''));
  v_option text := lower(coalesce(p_ship.metadata #>> '{option_id}', p_ship.metadata #>> '{optionId}', ''));
  v_kind text := lower(coalesce(p_ship.metadata #>> '{kind}', p_ship.metadata #>> '{shipping_kind}', ''));
begin
  if v_service = 'pickup' or v_service like '%retirada%' then
    return true;
  end if;
  if v_carrier like '%retirada%' or v_carrier like '%pickup%' then
    return true;
  end if;
  if v_option like '%pickup%' or v_option = 'mock:pickup' then
    return true;
  end if;
  if v_kind in ('pickup', 'retirada') then
    return true;
  end if;
  return false;
end;
$$;

comment on function public.shipment_is_store_pickup(public.shipments) is
  'Detecta retirada na loja via service/carrier/metadata.';

-- Autorizar retirada (cliente vê pronto para retirar) — não muda status EN
create or replace function public.admin_authorize_store_pickup(p_order_id uuid)
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
  v_already timestamptz;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status not in ('pronto_para_envio', 'preparando_envio') then
    raise exception 'Autorize retirada so apos separacao (pronto_para_envio)' using errcode = 'P0001';
  end if;

  select * into v_ship
  from public.shipments
  where order_id = p_order_id
  order by created_at asc nulls last, id asc
  limit 1
  for update;

  if not found then
    raise exception 'Shipment ausente' using errcode = 'P0001';
  end if;

  if not public.shipment_is_store_pickup(v_ship) then
    raise exception 'Pedido nao e retirada na loja' using errcode = 'P0001';
  end if;

  v_already := nullif(v_ship.metadata #>> '{pickup,authorized_at}', '')::timestamptz;
  if v_already is not null then
    return jsonb_build_object(
      'order_id', p_order_id,
      'already', true,
      'authorized_at', v_already
    );
  end if;

  v_meta := coalesce(v_ship.metadata, '{}'::jsonb);
  v_meta := jsonb_set(
    v_meta,
    '{pickup}',
    coalesce(v_meta -> 'pickup', '{}'::jsonb) || jsonb_build_object(
      'authorized_at', now(),
      'authorized_by', v_uid
    ),
    true
  );

  update public.shipments
  set metadata = v_meta
  where id = v_ship.id;

  perform public.emit_order_event(
    p_order_id,
    'pickup_authorized',
    'customer',
    jsonb_build_object('authorized_at', now()),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'already', false,
    'authorized_at', now()
  );
end;
$$;

comment on function public.admin_authorize_store_pickup(uuid) is
  'Staff autoriza retirada na loja (metadata.pickup); cliente ve Pronto para retirar.';

revoke all on function public.admin_authorize_store_pickup(uuid) from public;
grant execute on function public.admin_authorize_store_pickup(uuid) to authenticated;

-- Cliente retirou: autorizado → enviado → entregue (bypass mock block)
create or replace function public.admin_confirm_store_pickup(
  p_order_id uuid,
  p_proof_ref text default null
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
  v_pay text;
  v_tr jsonb;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  select * into v_ship
  from public.shipments
  where order_id = p_order_id
  order by created_at asc nulls last, id asc
  limit 1
  for update;

  if not found then
    raise exception 'Shipment ausente' using errcode = 'P0001';
  end if;

  if not public.shipment_is_store_pickup(v_ship) then
    raise exception 'Pedido nao e retirada na loja' using errcode = 'P0001';
  end if;

  if nullif(v_ship.metadata #>> '{pickup,authorized_at}', '') is null then
    raise exception 'Autorize a retirada antes de confirmar que o cliente retirou' using errcode = 'P0001';
  end if;

  select p.status into v_pay
  from public.payments p
  where p.order_id = p_order_id
  order by p.created_at desc nulls last
  limit 1;
  if v_pay is distinct from 'approved' then
    raise exception 'Pagamento nao aprovado' using errcode = 'P0001';
  end if;

  if v_order.status in ('pronto_para_envio', 'preparando_envio') then
    v_tr := public.transition_order_status(
      p_order_id, 'enviado', 'Pedido liberado para retirada (cliente a caminho/balcao)',
      'order_shipped', 'customer',
      jsonb_build_object('pickup', true, 'store_pickup', true)
    );
    update public.shipments
    set
      shipped_at = coalesce(shipped_at, now()),
      status = 'shipped',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('pickup_released_by', v_uid)
    where id = v_ship.id;
    select * into v_order from public.orders where id = p_order_id;
    select * into v_ship from public.shipments where id = v_ship.id;
  end if;

  if v_order.status <> 'enviado' and v_order.status <> 'entregue' then
    raise exception 'Status invalido para confirmar retirada: %', v_order.status using errcode = 'P0001';
  end if;

  if v_order.status = 'entregue' then
    return jsonb_build_object('order_id', p_order_id, 'status', 'entregue', 'already', true);
  end if;

  v_meta := coalesce(v_ship.metadata, '{}'::jsonb) || jsonb_build_object(
    'delivered_by', v_uid,
    'pickup_confirmed_at', now()
  );
  v_meta := jsonb_set(
    v_meta,
    '{pickup,picked_up_at}',
    to_jsonb(now()::text),
    true
  );

  update public.shipments
  set
    delivered_at = now(),
    proof_ref = nullif(trim(coalesce(p_proof_ref, '')), ''),
    status = 'delivered',
    metadata = v_meta
  where id = v_ship.id;

  v_tr := public.transition_order_status(
    p_order_id, 'entregue', 'Cliente retirou na loja',
    'order_delivered', 'customer',
    jsonb_build_object('proof_ref', p_proof_ref, 'store_pickup', true)
  );

  return jsonb_build_object('order_id', p_order_id, 'status', 'entregue', 'transition', v_tr);
end;
$$;

comment on function public.admin_confirm_store_pickup(uuid, text) is
  'Staff confirma que cliente retirou: autorizado → enviado → entregue (pickup).';

revoke all on function public.admin_confirm_store_pickup(uuid, text) from public;
grant execute on function public.admin_confirm_store_pickup(uuid, text) to authenticated;

-- ship_order: packing obrigatório só ME; own sem packing; mock continua bloqueado (exceto via confirm pickup)
create or replace function public.ship_order(
  p_order_id uuid,
  p_carrier text default null,
  p_service text default null,
  p_tracking_code text default null
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
  v_tr jsonb;
  v_updated int;
  v_pay text;
  v_provider text;
  v_label text;
  v_meta jsonb;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status not in ('pronto_para_envio', 'preparando_envio') then
    raise exception 'Pedido nao esta pronto para envio' using errcode = 'P0001';
  end if;

  select p.status into v_pay
  from public.payments p
  where p.order_id = p_order_id
  order by p.created_at desc nulls last
  limit 1;

  if v_pay is distinct from 'approved' then
    raise exception 'Pagamento nao aprovado (canonico) — postagem bloqueada' using errcode = 'P0001';
  end if;

  select * into v_ship
  from public.shipments
  where order_id = p_order_id
  order by created_at asc nulls last, id asc
  limit 1;

  if not found then
    raise exception 'Shipment ausente — packing/cotacao antes da saida' using errcode = 'P0001';
  end if;

  v_provider := lower(coalesce(v_ship.provider, ''));
  v_provider := regexp_replace(v_provider, '_sandbox$', '');

  if v_provider = 'mock' then
    raise exception 'Mock nao usa postagem real — use autorizar/confirmar retirada' using errcode = 'P0001';
  end if;

  -- Packing só obrigatório no Melhor Envio
  if v_provider = 'melhorenvio' and not public.order_packing_is_complete(p_order_id) then
    raise exception 'Packing incompleto — postagem Melhor Envio bloqueada' using errcode = 'P0001';
  end if;

  if v_provider = 'melhorenvio' then
    v_label := coalesce(v_ship.metadata #>> '{me,label_state}', 'none');
    if v_label not in ('purchased', 'generated', 'printed') then
      raise exception 'Etiqueta Melhor Envio ainda nao comprada — postagem bloqueada' using errcode = 'P0001';
    end if;
  end if;

  v_tr := public.transition_order_status(
    p_order_id, 'enviado', 'Pedido expedido (postagem/coleta/saida)',
    'order_shipped', 'customer',
    jsonb_build_object(
      'carrier', p_carrier,
      'service', p_service,
      'tracking_code', p_tracking_code,
      'postagem_real', true,
      'label_state_at_ship', v_label,
      'own_departure', (v_provider = 'own')
    )
  );

  v_meta := coalesce(v_ship.metadata, '{}'::jsonb) || jsonb_build_object(
    'carrier', p_carrier,
    'service', p_service,
    'shipped_by', v_uid,
    'postagem_at', now()
  );

  if v_provider = 'own' then
    v_meta := jsonb_set(
      v_meta,
      '{own}',
      coalesce(v_meta -> 'own', '{}'::jsonb) || jsonb_build_object(
        'departure', jsonb_build_object(
          'at', now(),
          'by', v_uid,
          'note', nullif(trim(coalesce(p_service, '')), '')
        ),
        'attempts', coalesce(v_meta -> 'own' -> 'attempts', '[]'::jsonb)
      ),
      true
    );
  end if;

  update public.shipments
  set
    carrier = coalesce(nullif(trim(coalesce(p_carrier, '')), ''), carrier),
    service = coalesce(nullif(trim(coalesce(p_service, '')), ''), service),
    tracking_code = coalesce(nullif(trim(coalesce(p_tracking_code, '')), ''), tracking_code),
    shipped_at = now(),
    status = 'shipped',
    metadata = v_meta
  where order_id = p_order_id;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    insert into public.shipments (order_id, provider, status, tracking_code, amount, metadata, carrier, service, shipped_at)
    values (
      p_order_id,
      coalesce(nullif(trim(coalesce(p_carrier, '')), ''), 'manual'),
      'shipped',
      nullif(trim(coalesce(p_tracking_code, '')), ''),
      0,
      v_meta,
      nullif(trim(coalesce(p_carrier, '')), ''),
      nullif(trim(coalesce(p_service, '')), ''),
      now()
    );
  end if;

  return jsonb_build_object('order_id', p_order_id, 'status', 'enviado', 'transition', v_tr);
end;
$$;

-- Atualizar rastreio/obs após despacho
create or replace function public.admin_set_shipment_tracking(
  p_order_id uuid,
  p_tracking_code text default null,
  p_note text default null
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
  v_code text := nullif(trim(coalesce(p_tracking_code, '')), '');
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status not in ('enviado', 'entregue') then
    raise exception 'Rastreio so apos despacho (enviado/entregue)' using errcode = 'P0001';
  end if;

  select * into v_ship
  from public.shipments
  where order_id = p_order_id
  order by created_at asc nulls last, id asc
  limit 1
  for update;

  if not found then
    raise exception 'Shipment ausente' using errcode = 'P0001';
  end if;

  v_meta := coalesce(v_ship.metadata, '{}'::jsonb);
  if v_note is not null then
    v_meta := v_meta || jsonb_build_object(
      'ops_note', v_note,
      'ops_note_at', now(),
      'ops_note_by', v_uid
    );
  end if;

  update public.shipments
  set
    tracking_code = coalesce(v_code, tracking_code),
    metadata = v_meta
  where id = v_ship.id;

  perform public.emit_order_event(
    p_order_id,
    'shipment_tracking_updated',
    'internal',
    jsonb_build_object('tracking_code', coalesce(v_code, v_ship.tracking_code), 'note', v_note),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'tracking_code', coalesce(v_code, v_ship.tracking_code),
    'note', v_note
  );
end;
$$;

comment on function public.admin_set_shipment_tracking(uuid, text, text) is
  'Staff atualiza rastreio/obs apos despacho.';

revoke all on function public.admin_set_shipment_tracking(uuid, text, text) from public;
grant execute on function public.admin_set_shipment_tracking(uuid, text, text) to authenticated;
