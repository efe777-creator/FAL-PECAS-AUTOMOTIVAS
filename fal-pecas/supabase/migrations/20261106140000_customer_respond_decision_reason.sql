-- Motivo obrigatório ao cliente recusar alterações (aguardando_decisao).
-- Substitui a assinatura de 2 args pela de 3 (p_reason opcional; obrigatório se reject).

drop function if exists public.customer_respond_order_decision(uuid, text);

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

  if v_norm = 'rejected' and v_reason is null then
    raise exception 'Informe o motivo da recusa' using errcode = 'P0001';
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

  v_payload := jsonb_build_object('decision', v_norm);
  if v_reason is not null then
    v_payload := v_payload || jsonb_build_object('reason', v_reason);
  end if;

  perform public.emit_order_event(
    p_order_id,
    case when v_norm = 'authorized' then 'customer_authorized_changes' else 'customer_rejected_changes' end,
    'customer',
    v_payload,
    v_uid
  );

  perform public.emit_order_event(
    p_order_id,
    case when v_norm = 'authorized' then 'customer_authorized_changes' else 'customer_rejected_changes' end,
    'internal',
    v_payload,
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', v_order.status,
    'customer_decision', v_norm
  );
end;
$$;

revoke all on function public.customer_respond_order_decision(uuid, text, text) from public;
grant execute on function public.customer_respond_order_decision(uuid, text, text) to authenticated;

comment on function public.customer_respond_order_decision(uuid, text, text) is
  'Cliente autoriza ou recusa alteracoes; recusa exige p_reason (persistido no evento).';
