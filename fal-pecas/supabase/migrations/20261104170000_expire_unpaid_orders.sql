-- MARCHA_PEDIDO_EXPIRY_RESERVA
-- Cancela pedidos aguardando_pagamento além do TTL (idade do pedido)
-- e libera reserva (F7F release_order_reservations).
-- Pix expires_at ≠ cancelamento: cliente pode gerar novo QR dentro do TTL.

create or replace function public.expire_unpaid_orders(
  p_limit int default 50,
  p_max_age_hours int default 48
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 200));
  v_hours int := greatest(1, least(coalesce(p_max_age_hours, 48), 720));
  r record;
  v_order public.orders%rowtype;
  v_count int := 0;
  v_ids uuid[] := '{}';
  v_rows int;
begin
  -- Chamada autenticada: só gerente/admin (mesmo gate do cancel manual).
  -- Chamada sem uid (service_role / SQL remoto): permitida.
  if v_uid is not null and not public.staff_can_cancel() then
    raise exception 'Somente gerente ou administrador pode expirar pedidos'
      using errcode = '42501';
  end if;

  for r in
    select o.id
    from public.orders o
    where o.status = 'aguardando_pagamento'
      and o.created_at < (now() - make_interval(hours => v_hours))
      and not exists (
        select 1
        from public.payments p
        where p.order_id = o.id
          and p.status = 'approved'
      )
    order by o.created_at asc
    limit v_limit
  loop
    select * into v_order
    from public.orders
    where id = r.id
    for update skip locked;

    if not found then
      continue;
    end if;

    if v_order.status is distinct from 'aguardando_pagamento' then
      continue;
    end if;

    if exists (
      select 1 from public.payments p
      where p.order_id = r.id and p.status = 'approved'
    ) then
      continue;
    end if;

    perform public.release_order_reservations(r.id);

    update public.orders
    set status = 'cancelado', updated_at = now()
    where id = r.id
      and status = 'aguardando_pagamento';

    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      continue;
    end if;

    update public.payments
    set
      status = 'expired',
      cancelled_at = coalesce(cancelled_at, now()),
      updated_at = now()
    where order_id = r.id
      and status in ('created', 'pending');

    update public.shipments
    set status = 'cancelled'
    where order_id = r.id
      and status is distinct from 'cancelled';

    insert into public.order_status_history (order_id, status, note, changed_by)
    values (
      r.id,
      'cancelado',
      format('Expiração automática: sem pagamento em %s h — reserva liberada', v_hours),
      v_uid
    );

    perform public.emit_order_event(
      r.id,
      'order_expired_unpaid',
      'customer',
      jsonb_build_object(
        'reason', 'unpaid_ttl',
        'max_age_hours', v_hours
      ),
      v_uid
    );
    perform public.emit_order_event(
      r.id,
      'order_cancelled',
      'customer',
      jsonb_build_object('reason', 'unpaid_ttl'),
      v_uid
    );

    v_count := v_count + 1;
    v_ids := array_append(v_ids, r.id);
  end loop;

  return jsonb_build_object(
    'expired', v_count,
    'order_ids', to_jsonb(v_ids),
    'max_age_hours', v_hours,
    'limit', v_limit
  );
end;
$$;

revoke all on function public.expire_unpaid_orders(int, int) from public;
grant execute on function public.expire_unpaid_orders(int, int) to authenticated;
grant execute on function public.expire_unpaid_orders(int, int) to service_role;

comment on function public.expire_unpaid_orders(int, int) is
  'Cancela aguardando_pagamento com idade > p_max_age_hours (default 48) e libera reserva. Pix QR expiry é independente.';
