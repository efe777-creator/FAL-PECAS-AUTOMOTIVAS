-- FA: operador decide quando pedir confirmação do cliente (prazo/obs/outro).
-- finalize_order_confirmation NUNCA cria aguardando_decisao sozinho.
-- Único caminho: staff_request_customer_decision.

-- ---------------------------------------------------------------------------
-- Transições: withdraw volta para análise
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
    when p_from = 'aguardando_decisao' and p_to in ('confirmado', 'cancelado', 'em_analise') then true
    when p_from = 'confirmado' and p_to = 'em_separacao' then true
    when p_from = 'em_separacao' and p_to = 'pronto_para_envio' then true
    when p_from = 'pronto_para_envio' and p_to = 'enviado' then true
    when p_from = 'preparando_envio' and p_to = 'enviado' then true
    when p_from = 'enviado' and p_to = 'entregue' then true
    else false
  end;
$$;

-- ---------------------------------------------------------------------------
-- finalize: sem auto-auth por prazo/indisponível
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

  -- Em espera de decisão: só confirma se cliente autorizou; senão orientar.
  if v_order.status = 'aguardando_decisao' then
    if v_decision = 'rejected' then
      raise exception
        'Cliente recusou as alteracoes. Cancele o pedido ou retire a solicitacao e renegocie.'
        using errcode = 'P0001';
    end if;
    if v_decision is distinct from 'authorized' then
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
    -- em_analise / aguardando_disponibilidade: ops decide — nunca auto-pede cliente
    v_result := case
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
-- Solicitar confirmação (opt-in)
-- ---------------------------------------------------------------------------
create or replace function public.staff_request_customer_decision(
  p_order_id uuid,
  p_reason_kind text,
  p_reason_text text default null
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
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  v_kind := lower(trim(coalesce(p_reason_kind, '')));
  if v_kind not in ('prazo', 'obs', 'indisponivel', 'outro') then
    raise exception 'Motivo invalido (prazo|obs|indisponivel|outro)' using errcode = 'P0001';
  end if;

  v_text := nullif(trim(coalesce(p_reason_text, '')), '');
  if v_kind = 'outro' and v_text is null then
    raise exception 'Informe o texto do motivo' using errcode = 'P0001';
  end if;
  if v_kind = 'obs' and v_text is null then
    raise exception 'Informe a observacao para o cliente' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_order.status not in ('em_analise', 'aguardando_disponibilidade') then
    raise exception 'So e possivel solicitar confirmacao em analise'
      using errcode = 'P0001';
  end if;

  v_payload := jsonb_build_object(
    'reason_kind', v_kind,
    'reason_text', v_text,
    'requested_by', v_uid
  );

  v_tr := public.transition_order_status(
    p_order_id,
    'aguardando_decisao',
    case v_kind
      when 'prazo' then 'Loja solicitou confirmacao do cliente (prazo)'
      when 'obs' then 'Loja solicitou confirmacao do cliente (observacao)'
      when 'indisponivel' then 'Loja solicitou confirmacao do cliente (indisponivel)'
      else 'Loja solicitou confirmacao do cliente'
    end,
    'order_awaiting_decision',
    'customer',
    v_payload
  );

  update public.orders
  set customer_decision = 'pending', updated_at = now()
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
    'transition', v_tr
  );
end;
$$;

revoke all on function public.staff_request_customer_decision(uuid, text, text) from public;
grant execute on function public.staff_request_customer_decision(uuid, text, text) to authenticated;

comment on function public.staff_request_customer_decision(uuid, text, text) is
  'Ops opt-in: pede confirmacao do cliente (prazo/obs/indisponivel/outro).';

-- ---------------------------------------------------------------------------
-- Retirar solicitação (unstick / withdraw)
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
  set customer_decision = null, updated_at = now()
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

revoke all on function public.staff_withdraw_customer_decision_request(uuid, text) from public;
grant execute on function public.staff_withdraw_customer_decision_request(uuid, text) to authenticated;

comment on function public.staff_withdraw_customer_decision_request(uuid, text) is
  'Ops: retira pedido de aguardando_decisao de volta para em_analise (unstick).';
