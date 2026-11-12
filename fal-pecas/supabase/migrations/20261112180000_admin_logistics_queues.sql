-- Marcha 1 V2.2: filas logísticas compostas (contagens server-side).
-- Mock ≠ own. Packing estrutural (dims/peso > 0). Pagamento canônico = payments.approved.
-- Alocação produtos↔volumes = Marcha 3.

create or replace function public.order_packing_structurally_complete(p_meta jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  v_vol jsonb;
  v_vols jsonb;
begin
  if p_meta is null then
    return false;
  end if;
  v_vols := p_meta -> 'packing' -> 'volumes';
  if v_vols is null or jsonb_typeof(v_vols) <> 'array' or jsonb_array_length(v_vols) < 1 then
    return false;
  end if;
  for v_vol in select value from jsonb_array_elements(v_vols)
  loop
    if coalesce(v_vol->>'id', '') = '' then
      return false;
    end if;
    if coalesce((v_vol->>'lengthCm')::numeric, 0) <= 0
       or coalesce((v_vol->>'widthCm')::numeric, 0) <= 0
       or coalesce((v_vol->>'heightCm')::numeric, 0) <= 0
       or coalesce((v_vol->>'weightKg')::numeric, 0) <= 0 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

comment on function public.order_packing_structurally_complete(jsonb) is
  'Marcha 1: packing com volumes e dims/peso > 0. Alocação SKU = Marcha 3.';

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

  select count(*)::int into v_volumes
  from public.orders o
  join public.shipments s on s.order_id = o.id
  where o.status in ('pronto_para_envio', 'preparando_envio')
    and o.status is distinct from 'cancelado'
    and lower(coalesce(s.provider, '')) in ('melhorenvio', 'own')
    and not public.order_packing_structurally_complete(s.metadata);

  select count(*)::int into v_me
  from public.orders o
  join public.shipments s on s.order_id = o.id
  where o.status in ('pronto_para_envio', 'preparando_envio')
    and lower(coalesce(s.provider, '')) = 'melhorenvio'
    and public.order_packing_structurally_complete(s.metadata)
    and coalesce(s.metadata #>> '{me,label_state}', 'none') not in ('purchased', 'generated', 'printed')
    and exists (
      select 1 from public.payments p
      where p.order_id = o.id and p.status = 'approved'
    );

  select count(*)::int into v_own
  from public.orders o
  join public.shipments s on s.order_id = o.id
  where o.status in ('pronto_para_envio', 'preparando_envio')
    and lower(coalesce(s.provider, '')) = 'own'
    and public.order_packing_structurally_complete(s.metadata)
    and exists (
      select 1 from public.payments p
      where p.order_id = o.id and p.status = 'approved'
    );

  -- Revisão: own_manual_reviews pending + ocorrências abertas sem resolve posterior
  select count(*)::int into v_rev
  from (
    select distinct x.order_id
    from (
      select r.order_id
      from public.own_manual_reviews r
      where r.status = 'pending' and r.order_id is not null
      union
      select e.order_id
      from public.order_events e
      where e.event_type = 'occurrence_opened'
        and not exists (
          select 1
          from public.order_events r
          where r.order_id = e.order_id
            and r.event_type = 'occurrence_resolved'
            and r.payload->>'occurrence_id' = e.payload->>'occurrence_id'
        )
    ) x
  ) z;

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
  'Marcha 1: contagens das filas logísticas (mesma regra das listas). Mock fora de ME/Own.';

revoke all on function public.order_packing_structurally_complete(jsonb) from public;
grant execute on function public.order_packing_structurally_complete(jsonb) to authenticated;

revoke all on function public.admin_logistics_queue_counts() from public;
grant execute on function public.admin_logistics_queue_counts() to authenticated;
