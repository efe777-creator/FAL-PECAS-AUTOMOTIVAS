-- Fila revisão: expor return_mode + tracking_code no meta para lista Adaptive.

create or replace function public.admin_list_revisao_queue_rows()
returns table (
  order_id uuid,
  source text,
  tipo text,
  stage text,
  last_event_type text,
  return_mode text,
  tracking_code text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Somente staff' using errcode = '42501';
  end if;

  return query
  select
    r.order_id,
    'manual_review'::text as source,
    null::text as tipo,
    null::text as stage,
    null::text as last_event_type,
    null::text as return_mode,
    null::text as tracking_code
  from public.own_manual_reviews r
  where r.status = 'pending'
    and r.order_id is not null

  union all

  select
    t.order_id,
    'occurrence'::text as source,
    nullif(trim(coalesce(t.tipo, '')), '') as tipo,
    nullif(trim(coalesce(t.stage, '')), '') as stage,
    t.event_type as last_event_type,
    nullif(trim(coalesce(t.return_mode, '')), '') as return_mode,
    nullif(trim(coalesce(t.tracking_code, '')), '') as tracking_code
  from (
    select distinct on (e.order_id, e.payload->>'occurrence_id')
      e.order_id,
      e.event_type,
      e.payload->>'tipo' as tipo,
      e.payload->>'stage' as stage,
      e.payload->>'return_mode' as return_mode,
      e.payload->'me_reverse'->>'tracking_code' as tracking_code
    from public.order_events e
    where e.event_type in (
        'occurrence_opened', 'occurrence_updated', 'occurrence_assigned',
        'occurrence_started', 'occurrence_resolved', 'occurrence_reopened'
      )
      and coalesce(e.payload->>'occurrence_id', '') <> ''
    order by e.order_id, e.payload->>'occurrence_id', e.created_at desc
  ) t
  where t.event_type is distinct from 'occurrence_resolved';
end;
$$;

comment on function public.admin_list_revisao_queue_rows() is
  'Fila revisao Adaptive: tipo/stage/return_mode/tracking_code para chips e lista.';
