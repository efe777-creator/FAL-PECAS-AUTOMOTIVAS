-- CP-CEN-011: indicadores operacionais + financeiros da Central (fórmulas V2).
-- Recebido líquido = capturado − devolvido. Sem dashboard duplicado (033/034).

create or replace function public.admin_central_indicators()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ops jsonb;
  v_fin jsonb;
  v_captured numeric := 0;
  v_refunded numeric := 0;
  v_pending numeric := 0;
  v_gross numeric := 0;
  v_cancelled_amt numeric := 0;
  v_created int := 0;
  v_cancel_pending int := 0;
  v_await_decision int := 0;
  v_cancelled int := 0;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select
    count(*)::int,
    count(*) filter (where status = 'aguardando_decisao')::int,
    count(*) filter (where status = 'cancelado')::int,
    count(*) filter (where cancellation_request = 'pending')::int,
    coalesce(sum(total) filter (where status is distinct from 'cancelado'), 0),
    coalesce(sum(total) filter (where status = 'cancelado'), 0)
  into v_created, v_await_decision, v_cancelled, v_cancel_pending, v_gross, v_cancelled_amt
  from public.orders;

  -- Pagamento canônico: no máximo 1 approved vigente por pedido (maior paid_at / created).
  select coalesce(sum(x.amount), 0)
  into v_captured
  from (
    select distinct on (p.order_id) p.amount
    from public.payments p
    where p.status = 'approved'
    order by p.order_id, coalesce(p.paid_at, p.created_at) desc nulls last, p.id desc
  ) x;

  select coalesce(sum(p.amount), 0)
  into v_refunded
  from public.payments p
  where p.status = 'refunded';

  select coalesce(sum(p.amount), 0)
  into v_pending
  from public.payments p
  join public.orders o on o.id = p.order_id
  where p.status in ('pending', 'created')
    and o.status is distinct from 'cancelado'
    and o.status is distinct from 'entregue';

  v_ops := jsonb_build_object(
    'orders_created', v_created,
    'awaiting_decision', v_await_decision,
    'cancelled', v_cancelled,
    'cancellation_pending', v_cancel_pending,
    'by_status', coalesce((
      select jsonb_object_agg(status, cnt)
      from (
        select status, count(*)::int as cnt
        from public.orders
        group by status
      ) s
    ), '{}'::jsonb)
  );

  v_fin := jsonb_build_object(
    'captured', v_captured,
    'refunded', v_refunded,
    'net_received', v_captured - v_refunded,
    'gross_sold', v_gross,
    'cancelled_amount', v_cancelled_amt,
    'pending_payment', v_pending
  );

  return jsonb_build_object(
    'operational', v_ops,
    'financial', v_fin,
    'currency', 'BRL'
  );
end;
$$;

comment on function public.admin_central_indicators() is
  'CP-CEN-011: ops + fin Central. net_received = captured − refunded. Staff only.';

revoke all on function public.admin_central_indicators() from public;
grant execute on function public.admin_central_indicators() to authenticated;
