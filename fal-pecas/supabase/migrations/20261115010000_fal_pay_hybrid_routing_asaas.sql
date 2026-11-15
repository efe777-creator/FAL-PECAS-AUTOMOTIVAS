-- FAL PAY híbrido: boleto em payments.method + config de roteamento + approve Asaas.

-- ---------------------------------------------------------------------------
-- payments.method: incluir boleto
-- ---------------------------------------------------------------------------
do $$
begin
  alter table public.payments drop constraint if exists payments_method_check;
  alter table public.payments
    add constraint payments_method_check
    check (
      method is null
      or method in (
        'pix',
        'credit_card',
        'debit_card',
        'boleto',
        'pix_simulated',
        'card_simulated',
        'other'
      )
    );
end $$;

-- ---------------------------------------------------------------------------
-- payment_routing_config (singleton operacional)
-- ---------------------------------------------------------------------------
create table if not exists public.payment_routing_config (
  id boolean primary key default true,
  pix_mp_max_amount_cents int not null default 20100,
  pix_below_limit_provider text not null default 'mercadopago',
  pix_above_limit_provider text not null default 'asaas',
  card_provider text not null default 'asaas',
  boleto_provider text not null default 'asaas',
  mercadopago_enabled boolean not null default true,
  asaas_enabled boolean not null default false,
  rule_version text not null default 'fal-pay-hybrid-v1',
  updated_at timestamptz not null default now(),
  constraint payment_routing_singleton check (id = true),
  constraint payment_routing_pix_mp_max_positive check (pix_mp_max_amount_cents > 0)
);

comment on table public.payment_routing_config is
  'Regras de roteamento FAL PAY (admin). Default: PIX até R$ 201 MP; demais Asaas.';

insert into public.payment_routing_config (id)
values (true)
on conflict (id) do nothing;

alter table public.payment_routing_config enable row level security;

drop policy if exists payment_routing_config_staff on public.payment_routing_config;
create policy payment_routing_config_staff on public.payment_routing_config
  for all using (public.is_staff()) with check (public.is_staff());

grant select on public.payment_routing_config to authenticated;

-- ---------------------------------------------------------------------------
-- confirm_asaas_payment (espelho F9-C, provider asaas)
-- ---------------------------------------------------------------------------
create or replace function public.confirm_asaas_payment(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay record;
  v_order record;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select p.* into v_pay
  from public.payments p
  where p.id = p_payment_id
  for update;

  if not found then
    raise exception 'Pagamento não encontrado' using errcode = 'P0001';
  end if;

  if v_pay.provider <> 'asaas' then
    raise exception 'Somente pagamento asaas' using errcode = 'P0001';
  end if;

  select * into v_order from public.orders where id = v_pay.order_id for update;

  if v_pay.status = 'approved' then
    return jsonb_build_object(
      'payment_id', v_pay.id,
      'provider', 'asaas',
      'status', 'approved',
      'order_id', v_order.id,
      'order_status', v_order.status,
      'reused', true
    );
  end if;

  if v_pay.status <> 'pending' then
    raise exception 'Pagamento não está pending' using errcode = 'P0001';
  end if;

  if v_order.status <> 'aguardando_pagamento' then
    raise exception 'Pedido não aguarda pagamento' using errcode = 'P0001';
  end if;

  update public.payments
  set status = 'approved', paid_at = coalesce(paid_at, now())
  where id = v_pay.id;

  update public.orders set status = 'pagamento_aprovado', updated_at = now() where id = v_order.id;
  insert into public.order_status_history (order_id, status, note, changed_by)
  values (v_order.id, 'pagamento_aprovado', 'Pagamento Asaas aprovado (webhook)', null);
  perform public.emit_order_event(
    v_order.id, 'payment_approved', 'customer',
    jsonb_build_object('payment_id', v_pay.id, 'provider', 'asaas'), null
  );

  update public.orders set status = 'recebido', updated_at = now() where id = v_order.id;
  insert into public.order_status_history (order_id, status, note, changed_by)
  values (v_order.id, 'recebido', 'Pedido recebido pela FAL', null);
  perform public.emit_order_event(v_order.id, 'order_received', 'customer', '{}'::jsonb, null);

  update public.orders set status = 'em_analise', updated_at = now() where id = v_order.id;
  insert into public.order_status_history (order_id, status, note, changed_by)
  values (v_order.id, 'em_analise', 'Pedido em confirmação', null);
  perform public.emit_order_event(v_order.id, 'confirmation_started', 'internal', '{}'::jsonb, null);

  return jsonb_build_object(
    'payment_id', v_pay.id,
    'provider', 'asaas',
    'status', 'approved',
    'order_id', v_order.id,
    'order_status', 'em_analise'
  );
end;
$$;

revoke all on function public.confirm_asaas_payment(uuid) from public;
revoke all on function public.confirm_asaas_payment(uuid) from anon;
revoke all on function public.confirm_asaas_payment(uuid) from authenticated;
grant execute on function public.confirm_asaas_payment(uuid) to service_role;

comment on function public.confirm_asaas_payment(uuid) is
  'FAL PAY: aprova payment asaas + ciclo F7. Somente service_role (webhook Edge).';