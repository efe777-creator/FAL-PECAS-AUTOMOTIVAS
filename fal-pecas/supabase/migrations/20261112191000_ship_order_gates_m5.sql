-- Marcha 5: ship_order com gates (pay canônico + packing + ME label comprada).
-- label_state purchased/printed NÃO implica enviado — só esta RPC.

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
    p_order_id, 'enviado', 'Pedido expedido (postagem/coleta)',
    'order_shipped', 'customer',
    jsonb_build_object(
      'carrier', p_carrier,
      'service', p_service,
      'tracking_code', p_tracking_code,
      'postagem_real', true,
      'label_state_at_ship', v_label
    )
  );

  update public.shipments
  set
    carrier = nullif(trim(coalesce(p_carrier, '')), ''),
    service = nullif(trim(coalesce(p_service, '')), ''),
    tracking_code = nullif(trim(coalesce(p_tracking_code, '')), ''),
    shipped_at = now(),
    status = 'shipped',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'carrier', p_carrier,
      'service', p_service,
      'shipped_by', v_uid,
      'postagem_at', now()
    )
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
      jsonb_build_object('service', p_service, 'shipped_by', v_uid, 'postagem_at', now()),
      nullif(trim(coalesce(p_carrier, '')), ''),
      nullif(trim(coalesce(p_service, '')), ''),
      now()
    );
  end if;

  return jsonb_build_object('order_id', p_order_id, 'status', 'enviado', 'transition', v_tr);
end;
$$;

comment on function public.ship_order(uuid, text, text, text) is
  'Marcha 5: postagem real. Exige pay approved + packing completo; ME exige label purchased+. label≠enviado.';

-- service_role precisa executar predicado nas Edges
grant execute on function public.order_packing_is_complete(uuid) to service_role;
