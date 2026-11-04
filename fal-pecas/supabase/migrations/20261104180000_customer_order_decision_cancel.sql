-- M4 REGRAS-PEDIDOS-ONDA1
-- 1) customer_decision em orders
-- 2) customer_cancel_unpaid_order
-- 3) customer_respond_order_decision
-- 4) finalize_order_confirmation: prazo/indisponível → aguardando_decisao;
--    confirmação a partir de aguardando_decisao exige authorize

alter table public.orders
  add column if not exists customer_decision text
  check (
    customer_decision is null
    or customer_decision in ('pending', 'authorized', 'rejected')
  );

comment on column public.orders.customer_decision is
  'Decisão do cliente em aguardando_decisao: pending|authorized|rejected';

-- ---------------------------------------------------------------------------
-- Cancelar pedido não pago (cliente dono)
-- ---------------------------------------------------------------------------
create or replace function public.customer_cancel_unpaid_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
  v_rows int;
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
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

  if v_order.status is distinct from 'aguardando_pagamento' then
    raise exception 'So e permitido cancelar pedidos aguardando pagamento'
      using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.payments p
    where p.order_id = p_order_id and p.status = 'approved'
  ) then
    raise exception 'Pedido ja possui pagamento aprovado' using errcode = 'P0001';
  end if;

  perform public.release_order_reservations(p_order_id);

  update public.orders
  set status = 'cancelado', updated_at = now()
  where id = p_order_id
    and status = 'aguardando_pagamento';

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Falha ao cancelar pedido' using errcode = 'P0001';
  end if;

  update public.payments
  set
    status = 'cancelled',
    cancelled_at = coalesce(cancelled_at, now()),
    updated_at = now()
  where order_id = p_order_id
    and status in ('created', 'pending');

  update public.shipments
  set status = 'cancelled'
  where order_id = p_order_id
    and status is distinct from 'cancelled';

  insert into public.order_status_history (order_id, status, note, changed_by)
  values (
    p_order_id,
    'cancelado',
    'Cancelado pelo cliente antes do pagamento — reserva liberada',
    v_uid
  );

  perform public.emit_order_event(
    p_order_id,
    'order_cancelled',
    'customer',
    jsonb_build_object('reason', 'customer_cancel_unpaid'),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'cancelado',
    'reason', 'customer_cancel_unpaid'
  );
end;
$$;

revoke all on function public.customer_cancel_unpaid_order(uuid) from public;
grant execute on function public.customer_cancel_unpaid_order(uuid) to authenticated;

comment on function public.customer_cancel_unpaid_order(uuid) is
  'Cliente cancela o proprio pedido em aguardando_pagamento e libera reserva.';

