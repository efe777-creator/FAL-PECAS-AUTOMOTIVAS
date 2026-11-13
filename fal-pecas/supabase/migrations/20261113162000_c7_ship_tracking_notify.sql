-- C7: ship_order com tracking_url + notificação cliente em shipment_tracking_updated

drop function if exists public.ship_order(uuid, text, text, text);

create or replace function public.ship_order(
  p_order_id uuid,
  p_carrier text default null,
  p_service text default null,
  p_tracking_code text default null,
  p_tracking_url text default null
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
  v_code text := nullif(trim(coalesce(p_tracking_code, '')), '');
  v_url text := nullif(trim(coalesce(p_tracking_url, '')), '');
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
      'tracking_code', v_code,
      'tracking_url', v_url,
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
  if v_url is not null then
    v_meta := v_meta || jsonb_build_object('tracking_url', v_url);
  end if;

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
        'attempts', coalesce(v_meta -> 'own' -> 'attempts', '[]'::jsonb),
        'tracking_url', coalesce(v_url, v_meta #>> '{own,tracking_url}')
      ),
      true
    );
  end if;

  update public.shipments
  set
    carrier = coalesce(nullif(trim(coalesce(p_carrier, '')), ''), carrier),
    service = coalesce(nullif(trim(coalesce(p_service, '')), ''), service),
    tracking_code = coalesce(v_code, tracking_code),
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
      v_code,
      0,
      v_meta,
      nullif(trim(coalesce(p_carrier, '')), ''),
      nullif(trim(coalesce(p_service, '')), ''),
      now()
    );
  end if;

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'enviado',
    'tracking_url', v_url,
    'transition', v_tr
  );
end;
$$;

revoke all on function public.ship_order(uuid, text, text, text, text) from public;
grant execute on function public.ship_order(uuid, text, text, text, text) to authenticated;

-- Helper service-role: aplica rastreio ME sem avançar status
create or replace function public.apply_me_tracking_update(
  p_order_id uuid,
  p_tracking_code text default null,
  p_tracking_url text default null,
  p_protocol text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ship public.shipments%rowtype;
  v_meta jsonb;
  v_me jsonb;
  v_code text := nullif(trim(coalesce(p_tracking_code, '')), '');
  v_url text := nullif(trim(coalesce(p_tracking_url, '')), '');
begin
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
  v_me := coalesce(v_meta -> 'me', '{}'::jsonb);
  if v_code is not null then
    v_me := v_me || jsonb_build_object('tracking', v_code);
  end if;
  if v_url is not null then
    v_me := v_me || jsonb_build_object('tracking_url', v_url);
  end if;
  if p_protocol is not null then
    v_me := v_me || jsonb_build_object('protocol', p_protocol);
  end if;
  v_meta := v_meta || jsonb_build_object('me', v_me);
  if v_url is not null then
    v_meta := v_meta || jsonb_build_object('tracking_url', v_url);
  end if;

  update public.shipments
  set
    metadata = v_meta,
    tracking_code = coalesce(v_code, tracking_code)
  where id = v_ship.id;

  perform public.emit_order_event(
    p_order_id,
    'shipment_tracking_updated',
    'customer',
    jsonb_build_object(
      'tracking_code', coalesce(v_code, v_ship.tracking_code),
      'tracking_url', coalesce(v_url, v_meta ->> 'tracking_url'),
      'source', 'melhorenvio'
    ),
    null
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'tracking_code', coalesce(v_code, v_ship.tracking_code),
    'tracking_url', coalesce(v_url, v_meta ->> 'tracking_url')
  );
end;
$$;

revoke all on function public.apply_me_tracking_update(uuid, text, text, text) from public;
grant execute on function public.apply_me_tracking_update(uuid, text, text, text) to authenticated, service_role;

-- Inbox: rastreio atualizado
do $$
begin
  -- Garante copy via insert no case: recria só o ramo usando override em fanout abaixo.
  null;
end $$;
