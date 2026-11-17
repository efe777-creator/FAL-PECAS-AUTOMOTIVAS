-- Marcha B: série diária do Painel (GMV entregue ≠ caixa payments).
-- Auth: staff; campos GMV exigem staff_can_view_reports_f8 no front (RPC devolve
-- gmv só se F8; caixa se is_staff).

create or replace function public.admin_dashboard_daily_series(
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
  v_from date := p_from;
  v_to date := p_to;
  v_can_f8 boolean := false;
  v_days jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  if v_from is null or v_to is null or v_from > v_to then
    raise exception 'Intervalo de datas inválido' using errcode = '22023';
  end if;

  -- Limite de 93 dias para evitar payloads enormes
  if (v_to - v_from) > 93 then
    raise exception 'Intervalo máximo de 93 dias' using errcode = '22023';
  end if;

  v_can_f8 := public.staff_can_view_reports_f8();

  with days as (
    select generate_series(v_from, v_to, interval '1 day')::date as d
  ),
  created as (
    select
      (o.created_at at time zone 'America/Sao_Paulo')::date as d,
      count(*)::int as orders_created
    from public.orders o
    where (o.created_at at time zone 'America/Sao_Paulo')::date
      between v_from and v_to
    group by 1
  ),
  delivered as (
    select
      (
        coalesce(s.delivered_at, o.updated_at) at time zone 'America/Sao_Paulo'
      )::date as d,
      count(*)::int as orders_delivered,
      coalesce(sum(o.total), 0) as gmv_delivered
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
      )::date between v_from and v_to
    group by 1
  ),
  pay_cap as (
    select
      (coalesce(p.paid_at, p.created_at) at time zone 'America/Sao_Paulo')::date as d,
      coalesce(sum(p.amount), 0) as captured
    from public.payments p
    where p.status = 'approved'
      and (coalesce(p.paid_at, p.created_at) at time zone 'America/Sao_Paulo')::date
        between v_from and v_to
    group by 1
  ),
  pay_ref as (
    select
      (coalesce(p.paid_at, p.created_at) at time zone 'America/Sao_Paulo')::date as d,
      coalesce(sum(p.amount), 0) as refunded
    from public.payments p
    where p.status = 'refunded'
      and (coalesce(p.paid_at, p.created_at) at time zone 'America/Sao_Paulo')::date
        between v_from and v_to
    group by 1
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(days.d, 'YYYY-MM-DD'),
        'orders_created', coalesce(created.orders_created, 0),
        'orders_delivered', case when v_can_f8 then coalesce(delivered.orders_delivered, 0) else null end,
        'gmv_delivered', case when v_can_f8 then coalesce(delivered.gmv_delivered, 0) else null end,
        'captured', coalesce(pay_cap.captured, 0),
        'refunded', coalesce(pay_ref.refunded, 0),
        'net_day', coalesce(pay_cap.captured, 0) - coalesce(pay_ref.refunded, 0)
      )
      order by days.d
    ),
    '[]'::jsonb
  )
  into v_days
  from days
  left join created on created.d = days.d
  left join delivered on delivered.d = days.d
  left join pay_cap on pay_cap.d = days.d
  left join pay_ref on pay_ref.d = days.d;

  return jsonb_build_object(
    'from', to_char(v_from, 'YYYY-MM-DD'),
    'to', to_char(v_to, 'YYYY-MM-DD'),
    'timezone', 'America/Sao_Paulo',
    'currency', 'BRL',
    'can_f8', v_can_f8,
    'days', v_days,
    'definitions', jsonb_build_object(
      'gmv_delivered', 'Soma orders.total com status entregue, no dia da entrega (shipments.delivered_at ou orders.updated_at)',
      'captured', 'Soma payments.amount approved no dia de paid_at/created_at',
      'net_day', 'captured − refunded no mesmo dia (não é saldo acumulado)',
      'orders_created', 'Contagem de orders por created_at'
    )
  );
end;
$$;

comment on function public.admin_dashboard_daily_series(date, date) is
  'Painel Marcha B: série diária GMV vs caixa. Staff only; gmv_* null se sem F8.';

revoke all on function public.admin_dashboard_daily_series(date, date) from public;
grant execute on function public.admin_dashboard_daily_series(date, date) to authenticated;
