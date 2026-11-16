-- Condições de pagamento (% sobre preço já resolvido da lista).
-- Negativo = desconto; positivo = acréscimo. Não cria lista por meio.

alter table public.store_payment_display
  add column if not exists pix_adjust_percent numeric(7, 3) not null default 0,
  add column if not exists debit_adjust_percent numeric(7, 3) not null default 0,
  add column if not exists credit_adjust_percent numeric(7, 3) not null default 0;

alter table public.store_payment_display
  drop constraint if exists store_payment_display_pix_adjust_percent_chk;
alter table public.store_payment_display
  add constraint store_payment_display_pix_adjust_percent_chk
  check (pix_adjust_percent >= -90 and pix_adjust_percent <= 100);

alter table public.store_payment_display
  drop constraint if exists store_payment_display_debit_adjust_percent_chk;
alter table public.store_payment_display
  add constraint store_payment_display_debit_adjust_percent_chk
  check (debit_adjust_percent >= -90 and debit_adjust_percent <= 100);

alter table public.store_payment_display
  drop constraint if exists store_payment_display_credit_adjust_percent_chk;
alter table public.store_payment_display
  add constraint store_payment_display_credit_adjust_percent_chk
  check (credit_adjust_percent >= -90 and credit_adjust_percent <= 100);

comment on column public.store_payment_display.pix_adjust_percent is
  'Ajuste % sobre subtotal de produtos para Pix (negativo = desconto).';
comment on column public.store_payment_display.debit_adjust_percent is
  'Ajuste % sobre subtotal de produtos para débito.';
comment on column public.store_payment_display.credit_adjust_percent is
  'Ajuste % sobre subtotal de produtos para crédito.';

-- Aplica condição ao pedido aguardando pagamento (subtotal produtos; frete intacto).
-- p_method opcional: atualiza payment_ref antes de calcular (troca Pix↔cartão no checkout).
create or replace function public.apply_payment_condition_to_order(
  p_order_id uuid,
  p_method text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_customer_id uuid;
  v_status text;
  v_method text;
  v_subtotal numeric;
  v_shipping numeric;
  v_pct numeric := 0;
  v_adjusted numeric;
  v_total numeric;
  v_pay_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select c.id into v_customer_id
  from public.customers c
  where c.profile_id = v_uid
  limit 1;

  if v_customer_id is null then
    raise exception 'customer_not_found';
  end if;

  select o.status, o.payment_ref, o.shipping_amount
  into v_status, v_method, v_shipping
  from public.orders o
  where o.id = p_order_id and o.customer_id = v_customer_id
  for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_status is distinct from 'aguardando_pagamento' then
    raise exception 'order_not_awaiting_payment';
  end if;

  if p_method is not null and p_method in ('pix', 'credit_card', 'debit_card') then
    v_method := p_method;
    update public.orders
    set payment_ref = p_method, updated_at = now()
    where id = p_order_id;
  end if;

  -- Base sempre dos itens (lista resolvida no place_order) — idempotente se reaplicar.
  select coalesce(sum(oi.unit_price * oi.quantity), 0)
  into v_subtotal
  from public.order_items oi
  where oi.order_id = p_order_id;

  v_shipping := coalesce(v_shipping, 0);

  select
    case
      when v_method = 'pix' then coalesce(spd.pix_adjust_percent, 0)
      when v_method = 'debit_card' then coalesce(spd.debit_adjust_percent, 0)
      when v_method = 'credit_card' then coalesce(spd.credit_adjust_percent, 0)
      else 0
    end
  into v_pct
  from public.store_payment_display spd
  order by spd.updated_at desc nulls last
  limit 1;

  v_pct := coalesce(v_pct, 0);
  if v_pct < -90 then v_pct := -90; end if;
  if v_pct > 100 then v_pct := 100; end if;

  v_adjusted := round(v_subtotal * (1 + v_pct / 100.0), 2);
  if v_adjusted < 0 then v_adjusted := 0; end if;
  v_total := round(v_adjusted + v_shipping, 2);

  update public.orders
  set
    subtotal = v_adjusted,
    total = v_total,
    updated_at = now()
  where id = p_order_id;

  -- Stub de pagamento pendente: alinhar amount
  select p.id into v_pay_id
  from public.payments p
  where p.order_id = p_order_id and p.status = 'pending'
  order by p.created_at desc
  limit 1;

  if v_pay_id is not null then
    update public.payments
    set
      amount = v_total,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'payment_condition', jsonb_build_object(
          'method', v_method,
          'adjust_percent', v_pct,
          'products_base_approx', v_subtotal,
          'products_adjusted', v_adjusted,
          'shipping', v_shipping
        )
      ),
      updated_at = now()
    where id = v_pay_id;
  end if;

  return jsonb_build_object(
    'order_id', p_order_id,
    'method', v_method,
    'adjust_percent', v_pct,
    'subtotal', v_adjusted,
    'shipping_amount', v_shipping,
    'total', v_total,
    'payment_id', v_pay_id
  );
end;
$$;

revoke all on function public.apply_payment_condition_to_order(uuid, text) from public;
grant execute on function public.apply_payment_condition_to_order(uuid, text) to authenticated;
