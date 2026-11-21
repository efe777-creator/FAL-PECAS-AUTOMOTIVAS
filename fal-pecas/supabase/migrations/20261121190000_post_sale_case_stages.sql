-- F3: stages pós-venda no caso (ocorrência) + return_mode.

create or replace function public.admin_post_sale_case_action(
  p_order_id uuid,
  p_occurrence_id uuid,
  p_action text,
  p_return_mode text default null,
  p_note text default null,
  p_service_override text default null,
  p_solucao text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_action text := lower(trim(coalesce(p_action, '')));
  v_mode text := lower(nullif(trim(coalesce(p_return_mode, '')), ''));
  v_last text;
  v_tipo text;
  v_stage text;
  v_prev_mode text;
  v_prev_override text;
  v_prev_me jsonb;
  v_event text;
  v_payload jsonb := '{}'::jsonb;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;
  if not exists (select 1 from public.orders where id = p_order_id) then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;
  if p_occurrence_id is null then
    raise exception 'occurrence_id obrigatorio' using errcode = 'P0001';
  end if;

  select e.event_type,
         e.payload->>'tipo',
         e.payload->>'stage',
         e.payload->>'return_mode',
         e.payload->>'service_override',
         e.payload->'me_reverse'
    into v_last, v_tipo, v_stage, v_prev_mode, v_prev_override, v_prev_me
  from public.order_events e
  where e.order_id = p_order_id
    and e.payload->>'occurrence_id' = p_occurrence_id::text
    and e.event_type in (
      'occurrence_opened', 'occurrence_updated', 'occurrence_assigned',
      'occurrence_started', 'occurrence_resolved', 'occurrence_reopened'
    )
  order by e.created_at desc
  limit 1;

  if v_last is null then
    raise exception 'Ocorrencia nao encontrada' using errcode = 'P0001';
  end if;
  if v_last = 'occurrence_resolved' and v_action not in ('reopen') then
    raise exception 'Ocorrencia ja resolvida' using errcode = 'P0001';
  end if;

  if v_action = 'start' then
    v_event := 'occurrence_started';
    v_stage := 'em_analise';
  elsif v_action = 'authorize' then
    if v_mode is null or v_mode not in ('me_codigo', 'wa', 'loja') then
      raise exception 'Informe return_mode: me_codigo, wa ou loja' using errcode = 'P0001';
    end if;
    v_event := 'occurrence_updated';
    v_stage := 'autorizada';
  elsif v_action = 'refuse' then
    v_event := 'occurrence_resolved';
    v_stage := 'recusada';
  elsif v_action = 'awaiting_piece' then
    v_event := 'occurrence_updated';
    v_stage := 'aguardando_peca';
  elsif v_action = 'conference' then
    v_event := 'occurrence_updated';
    v_stage := 'em_conferencia';
  elsif v_action = 'resolve' then
    v_event := 'occurrence_resolved';
    v_stage := 'resolvido';
  elsif v_action = 'reopen' then
    if v_last is distinct from 'occurrence_resolved' then
      raise exception 'So reabre ocorrencia resolvida' using errcode = 'P0001';
    end if;
    v_event := 'occurrence_reopened';
    v_stage := 'em_analise';
  else
    raise exception 'Acao invalida' using errcode = 'P0001';
  end if;

  -- Carrega return_mode / override / me_reverse do último evento se a ação não sobrescrever.
  if v_mode is null then
    v_mode := lower(nullif(trim(coalesce(v_prev_mode, '')), ''));
  end if;

  v_payload := jsonb_build_object(
    'occurrence_id', p_occurrence_id,
    'tipo', coalesce(v_tipo, 'pos_venda_suporte'),
    'stage', v_stage,
    'source', 'staff',
    'acao_necessaria', 'analisar_pos_venda'
  );
  if v_mode is not null then
    v_payload := v_payload || jsonb_build_object('return_mode', v_mode);
  end if;
  if p_note is not null and length(trim(p_note)) > 0 then
    v_payload := v_payload || jsonb_build_object('note', trim(p_note));
  end if;
  if p_service_override is not null and length(trim(p_service_override)) > 0 then
    v_payload := v_payload || jsonb_build_object('service_override', lower(trim(p_service_override)));
  elsif v_prev_override is not null and length(trim(v_prev_override)) > 0 then
    v_payload := v_payload || jsonb_build_object('service_override', lower(trim(v_prev_override)));
  end if;
  if v_prev_me is not null and jsonb_typeof(v_prev_me) = 'object' then
    v_payload := v_payload || jsonb_build_object('me_reverse', v_prev_me);
  end if;
  if p_solucao is not null and length(trim(p_solucao)) > 0 then
    v_payload := v_payload || jsonb_build_object('solucao', trim(p_solucao));
  end if;

  perform public.emit_order_event(p_order_id, v_event, 'internal', v_payload, v_uid);
  perform public.emit_order_event(
    p_order_id,
    v_event,
    'customer',
    v_payload || jsonb_build_object('visibility_note', 'atualizacao_pos_venda'),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'occurrence_id', p_occurrence_id,
    'stage', v_stage,
    'event_type', v_event,
    'return_mode', v_mode
  );
end;
$$;

revoke all on function public.admin_post_sale_case_action(uuid, uuid, text, text, text, text, text) from public;
grant execute on function public.admin_post_sale_case_action(uuid, uuid, text, text, text, text, text) to authenticated;

comment on function public.admin_post_sale_case_action(uuid, uuid, text, text, text, text, text) is
  'F3: stages pos-venda (authorize/refuse/awaiting_piece/conference/resolve) com return_mode.';

-- Persiste código ME (staff ou dono do pedido — Edge autenticada).
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

  select e.event_type, e.payload->>'stage', e.payload->>'return_mode'
    into v_last, v_stage, v_mode
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
  if v_stage is distinct from 'autorizada' or coalesce(v_mode, '') <> 'me_codigo' then
    raise exception 'Caso nao autorizado para codigo ME' using errcode = 'P0001';
  end if;
  if nullif(trim(coalesce(p_tracking_code, '')), '') is null then
    raise exception 'Codigo de rastreio obrigatorio' using errcode = 'P0001';
  end if;

  v_payload := jsonb_build_object(
    'occurrence_id', p_occurrence_id,
    'stage', 'autorizada',
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

revoke all on function public.attach_me_return_code(uuid, uuid, text, text, text, timestamptz, int, numeric) from public;
grant execute on function public.attach_me_return_code(uuid, uuid, text, text, text, timestamptz, int, numeric) to authenticated;