-- ---------------------------------------------------------------------------
-- Resposta do cliente (autorizar / recusar) em aguardando_decisao
-- ---------------------------------------------------------------------------
create or replace function public.customer_respond_order_decision(
  p_order_id uuid,
  p_decision text
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
begin
  if v_uid is null then
    raise exception 'Nao autenticado' using errcode = '42501';
  end if;

  v_norm := lower(trim(coalesce(p_decision, '')));
  if v_norm not in ('authorize', 'authorized', 'reject', 'rejected') then
    raise exception 'Decisao invalida (authorize|reject)' using errcode = 'P0001';
  end if;

  if v_norm in ('authorize', 'authorized') then
    v_norm := 'authorized';
  else
    v_norm := 'rejected';
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

  if v_order.customer_decision in ('authorized', 'rejected') then
    raise exception 'Decisao ja registrada (%). Contate a loja se precisar alterar.',
      v_order.customer_decision
      using errcode = 'P0001';
  end if;

  update public.orders
  set customer_decision = v_norm, updated_at = now()
  where id = p_order_id;

  perform public.emit_order_event(
    p_order_id,
    case when v_norm = 'authorized' then 'customer_authorized_changes' else 'customer_rejected_changes' end,
    'customer',
    jsonb_build_object('decision', v_norm),
    v_uid
  );

  -- Espelho interno para o operador
  perform public.emit_order_event(
    p_order_id,
    case when v_norm = 'authorized' then 'customer_authorized_changes' else 'customer_rejected_changes' end,
    'internal',
    jsonb_build_object('decision', v_norm),
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', v_order.status,
    'customer_decision', v_norm
  );
end;
$$;

revoke all on function public.customer_respond_order_decision(uuid, text) from public;
grant execute on function public.customer_respond_order_decision(uuid, text) to authenticated;

comment on function public.customer_respond_order_decision(uuid, text) is
  'Cliente autoriza ou recusa alteracoes (indisponivel/prazo) em aguardando_decisao.';

-- ---------------------------------------------------------------------------
-- finalize_order_confirmation — alinhado às regras eFe
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
  v_needs_auth boolean;
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

  v_needs_auth := (v_indisponivel > 0 or v_prazo > 0);

  if v_needs_auth then
    if v_order.status = 'aguardando_decisao'
       and coalesce(v_order.customer_decision, 'pending') = 'authorized' then
      -- Cliente autorizou: loja pode confirmar (geral)
      v_result := case
        when v_indisponivel > 0 then 'autorizado_com_indisponivel'
        else 'autorizado_com_prazo'
      end;
      v_to := 'confirmado';
    elsif v_order.status = 'aguardando_decisao'
          and coalesce(v_order.customer_decision, 'pending') = 'rejected' then
      raise exception
        'Cliente recusou as alteracoes. Cancele o pedido ou renegocie com o cliente.'
        using errcode = 'P0001';
    else
      -- Ainda sem autorizacao (ou primeira passagem): pedir decisao
      v_result := case
        when v_indisponivel > 0 then 'nao_atendivel'
        else 'com_ressalva'
      end;
      v_to := 'aguardando_decisao';
    end if;
  else
    v_result := 'confirmado';
    v_to := 'confirmado';
  end if;

  if v_order.status = 'aguardando_decisao' and v_to = 'aguardando_decisao' then
    update public.orders
    set customer_decision = coalesce(customer_decision, 'pending'), updated_at = now()
    where id = p_order_id;

    perform public.emit_order_event(
      p_order_id, 'confirmation_reviewed', 'internal',
      jsonb_build_object(
        'result', v_result,
        'customer_decision', coalesce(v_order.customer_decision, 'pending')
      ),
      v_uid
    );
    return jsonb_build_object(
      'order_id', p_order_id,
      'result', v_result,
      'status', v_order.status,
      'customer_decision', coalesce(v_order.customer_decision, 'pending')
    );
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
        when 'com_ressalva' then 'Aguardando autorizacao do cliente (prazo)'
        when 'nao_atendivel' then 'Aguardando autorizacao — itens indisponiveis'
        when 'autorizado_com_prazo' then 'Confirmado com autorizacao do cliente (prazo)'
        when 'autorizado_com_indisponivel' then 'Confirmado com autorizacao do cliente'
        else 'Pedido confirmado'
      end,
      case v_result
        when 'com_ressalva' then 'order_awaiting_decision'
        when 'nao_atendivel' then 'order_awaiting_decision'
        when 'autorizado_com_prazo' then 'order_confirmed_with_caveat'
        when 'autorizado_com_indisponivel' then 'order_confirmed'
        else 'order_confirmed'
      end,
      case
        when v_result in ('nao_atendivel', 'com_ressalva') then 'customer'
        else 'customer'
      end,
      jsonb_build_object(
        'result', v_result,
        'prazo_items', v_prazo,
        'indisponivel_items', v_indisponivel,
        'customer_decision', v_order.customer_decision
      )
    );
  end if;

  if v_to = 'aguardando_decisao' then
    update public.orders
    set customer_decision = 'pending', updated_at = now()
    where id = p_order_id;
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
    'customer_decision', case
      when v_to = 'aguardando_decisao' then 'pending'
      else v_order.customer_decision
    end
  );
end;
$$;
