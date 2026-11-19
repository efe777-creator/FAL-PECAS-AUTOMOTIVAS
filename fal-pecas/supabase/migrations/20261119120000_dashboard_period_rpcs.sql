-- Painel: RPCs com período opcional (DEFAULT NULL = histórico completo).
-- DROP+CREATE para evitar conflito com overload/assinatura antiga.

drop function if exists public.admin_order_status_counts(date, date);
drop function if exists public.admin_order_status_counts();

create function public.admin_order_status_counts(
  p_from date default null,
  p_to date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_counts jsonb;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;
  if p_from is not null and p_to is not null and p_from > p_to then
    raise exception 'Intervalo de datas inválido' using errcode = '22023';
  end if;

  select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb)
  into v_counts
  from (
    select o.status, count(*)::int as cnt
    from public.orders o
    where (
      p_from is null
      or p_to is null
      or (o.created_at at time zone 'America/Sao_Paulo')::date between p_from and p_to
    )
    group by o.status
  ) s;

  return v_counts;
end;
$$;

revoke all on function public.admin_order_status_counts(date, date) from public;
grant execute on function public.admin_order_status_counts(date, date) to authenticated;

drop function if exists public.admin_orders_basic_totals(date, date);
-- Mantém zero-arg se existir; cria overload com datas.
create or replace function public.admin_orders_basic_totals(
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_out jsonb;
  v_created int := 0;
  v_open int := 0;
  v_cancelled int := 0;
  v_delivered int := 0;
  v_revenue numeric := 0;
begin
  if not public.staff_can_view_reports_f8() then
    raise exception 'Sem permissão para relatórios' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Intervalo de datas inválido' using errcode = '22023';
  end if;
  if (p_to - p_from) > 93 then
    raise exception 'Intervalo máximo de 93 dias' using errcode = '22023';
  end if;

  select
    count(*)::int,
    count(*) filter (where status not in ('entregue', 'cancelado'))::int,
    count(*) filter (where status = 'cancelado')::int
  into v_created, v_open, v_cancelled
  from public.orders o
  where (o.created_at at time zone 'America/Sao_Paulo')::date
    between p_from and p_to;

  select
    count(*)::int,
    coalesce(sum(o.total), 0)
  into v_delivered, v_revenue
  from public.orders o
  left join lateral (
    select sh.delivered_at
    from public.shipments sh
    where sh.order_id = o.id
      and sh.delivered_at is not null
    order by sh.delivered_at desc nulls last
    limit 1
  ) s on true
  where o.status = 'entregue'
    and (
      coalesce(s.delivered_at, o.updated_at) at time zone 'America/Sao_Paulo'
    )::date between p_from and p_to;

  v_out := jsonb_build_object(
    'orders_total', v_created,
    'orders_open', v_open,
    'orders_delivered', v_delivered,
    'orders_cancelled', v_cancelled,
    'revenue_delivered', v_revenue
  );
  return v_out;
end;
$$;

revoke all on function public.admin_orders_basic_totals(date, date) from public;
grant execute on function public.admin_orders_basic_totals(date, date) to authenticated;

drop function if exists public.admin_central_indicators(date, date);

create or replace function public.admin_central_indicators(
  p_from date,
  p_to date
)
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
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Intervalo de datas inválido' using errcode = '22023';
  end if;
  if (p_to - p_from) > 93 then
    raise exception 'Intervalo máximo de 93 dias' using errcode = '22023';
  end if;

  select
    count(*)::int,
    count(*) filter (where status = 'aguardando_decisao')::int,
    count(*) filter (where status = 'cancelado')::int,
    count(*) filter (where cancellation_request = 'pending')::int,
    coalesce(sum(total) filter (where status is distinct from 'cancelado'), 0),
    coalesce(sum(total) filter (where status = 'cancelado'), 0)
  into v_created, v_await_decision, v_cancelled, v_cancel_pending, v_gross, v_cancelled_amt
  from public.orders o
  where (o.created_at at time zone 'America/Sao_Paulo')::date
    between p_from and p_to;

  select coalesce(sum(x.amount), 0)
  into v_captured
  from (
    select distinct on (p.order_id) p.amount
    from public.payments p
    where p.status = 'approved'
      and (coalesce(p.paid_at, p.created_at) at time zone 'America/Sao_Paulo')::date
        between p_from and p_to
    order by p.order_id, coalesce(p.paid_at, p.created_at) desc nulls last, p.id desc
  ) x;

  select coalesce(sum(p.amount), 0)
  into v_refunded
  from public.payments p
  where p.status = 'refunded'
    and (coalesce(p.paid_at, p.created_at) at time zone 'America/Sao_Paulo')::date
      between p_from and p_to;

  select coalesce(sum(p.amount), 0)
  into v_pending
  from public.payments p
  join public.orders o on o.id = p.order_id
  where p.status in ('pending', 'created')
    and o.status is distinct from 'cancelado'
    and o.status is distinct from 'entregue'
    and (o.created_at at time zone 'America/Sao_Paulo')::date
      between p_from and p_to;

  v_ops := jsonb_build_object(
    'orders_created', v_created,
    'awaiting_decision', v_await_decision,
    'cancelled', v_cancelled,
    'cancellation_pending', v_cancel_pending,
    'by_status', coalesce((
      select jsonb_object_agg(status, cnt)
      from (
        select status, count(*)::int as cnt
        from public.orders o
        where (o.created_at at time zone 'America/Sao_Paulo')::date
          between p_from and p_to
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
    'currency', 'BRL',
    'from', to_char(p_from, 'YYYY-MM-DD'),
    'to', to_char(p_to, 'YYYY-MM-DD')
  );
end;
$$;

revoke all on function public.admin_central_indicators(date, date) from public;
grant execute on function public.admin_central_indicators(date, date) to authenticated;
