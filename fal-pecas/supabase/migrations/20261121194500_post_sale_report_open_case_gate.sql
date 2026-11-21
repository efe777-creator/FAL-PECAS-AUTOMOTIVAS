-- P0: janela 7d + anti casos paralelos.
-- - "Caso aberto" = ocorrência pós-venda cujo ÚLTIMO evento NÃO é occurrence_resolved
-- - Com caso aberto: bloqueia NOVO report (acompanhar o existente)
-- - Janela 7d só se NÃO houver caso aberto (resolvidos antigos não eternizam a janela)

create or replace function public.customer_report_delivery_issue(
  p_order_id uuid,
  p_reason text,
  p_motivo_code text default 'outro_suporte',
  p_scope text default 'order',
  p_items jsonb default '[]'::jsonb,
  p_policy_ack boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_motivo text := lower(nullif(trim(coalesce(p_motivo_code, '')), ''));
  v_scope text := lower(nullif(trim(coalesce(p_scope, '')), ''));
  v_occ uuid := gen_random_uuid();
  v_tipo text;
  v_delivered_at timestamptz;
  v_has_open boolean := false;
  v_needs_ack boolean := false;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;
  if v_reason is null then
    raise exception 'Informe o problema' using errcode = 'P0001';
  end if;
  if v_motivo is null then
    v_motivo := 'outro_suporte';
  end if;
  if v_scope is null or v_scope not in ('order', 'items') then
    v_scope := 'order';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.customers c
    where c.id = v_order.customer_id and c.profile_id = v_uid
  ) then
    raise exception 'Pedido nao pertence ao usuario' using errcode = '42501';
  end if;

  if v_order.status not in ('enviado', 'entregue') then
    raise exception 'Reporte de problema so apos envio/entrega' using errcode = 'P0001';
  end if;

  if v_motivo in ('arrependimento', 'defeito', 'quero_devolver') then
    v_tipo := 'pos_venda_devolucao';
    v_needs_ack := true;
  elsif v_motivo in ('nao_serve_veiculo', 'divergencia_catalogo', 'duvida_aplicacao') then
    v_tipo := 'pos_venda_incompat';
    v_needs_ack := true;
  else
    v_tipo := 'pos_venda_suporte';
  end if;

  if v_needs_ack and coalesce(p_policy_ack, false) is not true then
    raise exception 'Confirme que leu as condicoes de devolucao' using errcode = 'P0001';
  end if;

  if v_needs_ack and v_scope = 'items' then
    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
      raise exception 'Selecione ao menos um item' using errcode = 'P0001';
    end if;
  end if;

  select s.delivered_at into v_delivered_at
  from public.shipments s
  where s.order_id = p_order_id
  order by s.delivered_at desc nulls last
  limit 1;

  -- Aberto = último evento da ocorrência pós-venda ≠ resolved
  select exists (
    select 1
    from (
      select distinct on (e.payload->>'occurrence_id')
        e.payload->>'occurrence_id' as occurrence_id,
        e.event_type,
        e.payload->>'tipo' as tipo
      from public.order_events e
      where e.order_id = p_order_id
        and e.event_type in (
          'occurrence_opened', 'occurrence_updated', 'occurrence_assigned',
          'occurrence_started', 'occurrence_resolved', 'occurrence_reopened'
        )
        and e.payload ? 'occurrence_id'
      order by e.payload->>'occurrence_id', e.created_at desc
    ) last_per_occ
    where coalesce(last_per_occ.tipo, '') like 'pos_venda%'
      and last_per_occ.event_type is distinct from 'occurrence_resolved'
  ) into v_has_open;

  if v_has_open then
    raise exception 'Ja existe atendimento em andamento neste pedido. Acompanhe as atualizacoes.'
      using errcode = 'P0001';
  end if;

  if v_order.status = 'entregue'
     and v_delivered_at is not null
     and now() > (v_delivered_at + interval '7 days') then
    raise exception 'Prazo de 7 dias para abrir suporte neste pedido encerrou'
      using errcode = 'P0001';
  end if;

  if v_order.status = 'entregue'
     and v_delivered_at is null
     and now() > (coalesce(v_order.updated_at, v_order.created_at) + interval '7 days') then
    raise exception 'Prazo de 7 dias para abrir suporte neste pedido encerrou'
      using errcode = 'P0001';
  end if;

  perform public.emit_order_event(
    p_order_id,
    'occurrence_opened',
    'customer',
    jsonb_build_object(
      'occurrence_id', v_occ,
      'tipo', v_tipo,
      'motivo_code', v_motivo,
      'gravidade', 'media',
      'note', v_reason,
      'source', 'customer',
      'acao_necessaria', 'analisar_pos_venda',
      'scope', v_scope,
      'items', coalesce(p_items, '[]'::jsonb),
      'policy_ack_at', case when p_policy_ack then now() else null end,
      'stage', 'aberto'
    ),
    v_uid
  );
  perform public.emit_order_event(
    p_order_id,
    'occurrence_opened',
    'internal',
    jsonb_build_object(
      'occurrence_id', v_occ,
      'tipo', v_tipo,
      'motivo_code', v_motivo,
      'gravidade', 'media',
      'note', v_reason,
      'source', 'customer',
      'acao_necessaria', 'analisar_pos_venda',
      'scope', v_scope,
      'items', coalesce(p_items, '[]'::jsonb),
      'policy_ack_at', case when p_policy_ack then now() else null end,
      'stage', 'aberto'
    ),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'occurrence_id', v_occ,
    'tipo', v_tipo,
    'motivo_code', v_motivo
  );
