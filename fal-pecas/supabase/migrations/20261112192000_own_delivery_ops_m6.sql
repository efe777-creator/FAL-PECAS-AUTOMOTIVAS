-- Marcha 6: frete próprio — saída (ship), tentativas, entrega com gates.
-- Mock fora. Pickup ≠ own. Pagamento canônico.

-- Stamp departure on own when ship_order succeeds (extends M5 ship_order)
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

  if not public.order_packing_is_complete(p_order_id) then
    raise exception 'Packing incompleto — postagem bloqueada' using errcode = 'P0001';
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
    raise exception 'Mock nao usa postagem real' using errcode = 'P0001';
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
    carrier = nullif(trim(coalesce(p_carrier, '')), ''),
    service = nullif(trim(coalesce(p_service, '')), ''),
    tracking_code = nullif(trim(coalesce(p_tracking_code, '')), ''),
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

-- Tentativa de entrega (own only) — append-only em metadata.own.attempts + order_events
create or replace function public.admin_own_delivery_attempt(
  p_order_id uuid,
  p_note text default null,
  p_outcome text default 'failed'
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
  v_provider text;
  v_pay text;
  v_attempt jsonb;
  v_attempts jsonb;
  v_meta jsonb;
  v_outcome text := coalesce(nullif(trim(p_outcome), ''), 'failed');
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  if v_outcome not in ('failed', 'rescheduled', 'other') then
    raise exception 'outcome invalido' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status <> 'enviado' then
    raise exception 'Tentativa so apos saida (status enviado)' using errcode = 'P0001';
  end if;

  select p.status into v_pay
  from public.payments p
  where p.order_id = p_order_id
  order by p.created_at desc nulls last
  limit 1;
  if v_pay is distinct from 'approved' then
    raise exception 'Pagamento nao aprovado' using errcode = 'P0001';
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

  v_provider := regexp_replace(lower(coalesce(v_ship.provider, '')), '_sandbox$', '');
  if v_provider is distinct from 'own' then
    raise exception 'Tentativa so para frete proprio (own)' using errcode = 'P0001';
  end if;

  if v_ship.metadata -> 'own' -> 'departure' is null then
    raise exception 'Saida nao registrada — use ship_order primeiro' using errcode = 'P0001';
  end if;

  v_attempt := jsonb_build_object(
    'at', now(),
    'by', v_uid,
    'note', nullif(trim(coalesce(p_note, '')), ''),
    'outcome', v_outcome
  );

  v_attempts := coalesce(v_ship.metadata -> 'own' -> 'attempts', '[]'::jsonb) || jsonb_build_array(v_attempt);
  v_meta := jsonb_set(
    coalesce(v_ship.metadata, '{}'::jsonb),
    '{own,attempts}',
    v_attempts,
    true
  );

  update public.shipments set metadata = v_meta where id = v_ship.id;

  perform public.emit_order_event(
    p_order_id,
    'own_delivery_attempt',
    'internal',
    v_attempt,
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'attempt', v_attempt,
    'attempt_count', jsonb_array_length(v_attempts)
  );
end;
$$;

comment on function public.admin_own_delivery_attempt(uuid, text, text) is
  'Marcha 6: registra tentativa de entrega own (append-only).';

revoke all on function public.admin_own_delivery_attempt(uuid, text, text) from public;
grant execute on function public.admin_own_delivery_attempt(uuid, text, text) to authenticated;

-- deliver_order: pay canônico; own exige departure; mock bloqueado
create or replace function public.deliver_order(
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
  v_tr jsonb;
  v_pay text;
  v_provider text;
  v_meta jsonb;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status <> 'enviado' then
    raise exception 'Pedido nao esta enviado' using errcode = 'P0001';
  end if;

  select p.status into v_pay
  from public.payments p
  where p.order_id = p_order_id
  order by p.created_at desc nulls last
  limit 1;
  if v_pay is distinct from 'approved' then
    raise exception 'Pagamento nao aprovado — entrega bloqueada' using errcode = 'P0001';
  end if;

  select * into v_ship
  from public.shipments
  where order_id = p_order_id
  order by created_at asc nulls last, id asc
  limit 1
  for update;

  v_provider := regexp_replace(lower(coalesce(v_ship.provider, '')), '_sandbox$', '');
  if v_provider = 'mock' then
    raise exception 'Mock nao confirma entrega real' using errcode = 'P0001';
  end if;

  if v_provider = 'own' and (v_ship.metadata -> 'own' -> 'departure') is null then
    raise exception 'Frete proprio: registre saida antes da entrega' using errcode = 'P0001';
  end if;

  v_meta := coalesce(v_ship.metadata, '{}'::jsonb) || jsonb_build_object('delivered_by', v_uid);
  if v_provider = 'own' then
    v_meta := jsonb_set(
      v_meta,
      '{own,deliveredAt}',
      to_jsonb(now()::text),
      true
    );
  end if;

  update public.shipments
  set
    delivered_at = now(),
    proof_ref = nullif(trim(coalesce(p_proof_ref, '')), ''),
    status = 'delivered',
    metadata = v_meta
  where order_id = p_order_id;

  v_tr := public.transition_order_status(
    p_order_id, 'entregue', 'Pedido entregue',
    'order_delivered', 'customer',
    jsonb_build_object('proof_ref', p_proof_ref, 'provider', v_provider)
  );

  return jsonb_build_object('order_id', p_order_id, 'status', 'entregue', 'transition', v_tr);
end;
$$;

comment on function public.deliver_order(uuid, text) is
  'Marcha 6: entrega com pay canônico; own exige departure; mock bloqueado.';
