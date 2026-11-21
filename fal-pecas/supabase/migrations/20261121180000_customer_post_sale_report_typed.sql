-- Pós-venda F1: report tipado (motivo, scope, items, policy_ack) + gate janela 7d (T0 = delivered_at).

drop function if exists public.customer_report_delivery_issue(uuid, text);

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

  -- Tipo a partir do motivo
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

  -- Janela 7d a partir de delivered_at (T0 FAL). Caso já aberto (occurrence pos_venda*) permite novo report.
  select s.delivered_at into v_delivered_at
  from public.shipments s
  where s.order_id = p_order_id
  order by s.delivered_at desc nulls last
  limit 1;

  select exists (
    select 1
    from public.order_events e
    where e.order_id = p_order_id
      and e.event_type = 'occurrence_opened'
      and coalesce(e.payload->>'tipo', '') like 'pos_venda%'
  ) into v_has_open;

  if v_order.status = 'entregue'
     and not v_has_open
     and v_delivered_at is not null
     and now() > (v_delivered_at + interval '7 days') then
    raise exception 'Prazo de 7 dias para abrir suporte neste pedido encerrou'
      using errcode = 'P0001';
  end if;

  -- entregue sem delivered_at: usa updated_at do pedido como fallback T0
  if v_order.status = 'entregue'
     and not v_has_open
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
    'status', v_order.status,
    'tipo', v_tipo
  );
end;
$$;

revoke all on function public.customer_report_delivery_issue(uuid, text, text, text, jsonb, boolean) from public;
grant execute on function public.customer_report_delivery_issue(uuid, text, text, text, jsonb, boolean) to authenticated;

comment on function public.customer_report_delivery_issue(uuid, text, text, text, jsonb, boolean) is
  'F1 pos-venda: report tipado; janela 7d a partir de delivered_at; ACK obrigatorio para incompat/devolucao.';