end;
$$;

-- Código ME: permite gerar ainda em aguardando_peca (ops pode avançar cedo).
create or replace function public.attach_me_return_code(
  p_order_id uuid,
  p_occurrence_id uuid,
  p_tracking_code text,
  p_tracking_url text default null,
  p_protocol text default null,
  p_expires_at timestamptz default null,
  p_service_id int default null,
  p_amount numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_payload jsonb;
  v_stage text;
  v_mode text;
  v_last text;
  v_tipo text;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if not public.is_staff() then
    if not exists (
      select 1 from public.customers c
      where c.id = v_order.customer_id and c.profile_id = v_uid
    ) then
      raise exception 'Pedido nao pertence ao usuario' using errcode = '42501';
    end if;
  end if;

  select e.event_type, e.payload->>'stage', e.payload->>'return_mode', e.payload->>'tipo'
    into v_last, v_stage, v_mode, v_tipo
  from public.order_events e
  where e.order_id = p_order_id
    and e.payload->>'occurrence_id' = p_occurrence_id::text
    and e.event_type in (
      'occurrence_opened', 'occurrence_updated', 'occurrence_assigned',
      'occurrence_started', 'occurrence_resolved', 'occurrence_reopened'
    )
  order by e.created_at desc
  limit 1;

  if v_last is null or v_last = 'occurrence_resolved' then
    raise exception 'Caso invalido para codigo de devolucao' using errcode = 'P0001';
  end if;
  if v_stage is null or v_stage not in ('autorizada', 'aguardando_peca') then
    raise exception 'Caso nao autorizado para codigo ME' using errcode = 'P0001';
  end if;
  if coalesce(v_mode, '') <> 'me_codigo' then
    raise exception 'Caso nao autorizado para codigo ME' using errcode = 'P0001';
  end if;
  if nullif(trim(coalesce(p_tracking_code, '')), '') is null then
    raise exception 'Codigo de rastreio obrigatorio' using errcode = 'P0001';
  end if;

  v_payload := jsonb_build_object(
    'occurrence_id', p_occurrence_id,
    'tipo', coalesce(v_tipo, 'pos_venda_devolucao'),
    'stage', v_stage,
    'return_mode', 'me_codigo',
    'me_reverse', jsonb_build_object(
      'tracking_code', trim(p_tracking_code),
      'tracking_url', nullif(trim(coalesce(p_tracking_url, '')), ''),
      'protocol', nullif(trim(coalesce(p_protocol, '')), ''),
      'expires_at', coalesce(p_expires_at, now() + interval '7 days'),
      'service_id', p_service_id,
      'amount', p_amount,
      'attached_at', now()
    ),
    'source', case when public.is_staff() then 'staff' else 'customer' end,
    'note', 'Codigo de devolucao Melhor Envio gerado'
  );

  perform public.emit_order_event(p_order_id, 'occurrence_updated', 'internal', v_payload, v_uid);
  perform public.emit_order_event(p_order_id, 'occurrence_updated', 'customer', v_payload, v_uid);

  return jsonb_build_object('ok', true, 'occurrence_id', p_occurrence_id, 'tracking_code', trim(p_tracking_code));
end;
$$;
