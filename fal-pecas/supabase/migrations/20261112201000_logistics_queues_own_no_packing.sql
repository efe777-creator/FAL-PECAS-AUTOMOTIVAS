-- Alinha filas: volumes só ME; entregas-proprias sem exigir packing (pós-separação own).

create or replace function public.admin_logistics_queue_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_volumes int := 0;
  v_me int := 0;
  v_own int := 0;
  v_rev int := 0;
  v_transito int := 0;
  v_entregues int := 0;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  select count(*)::int into v_transito from public.orders where status = 'enviado';
  select count(*)::int into v_entregues from public.orders where status = 'entregue';

  -- Volumes: apenas Melhor Envio sem packing completo
  select count(*)::int into v_volumes
  from public.orders o
  join public.shipments s on s.order_id = o.id
  where o.status in ('pronto_para_envio', 'preparando_envio')
    and o.status is distinct from 'cancelado'
    and lower(coalesce(s.provider, '')) = 'melhorenvio'
    and not public.order_packing_is_complete(o.id);

  select count(*)::int into v_me
  from public.orders o
  join public.shipments s on s.order_id = o.id
  where o.status in ('pronto_para_envio', 'preparando_envio')
    and lower(coalesce(s.provider, '')) = 'melhorenvio'
    and public.order_packing_is_complete(o.id)
    and coalesce(s.metadata #>> '{me,label_state}', 'none') not in ('purchased', 'generated', 'printed')
    and exists (
      select 1 from public.payments p
      where p.order_id = o.id and p.status = 'approved'
    );

  -- Own: pago + pronto; packing não bloqueia
  select count(*)::int into v_own
  from public.orders o
  join public.shipments s on s.order_id = o.id
  where o.status in ('pronto_para_envio', 'preparando_envio')
    and lower(coalesce(s.provider, '')) = 'own'
    and exists (
      select 1 from public.payments p
      where p.order_id = o.id and p.status = 'approved'
    );

  select count(*)::int into v_rev
  from (
    select distinct z.order_id
    from (
      select r.order_id
      from public.own_manual_reviews r
      where r.status = 'pending' and r.order_id is not null
      union
      select t.order_id
      from (
        select distinct on (e.order_id, e.payload->>'occurrence_id')
          e.order_id,
          e.event_type
        from public.order_events e
        where e.event_type in (
            'occurrence_opened', 'occurrence_updated', 'occurrence_assigned',
            'occurrence_started', 'occurrence_resolved', 'occurrence_reopened'
          )
          and coalesce(e.payload->>'occurrence_id', '') <> ''
        order by e.order_id, e.payload->>'occurrence_id', e.created_at desc
      ) t
      where t.event_type is distinct from 'occurrence_resolved'
    ) z
  ) q;

  return jsonb_build_object(
    'volumes', v_volumes,
    'etiquetas-me', v_me,
    'entregas-proprias', v_own,
    'revisao', v_rev,
    'transito', v_transito,
    'entregues', v_entregues
  );
end;
$$;

comment on function public.admin_logistics_queue_counts() is
  'Filas: volumes=ME sem packing; own sem packing; ME etiquetas com packing+pay.';
