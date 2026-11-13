-- Fase A: decision_proposal + 3 ações cliente + hold + gates finalize/separação
-- Spec: docs/planejamento/FAL_SPEC_JORNADA_FASE_A_ANALISE_SEPARACAO_2026-11-13.md

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_customer_decision_check;

alter table public.orders
  add constraint orders_customer_decision_check check (
    customer_decision is null
    or customer_decision in (
      'pending',
      'authorized',
      'rejected',
      'continue_available',
      'wait_arrival',
      'cancel_order'
    )
  );

comment on column public.orders.customer_decision is
  'Decisão cliente: pending|continue_available|wait_arrival|cancel_order (+ legado authorized|rejected)';

alter table public.orders
  add column if not exists decision_proposal jsonb;

comment on column public.orders.decision_proposal is
  'Proposta ops ao pedir decisão: kind, reason_text, etas, unavailable_item_ids, wait_days';

-- ---------------------------------------------------------------------------
-- Transições: aguardando_decisao → aguardando_disponibilidade (wait_arrival)
-- ---------------------------------------------------------------------------
create or replace function public.order_transition_allowed(
  p_from text,
  p_to text
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from = p_to then false
    when p_from = 'aguardando_pagamento' and p_to = 'cancelado' then true
    when p_from = 'pagamento_aprovado' and p_to = 'recebido' then true
    when p_from = 'recebido' and p_to = 'em_analise' then true
    when p_from = 'em_analise' and p_to in (
      'confirmado', 'aguardando_disponibilidade', 'aguardando_decisao'
    ) then true
    when p_from = 'aguardando_disponibilidade' and p_to in (
      'confirmado', 'aguardando_decisao', 'em_analise'
    ) then true
    when p_from = 'aguardando_decisao' and p_to in (
      'confirmado', 'cancelado', 'em_analise', 'aguardando_disponibilidade'
    ) then true
    when p_from = 'confirmado' and p_to = 'em_separacao' then true
    when p_from = 'em_separacao' and p_to = 'pronto_para_envio' then true
    when p_from = 'pronto_para_envio' and p_to = 'enviado' then true
    when p_from = 'preparando_envio' and p_to = 'enviado' then true
    when p_from = 'enviado' and p_to = 'entregue' then true
    else false
  end;
$$;

-- ---------------------------------------------------------------------------
-- finalize: bloqueia indisponível sem autorização; aceita continue_available
-- ---------------------------------------------------------------------------
create or replace function public.finalize_order_confirmation(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_total int;
  v_set int;
  v_indisponivel int;
  v_prazo int;
  v_result text;
  v_to text;
  v_tr jsonb;
  v_decision text;
  v_authorized boolean;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status = 'recebido' then
    perform public.transition_order_status(
      p_order_id, 'em_analise', 'Inicio da analise',
      'analysis_started', 'customer', '{}'::jsonb
    );
    select * into v_order from public.orders where id = p_order_id;
  end if;

  if v_order.status not in ('em_analise', 'aguardando_disponibilidade', 'aguardando_decisao') then
    raise exception 'Pedido nao esta em fase de confirmacao' using errcode = 'P0001';
  end if;

  select count(*)::int,
         count(*) filter (where availability is not null)::int,
         count(*) filter (where availability = 'indisponivel')::int,
         count(*) filter (where availability = 'disponivel_com_prazo')::int
  into v_total, v_set, v_indisponivel, v_prazo
  from public.order_items
  where order_id = p_order_id;

  if v_total = 0 then
    raise exception 'Pedido sem itens' using errcode = 'P0001';
  end if;

  if v_set < v_total then
    raise exception 'Defina disponibilidade de todos os itens' using errcode = 'P0001';
  end if;

  v_decision := coalesce(v_order.customer_decision, 'pending');
  v_authorized := v_decision in ('authorized', 'continue_available');

  if v_order.status = 'aguardando_decisao' then
    if v_decision in ('rejected', 'cancel_order') then
      raise exception
        'Cliente recusou/cancelou. Resolva o cancelamento ou retire a solicitacao.'
        using errcode = 'P0001';
    end if;
    if v_decision = 'wait_arrival' then
      raise exception
        'Cliente pediu para esperar. Use aguardando_disponibilidade / retome a analise.'
        using errcode = 'P0001';
    end if;
    if not v_authorized then
      raise exception
        'Aguardando resposta do cliente. Aguarde a autorizacao ou use Retirar solicitacao.'
        using errcode = 'P0001';
    end if;
    v_result := case
      when v_indisponivel > 0 then 'autorizado_com_indisponivel'
      when v_prazo > 0 then 'autorizado_com_prazo'
      else 'confirmado'
    end;
    v_to := 'confirmado';
  else
    -- em_analise / aguardando_disponibilidade
    if v_indisponivel > 0 and not v_authorized then
      raise exception
        'Ha itens indisponiveis. Peca decisao do cliente (continuar com disponiveis) ou coloque em espera de disponibilidade.'
        using errcode = 'P0001';
    end if;
    v_result := case
      when v_indisponivel > 0 and v_authorized then 'autorizado_com_indisponivel'
      when v_prazo > 0 then 'confirmado_com_prazo'
      else 'confirmado'
    end;
    v_to := 'confirmado';
  end if;

  if v_order.status <> v_to then
    if v_order.status = 'aguardando_decisao' and v_to = 'confirmado' then
      null;
    elsif v_order.status = 'em_analise'
          and v_to in ('confirmado', 'aguardando_decisao', 'aguardando_disponibilidade') then
      null;
    elsif v_order.status = 'aguardando_disponibilidade'
          and v_to in ('confirmado', 'aguardando_decisao') then
      null;
    elsif not public.order_transition_allowed(v_order.status, v_to) then
      raise exception 'Transicao invalida na finalizacao: % → %', v_order.status, v_to
        using errcode = 'P0001';
    end if;

    v_tr := public.transition_order_status(
      p_order_id,
      v_to,
      case v_result
        when 'autorizado_com_prazo' then 'Confirmado com autorizacao do cliente (prazo)'
        when 'autorizado_com_indisponivel' then 'Confirmado com autorizacao do cliente'
        when 'confirmado_com_prazo' then 'Pedido confirmado (prazo informado pela loja)'
        else 'Pedido confirmado'
      end,
      case v_result
        when 'autorizado_com_prazo' then 'order_confirmed_with_caveat'
        when 'autorizado_com_indisponivel' then 'order_confirmed'
        when 'confirmado_com_prazo' then 'order_confirmed_with_caveat'
        else 'order_confirmed'
      end,
      'customer',
      jsonb_build_object(
        'result', v_result,
        'prazo_items', v_prazo,
        'indisponivel_items', v_indisponivel,
        'customer_decision', v_order.customer_decision
      )
    );
  end if;

  if v_result = 'confirmado_com_prazo' then
    perform public.emit_order_event(
      p_order_id,
      'staff_updated_eta_and_confirmed',
      'customer',
      jsonb_build_object('result', v_result, 'prazo_items', v_prazo),
      v_uid
    );
  end if;

  perform public.emit_order_event(
    p_order_id,
    'confirmation_finalized',
    'internal',
    jsonb_build_object('result', v_result, 'to', v_to),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'result', v_result,
    'status', v_to,
    'transition', v_tr,
    'customer_decision', v_order.customer_decision
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Solicitar confirmação (proposal_kind + decision_proposal)
-- ---------------------------------------------------------------------------
drop function if exists public.staff_request_customer_decision(uuid, text, text);

create or replace function public.staff_request_customer_decision(
  p_order_id uuid,
  p_reason_kind text,
  p_reason_text text default null,
  p_proposal jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_kind text;
  v_text text;
  v_tr jsonb;
  v_payload jsonb;
  v_proposal jsonb := coalesce(p_proposal, '{}'::jsonb);
  v_unavailable uuid[];
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  v_kind := lower(trim(coalesce(p_reason_kind, '')));
  if v_kind not in ('prazo', 'obs', 'indisponivel', 'outro', 'parcial', 'escolha') then
    raise exception 'Motivo invalido (prazo|obs|indisponivel|outro|parcial|escolha)'
      using errcode = 'P0001';
  end if;

  v_text := nullif(trim(coalesce(p_reason_text, '')), '');
  if v_kind in ('outro', 'obs', 'parcial', 'escolha') and v_text is null then
    raise exception 'Informe o texto do motivo / proposta para o cliente'
      using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status not in ('em_analise', 'aguardando_disponibilidade') then
    raise exception 'So e possivel solicitar confirmacao em analise'
      using errcode = 'P0001';
  end if;

  select coalesce(array_agg(id), array[]::uuid[])
  into v_unavailable
  from public.order_items
  where order_id = p_order_id and availability = 'indisponivel';

  v_proposal := v_proposal
    || jsonb_build_object(
      'kind', v_kind,
      'reason_text', v_text,
      'unavailable_item_ids', to_jsonb(v_unavailable),
      'requested_by', v_uid,
      'requested_at', now()
    );

  v_payload := v_proposal;

  v_tr := public.transition_order_status(
    p_order_id,
    'aguardando_decisao',
    case v_kind
      when 'prazo' then 'Loja solicitou confirmacao do cliente (prazo)'
      when 'parcial' then 'Loja solicitou confirmacao (continuar com disponiveis)'
      when 'escolha' then 'Loja solicitou decisao do cliente (continuar/esperar/cancelar)'
      when 'obs' then 'Loja solicitou confirmacao do cliente (observacao)'
      when 'indisponivel' then 'Loja solicitou confirmacao do cliente (indisponivel)'
      else 'Loja solicitou confirmacao do cliente'
    end,
    'order_awaiting_decision',
    'customer',
    v_payload
  );

  update public.orders
  set
    customer_decision = 'pending',
    decision_proposal = v_proposal,
    updated_at = now()
  where id = p_order_id;

  perform public.emit_order_event(
    p_order_id,
    'staff_requested_customer_decision',
    'internal',
    v_payload,
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'aguardando_decisao',
    'customer_decision', 'pending',
    'reason_kind', v_kind,
    'decision_proposal', v_proposal,
    'transition', v_tr
  );
end;
$$;

revoke all on function public.staff_request_customer_decision(uuid, text, text, jsonb) from public;
grant execute on function public.staff_request_customer_decision(uuid, text, text, jsonb) to authenticated;

comment on function public.staff_request_customer_decision(uuid, text, text, jsonb) is
  'Ops opt-in: pede confirmacao (prazo|parcial|escolha|obs|indisponivel|outro) + decision_proposal.';

-- ---------------------------------------------------------------------------
-- Hold: aguardando_disponibilidade
-- ---------------------------------------------------------------------------
create or replace function public.staff_hold_for_availability(
  p_order_id uuid,
  p_wait_days int default null,
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
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_days int := p_wait_days;
  v_tr jsonb;
  v_payload jsonb;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  if v_days is not null and v_days < 1 then
    raise exception 'wait_days deve ser >= 1' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status not in ('em_analise', 'aguardando_decisao') then
    raise exception 'Hold so a partir de em_analise ou aguardando_decisao'
      using errcode = 'P0001';
  end if;

  v_payload := jsonb_build_object(
    'wait_days', v_days,
    'note', v_note,
    'held_by', v_uid
  );

  if v_order.status = 'aguardando_disponibilidade' then
    null;
  else
    v_tr := public.transition_order_status(
      p_order_id,
      'aguardando_disponibilidade',
      coalesce(v_note, 'Aguardando disponibilidade / chegada de item'),
      'staff_held_for_availability',
      'customer',
      v_payload
    );
  end if;

  update public.orders
  set
    customer_decision = null,
    decision_proposal = case
      when v_days is not null or v_note is not null then
        coalesce(decision_proposal, '{}'::jsonb)
        || jsonb_build_object('wait_days', v_days, 'hold_note', v_note)
      else decision_proposal
    end,
    updated_at = now()
  where id = p_order_id;

  perform public.emit_order_event(
    p_order_id,
    'staff_held_for_availability',
    'internal',
    v_payload,
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'aguardando_disponibilidade',
    'wait_days', v_days,
    'transition', v_tr
  );
end;
$$;

revoke all on function public.staff_hold_for_availability(uuid, int, text) from public;
grant execute on function public.staff_hold_for_availability(uuid, int, text) to authenticated;

comment on function public.staff_hold_for_availability(uuid, int, text) is
  'Ops: coloca pedido em aguardando_disponibilidade (espera chegada).';

-- ---------------------------------------------------------------------------
-- Withdraw: limpa proposal
-- ---------------------------------------------------------------------------
create or replace function public.staff_withdraw_customer_decision_request(
  p_order_id uuid,
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
  v_tr jsonb;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status is distinct from 'aguardando_decisao' then
    raise exception 'Pedido nao esta aguardando decisao do cliente'
      using errcode = 'P0001';
  end if;

  v_tr := public.transition_order_status(
    p_order_id,
    'em_analise',
    coalesce(v_note, 'Solicitacao de confirmacao retirada pela loja'),
    'staff_withdrew_customer_decision',
    'customer',
    jsonb_build_object('note', v_note, 'previous_decision', v_order.customer_decision)
  );

  update public.orders
  set
    customer_decision = null,
    decision_proposal = null,
    updated_at = now()
  where id = p_order_id;

  perform public.emit_order_event(
    p_order_id,
    'staff_withdrew_customer_decision',
    'internal',
    jsonb_build_object('note', v_note),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'em_analise',
    'customer_decision', null,
    'transition', v_tr
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Cliente responde: continue_available | wait_arrival | cancel_order
-- ---------------------------------------------------------------------------
create or replace function public.customer_respond_order_decision(
  p_order_id uuid,
  p_decision text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_norm text;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_payload jsonb;
  v_tr jsonb;
  v_indisponivel int;
  v_prazo int;
  v_result text;
  v_status text;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;

  v_norm := lower(trim(coalesce(p_decision, '')));

  -- Compat legado
  if v_norm in ('authorize', 'authorized') then
    v_norm := 'continue_available';
  elsif v_norm in ('reject', 'rejected') then
    v_norm := 'cancel_order';
  end if;

  if v_norm not in ('continue_available', 'wait_arrival', 'cancel_order') then
    raise exception 'Decisao invalida (continue_available|wait_arrival|cancel_order)'
      using errcode = 'P0001';
  end if;

  if v_norm = 'cancel_order' and v_reason is null then
    raise exception 'Informe o motivo do cancelamento' using errcode = 'P0001';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.customers c
    where c.id = v_order.customer_id
      and c.profile_id = v_uid
  ) then
    raise exception 'Pedido nao pertence ao usuario' using errcode = '42501';
  end if;

  if v_order.status is distinct from 'aguardando_decisao' then
    raise exception 'Pedido nao esta aguardando autorizacao do cliente'
      using errcode = 'P0001';
  end if;

  if v_order.customer_decision in (
    'authorized', 'rejected', 'continue_available', 'wait_arrival', 'cancel_order'
  ) then
    raise exception 'Decisao ja registrada (%). Contate a loja se precisar alterar.',
      v_order.customer_decision
      using errcode = 'P0001';
  end if;

  v_payload := jsonb_build_object(
    'decision', v_norm,
    'proposal_kind', v_order.decision_proposal ->> 'kind'
  );
  if v_reason is not null then
    v_payload := v_payload || jsonb_build_object('reason', v_reason);
  end if;

  update public.orders
  set customer_decision = v_norm, updated_at = now()
  where id = p_order_id;

  if v_norm = 'continue_available' then
    select
      count(*) filter (where availability = 'indisponivel')::int,
      count(*) filter (where availability = 'disponivel_com_prazo')::int
    into v_indisponivel, v_prazo
    from public.order_items
    where order_id = p_order_id;

    v_result := case
      when v_indisponivel > 0 then 'autorizado_com_indisponivel'
      when v_prazo > 0 then 'autorizado_com_prazo'
      else 'confirmado'
    end;

    v_tr := public.transition_order_status(
      p_order_id,
      'confirmado',
      case v_result
        when 'autorizado_com_prazo' then 'Cliente aceitou o novo prazo'
        when 'autorizado_com_indisponivel' then 'Cliente optou por continuar com itens disponiveis'
        else 'Cliente confirmou e pedido liberado para separacao'
      end,
      'customer_chose_continue_available',
      'customer',
      v_payload || jsonb_build_object('result', v_result)
    );

    perform public.emit_order_event(
      p_order_id,
      'customer_chose_continue_available',
      'internal',
      v_payload || jsonb_build_object('result', v_result),
      v_uid
    );

    perform public.emit_order_event(
      p_order_id,
      'confirmation_finalized',
      'internal',
      jsonb_build_object('result', v_result, 'to', 'confirmado', 'via', 'customer_continue'),
      v_uid
    );

    v_status := 'confirmado';

  elsif v_norm = 'wait_arrival' then
    v_tr := public.transition_order_status(
      p_order_id,
      'aguardando_disponibilidade',
      'Cliente pediu para esperar a chegada do(s) item(ns)',
      'customer_chose_wait_arrival',
      'customer',
      v_payload
    );

    perform public.emit_order_event(
      p_order_id,
      'customer_chose_wait_arrival',
      'internal',
      v_payload,
      v_uid
    );

    v_status := 'aguardando_disponibilidade';

  else
    -- cancel_order: marca decisão + solicita cancelamento integral (Onda2)
    perform public.emit_order_event(
      p_order_id,
      'customer_chose_cancel',
      'customer',
      v_payload,
      v_uid
    );
    perform public.emit_order_event(
      p_order_id,
      'customer_chose_cancel',
      'internal',
      v_payload,
      v_uid
    );

    if coalesce(v_order.cancellation_request, '') is distinct from 'pending'
       and coalesce(v_order.cancellation_request, '') is distinct from 'approved' then
      update public.orders
      set
        cancellation_request = 'pending',
        cancellation_reason = coalesce(v_reason, 'Cliente cancelou na decisao da loja'),
        cancellation_requested_at = now(),
        cancellation_resolved_at = null,
        cancellation_resolve_note = null,
        updated_at = now()
      where id = p_order_id;

      insert into public.order_status_history (order_id, status, note, changed_by)
      values (
        p_order_id,
        v_order.status,
        'Cliente solicitou cancelamento na decisao: ' || left(coalesce(v_reason, ''), 200),
        v_uid
      );

      perform public.emit_order_event(
        p_order_id,
        'cancellation_requested',
        'customer',
        jsonb_build_object(
          'reason', v_reason,
          'policy_refund', 'manual',
          'via', 'customer_decision'
        ),
        v_uid
      );
    end if;

    v_status := v_order.status;
  end if;

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', v_status,
    'customer_decision', v_norm,
    'transition', v_tr
  );
end;
$$;

revoke all on function public.customer_respond_order_decision(uuid, text, text) from public;
grant execute on function public.customer_respond_order_decision(uuid, text, text) to authenticated;

comment on function public.customer_respond_order_decision(uuid, text, text) is
  'Cliente: continue_available|wait_arrival|cancel_order (authorize→continue, reject→cancel).';

-- ---------------------------------------------------------------------------
-- Separação: itens indisponíveis fora do envio
-- ---------------------------------------------------------------------------
create or replace function public.set_order_item_separated(
  p_order_item_id uuid,
  p_separated boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item public.order_items%rowtype;
  v_order public.orders%rowtype;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select * into v_item from public.order_items where id = p_order_item_id for update;
  if not found then
    raise exception 'Item nao encontrado' using errcode = 'P0001';
  end if;

  if v_item.availability = 'indisponivel' then
    raise exception 'Item indisponivel nao entra na separacao' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = v_item.order_id;
  if v_order.status not in ('confirmado', 'em_separacao') then
    raise exception 'Pedido nao esta em separacao' using errcode = 'P0001';
  end if;

  if v_order.status = 'confirmado' then
    perform public.transition_order_status(
      v_order.id, 'em_separacao', 'Separacao iniciada',
      'separation_started', 'customer', '{}'::jsonb
    );
  end if;

  update public.order_items set separated = p_separated where id = p_order_item_id;

  perform public.emit_order_event(
    v_item.order_id, 'item_separated', 'internal',
    jsonb_build_object('order_item_id', p_order_item_id, 'sku', v_item.sku, 'separated', p_separated),
    v_uid
  );

  return jsonb_build_object('order_item_id', p_order_item_id, 'separated', p_separated);
end;
$$;

create or replace function public.complete_order_separation(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_pending int;
  v_tr jsonb;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status = 'confirmado' then
    perform public.transition_order_status(
      p_order_id, 'em_separacao', 'Separacao iniciada',
      'separation_started', 'customer', '{}'::jsonb
    );
    select * into v_order from public.orders where id = p_order_id;
  end if;

  if v_order.status <> 'em_separacao' then
    raise exception 'Pedido nao esta em_separacao' using errcode = 'P0001';
  end if;

  -- Indisponíveis não precisam separated=true
  select count(*)::int into v_pending
  from public.order_items
  where order_id = p_order_id
    and separated is not true
    and coalesce(availability, '') is distinct from 'indisponivel';

  if v_pending > 0 then
    raise exception 'Ainda ha % item(ns) sem separar', v_pending using errcode = 'P0001';
  end if;

  v_tr := public.transition_order_status(
    p_order_id, 'pronto_para_envio', 'Separacao concluida',
    'separation_completed', 'customer', '{}'::jsonb
  );

  return jsonb_build_object('order_id', p_order_id, 'status', 'pronto_para_envio', 'transition', v_tr);
end;
$$;

-- ---------------------------------------------------------------------------
-- Notificações: novos kinds (mantém assinatura app_notification_copy + fanout)
-- ---------------------------------------------------------------------------
create or replace function public.app_notification_copy(
  p_kind text,
  p_payload jsonb,
  p_pickup boolean
)
returns table (title text, body text)
language plpgsql
immutable
as $$
declare
  v_kind text := lower(trim(coalesce(p_kind, '')));
  v_src text := lower(coalesce(p_payload ->> 'source', ''));
begin
  if v_kind = 'pickup_authorized' then
    title := 'Pronto para retirar na loja';
    body := 'A loja liberou a retirada. Leve documento e o número do pedido.';
    return next;
    return;
  end if;

  if v_kind = 'order_shipped' and p_pickup then
    title := 'Pronto para retirar';
    body := 'Seu pedido está disponível para retirada na loja.';
    return next;
    return;
  end if;

  if v_kind = 'order_delivered' and p_pickup then
    title := 'Retirada feita';
    body := 'A retirada do pedido na loja foi registrada.';
    return next;
    return;
  end if;

  if v_kind = 'separation_completed' and p_pickup then
    title := 'Separação concluída';
    body := 'Aguardando liberação da retirada pela loja.';
    return next;
    return;
  end if;

  case v_kind
    when 'payment_approved' then
      title := 'Pagamento aprovado';
      body := 'Recebemos o pagamento do seu pedido.';
    when 'payment_failed' then
      title := 'Pagamento não aprovado';
      body := 'O pagamento não foi aprovado. Você pode tentar novamente no pedido.';
    when 'order_received' then
      title := 'Pedido recebido pela loja';
      body := 'A FAL recebeu o pedido e vai analisar.';
    when 'analysis_started' then
      title := 'Loja analisando o pedido';
      body := 'Sua compra está em análise pela loja.';
    when 'order_confirmed' then
      title := 'Pedido confirmado';
      body := 'A loja confirmou o pedido.';
    when 'order_confirmed_with_caveat' then
      title := 'Pedido confirmado';
      body := 'A loja confirmou o pedido (com prazo atualizado).';
    when 'order_sent_to_separation' then
      title := 'Pedido em separação';
      body := 'A loja começou a separar os itens.';
    when 'separation_started' then
      title := 'Separação iniciada';
      body := 'Os itens do pedido estão sendo separados.';
    when 'separation_completed' then
      title := 'Separação concluída';
      body := 'A loja concluiu a separação do pedido.';
    when 'order_shipped' then
      title := 'Pedido enviado';
      body := 'Seu pedido foi despachado. Acompanhe o rastreio no detalhe.';
    when 'order_delivered' then
      title := 'Pedido entregue';
      body := 'A entrega do pedido foi confirmada.';
    when 'order_cancelled' then
      title := 'Pedido cancelado';
      body := 'O pedido foi cancelado.';
    when 'order_expired_unpaid' then
      title := 'Pedido expirado sem pagamento';
      body := 'O prazo para pagar o pedido acabou e ele foi cancelado.';
    when 'order_awaiting_decision' then
      title := 'A loja pediu sua decisão';
      body := coalesce(nullif(trim(p_payload ->> 'reason_text'), ''), 'Abra o pedido para continuar, esperar ou cancelar.');
    when 'staff_requested_customer_decision' then
      title := 'A loja pediu sua decisão';
      body := coalesce(nullif(trim(p_payload ->> 'reason_text'), ''), 'Abra o pedido para continuar, esperar ou cancelar.');
    when 'staff_held_for_availability' then
      title := 'Pedido aguardando disponibilidade';
      body := coalesce(nullif(trim(p_payload ->> 'note'), ''), 'A loja aguarda a chegada de item(ns).');
    when 'staff_updated_eta_and_confirmed' then
      title := 'Prazo atualizado e pedido confirmado';
      body := 'A loja atualizou o prazo e liberou o pedido para separação.';
    when 'customer_chose_continue_available' then
      title := 'Você confirmou o pedido';
      body := 'Seguiremos com os itens disponíveis / prazo informado.';
    when 'customer_chose_wait_arrival' then
      title := 'Você pediu para esperar';
      body := 'Aguardaremos a disponibilidade; a loja retomará o pedido.';
    when 'customer_chose_cancel' then
      title := 'Cancelamento solicitado';
      body := 'Recebemos seu pedido de cancelamento. A loja vai analisar.';
    when 'cancellation_approved' then
      title := 'Cancelamento aprovado';
      body := 'A loja aprovou o cancelamento do pedido.';
    when 'cancellation_rejected' then
      title := 'Cancelamento recusado';
      body := 'A loja recusou a solicitação de cancelamento.';
    when 'cancellation_requested' then
      title := 'Cliente pediu cancelamento';
      body := 'Há uma solicitação de cancelamento para analisar.';
    when 'customer_authorized_changes' then
      title := 'Cliente autorizou alterações';
      body := 'O cliente autorizou. Confirme o pedido na Central.';
    when 'customer_rejected_changes' then
      title := 'Cliente recusou alterações';
      body := 'O cliente recusou. Renegocie ou cancele o pedido.';
    when 'customer_receipt_confirmed' then
      title := 'Cliente confirmou o recebimento';
      body := 'O cliente marcou o pedido como recebido.';
    when 'occurrence_opened' then
      if v_src = 'customer' then
        title := 'Cliente reportou problema';
        body := coalesce(nullif(trim(p_payload ->> 'note'), ''), 'Abra o pedido / ocorrência.');
      else
        title := null;
        body := null;
      end if;
    else
      title := null;
      body := null;
  end case;

  if title is not null then
    return next;
  end if;
  return;
end;
$$;

create or replace function public.fanout_app_notification(
  p_event_id uuid,
  p_order_id uuid,
  p_event_type text,
  p_visibility text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pickup boolean := public.order_is_store_pickup(p_order_id);
  v_kind text := lower(trim(coalesce(p_event_type, '')));
  v_customer_profile uuid;
  v_staff_id uuid;
  v_title text;
  v_body text;
  v_href_customer text := '/conta/pedidos/' || p_order_id::text;
  v_href_staff text := '/admin/pedidos/' || p_order_id::text;
  v_notify_customer boolean := false;
  v_notify_staff boolean := false;
begin
  if p_visibility = 'customer' and v_kind in (
    'payment_approved',
    'payment_failed',
    'order_received',
    'analysis_started',
    'order_confirmed',
    'order_confirmed_with_caveat',
    'order_sent_to_separation',
    'separation_started',
    'separation_completed',
    'order_shipped',
    'order_delivered',
    'order_cancelled',
    'order_expired_unpaid',
    'order_awaiting_decision',
    'staff_requested_customer_decision',
    'staff_held_for_availability',
    'staff_updated_eta_and_confirmed',
    'customer_chose_continue_available',
    'customer_chose_wait_arrival',
    'customer_chose_cancel',
    'cancellation_approved',
    'cancellation_rejected',
    'pickup_authorized'
  ) then
    v_notify_customer := true;
  end if;

  if v_kind in (
    'cancellation_requested',
    'customer_authorized_changes',
    'customer_rejected_changes'
  ) then
    v_notify_staff := true;
  elsif v_kind in (
    'customer_chose_continue_available',
    'customer_chose_wait_arrival',
    'customer_chose_cancel'
  ) and p_visibility = 'internal' then
    v_notify_staff := true;
  elsif v_kind = 'customer_receipt_confirmed' and p_visibility = 'internal' then
    v_notify_staff := true;
  elsif v_kind = 'occurrence_opened'
    and p_visibility = 'internal'
    and lower(coalesce(p_payload ->> 'source', '')) = 'customer' then
    v_notify_staff := true;
  end if;

  if not v_notify_customer and not v_notify_staff then
    return;
  end if;

  select c.title, c.body into v_title, v_body
  from public.app_notification_copy(v_kind, coalesce(p_payload, '{}'::jsonb), v_pickup) c
  limit 1;

  if v_title is null then
    return;
  end if;

  if v_notify_customer then
    select c.profile_id into v_customer_profile
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where o.id = p_order_id;

    if v_customer_profile is not null then
      insert into public.app_notifications (
        recipient_profile_id, audience, channel, order_id, source_event_id,
        kind, title, body, href
      )
      values (
        v_customer_profile, 'customer', 'in_app', p_order_id, p_event_id,
        v_kind, v_title, v_body, v_href_customer
      )
      on conflict (source_event_id, recipient_profile_id) where (source_event_id is not null)
      do nothing;
    end if;
  end if;

  if v_notify_staff then
    for v_staff_id in
      select p.id
      from public.profiles p
      where p.role in ('administrador', 'gerente', 'operador', 'estoque', 'atendimento')
    loop
      insert into public.app_notifications (
        recipient_profile_id, audience, channel, order_id, source_event_id,
        kind, title, body, href
      )
      values (
        v_staff_id, 'staff', 'in_app', p_order_id, p_event_id,
        v_kind, v_title, v_body, v_href_staff
      )
      on conflict (source_event_id, recipient_profile_id) where (source_event_id is not null)
      do nothing;
    end loop;
  end if;
end;
$$;
