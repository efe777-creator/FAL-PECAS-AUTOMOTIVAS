-- Fase B: detalhes de despacho own (transporte app + custo) e tracking_url no shipment

create or replace function public.admin_set_own_dispatch_details(
  p_order_id uuid,
  p_transport_mode text default null,
  p_app_cost numeric default null,
  p_tracking_code text default null,
  p_tracking_url text default null,
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
  v_own jsonb;
  v_mode text := nullif(trim(coalesce(p_transport_mode, '')), '');
  v_code text := nullif(trim(coalesce(p_tracking_code, '')), '');
  v_url text := nullif(trim(coalesce(p_tracking_url, '')), '');
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_cost numeric := p_app_cost;
  v_charged numeric;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  if v_cost is not null and v_cost < 0 then
    raise exception 'Custo do app invalido' using errcode = 'P0001';
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

  if lower(coalesce(v_ship.provider, '')) not like 'own%' then
    raise exception 'So frete proprio (own)' using errcode = 'P0001';
  end if;

  v_meta := coalesce(v_ship.metadata, '{}'::jsonb);
  v_own := coalesce(v_meta -> 'own', '{}'::jsonb);

  if v_mode is not null then
    v_own := v_own || jsonb_build_object('transport_mode', v_mode);
  end if;
  if v_cost is not null then
    v_own := v_own || jsonb_build_object('app_cost', v_cost);
  end if;
  if v_url is not null then
    v_own := v_own || jsonb_build_object('tracking_url', v_url);
  end if;
  if v_note is not null then
    v_own := v_own || jsonb_build_object('dispatch_note', v_note);
  end if;
  v_own := v_own || jsonb_build_object(
    'dispatch_updated_at', now(),
    'dispatch_updated_by', v_uid
  );

  v_meta := v_meta || jsonb_build_object('own', v_own);

  -- G8: custo efetivo = app_cost (não altera shipping_amount do cliente)
  if v_cost is not null then
    v_charged := coalesce(v_order.shipping_amount, 0);
    v_meta := v_meta || jsonb_build_object(
      'finance',
      jsonb_build_object(
        'charged_shipping', v_charged,
        'effective_cost', v_cost,
        'cost_source', 'own_ops',
        'delta', round(v_charged - v_cost, 2),
        'recorded_at', now(),
        'recorded_by', v_uid,
        'note', coalesce(v_note, 'Custo real do app / transporte')
      )
    );
  end if;

  update public.shipments
  set
    metadata = v_meta,
    tracking_code = coalesce(v_code, tracking_code)
  where id = v_ship.id;

  perform public.emit_order_event(
    p_order_id,
    'own_dispatch_details_updated',
    'internal',
    jsonb_build_object(
      'transport_mode', v_mode,
      'app_cost', v_cost,
      'tracking_code', v_code,
      'tracking_url', v_url
    ),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'transport_mode', coalesce(v_mode, v_own ->> 'transport_mode'),
    'app_cost', coalesce(v_cost, (v_own ->> 'app_cost')::numeric),
    'tracking_code', coalesce(v_code, v_ship.tracking_code),
    'tracking_url', coalesce(v_url, v_own ->> 'tracking_url')
  );
end;
$$;

revoke all on function public.admin_set_own_dispatch_details(uuid, text, numeric, text, text, text) from public;
grant execute on function public.admin_set_own_dispatch_details(uuid, text, numeric, text, text, text) to authenticated;

comment on function public.admin_set_own_dispatch_details(uuid, text, numeric, text, text, text) is
  'Own: transport_mode (Uber/99/…) + custo app (G8) + rastreio — sem alterar frete do cliente.';

-- Estende rastreio genérico com URL opcional
drop function if exists public.admin_set_shipment_tracking(uuid, text, text);

create or replace function public.admin_set_shipment_tracking(
  p_order_id uuid,
  p_tracking_code text default null,
  p_note text default null,
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
  v_meta jsonb;
  v_code text := nullif(trim(coalesce(p_tracking_code, '')), '');
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_url text := nullif(trim(coalesce(p_tracking_url, '')), '');
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status not in ('enviado', 'entregue', 'pronto_para_envio', 'preparando_envio') then
    raise exception 'Rastreio so a partir de pronto_para_envio' using errcode = 'P0001';
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
  if v_url is not null then
    v_meta := v_meta || jsonb_build_object('tracking_url', v_url);
    if lower(coalesce(v_ship.provider, '')) like 'own%' then
      v_meta := jsonb_set(
        v_meta,
        '{own}',
        coalesce(v_meta -> 'own', '{}'::jsonb) || jsonb_build_object('tracking_url', v_url),
        true
      );
    end if;
    if lower(coalesce(v_ship.provider, '')) like 'melhorenvio%' then
      v_meta := jsonb_set(
        v_meta,
        '{me}',
        coalesce(v_meta -> 'me', '{}'::jsonb) || jsonb_build_object('tracking_url', v_url),
        true
      );
    end if;
  end if;

  update public.shipments
  set
    tracking_code = coalesce(v_code, tracking_code),
    metadata = v_meta
  where id = v_ship.id;

  perform public.emit_order_event(
    p_order_id,
    'shipment_tracking_updated',
    'customer',
    jsonb_build_object(
      'tracking_code', coalesce(v_code, v_ship.tracking_code),
      'tracking_url', v_url,
      'note', v_note
    ),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'tracking_code', coalesce(v_code, v_ship.tracking_code),
    'tracking_url', coalesce(v_url, v_meta ->> 'tracking_url')
  );
end;
$$;

revoke all on function public.admin_set_shipment_tracking(uuid, text, text, text) from public;
grant execute on function public.admin_set_shipment_tracking(uuid, text, text, text) to authenticated;

comment on function public.admin_set_shipment_tracking(uuid, text, text, text) is
  'Staff atualiza rastreio/URL/obs (cliente vê código/link).';
