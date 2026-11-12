-- Marcha 7: ciclo de vida ocorrências (assign/start/reopen) + fila revisão com reabertas.
-- Append-only via order_events. own_manual_reviews ganha campos de ciclo (payload).

create or replace function public.admin_occurrence_action(
  p_order_id uuid,
  p_action text,
  p_occurrence_id uuid default null,
  p_tipo text default null,
  p_gravidade text default 'media',
  p_note text default null,
  p_solucao text default null,
  p_visibility text default 'internal',
  p_prioridade text default 'media',
  p_acao_necessaria text default null,
  p_assignee_id uuid default null,
  p_motivo_reabertura text default null,
  p_motivo_encerramento text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_occ uuid;
  v_event text;
  v_payload jsonb;
  v_vis text := coalesce(nullif(trim(p_visibility), ''), 'internal');
  v_event_id uuid;
  v_prio text := coalesce(nullif(trim(p_prioridade), ''), 'media');
  v_grav text := coalesce(nullif(trim(p_gravidade), ''), 'media');
  v_last text;
begin
  if v_uid is null or not public.is_staff() then
    raise exception 'Apenas staff' using errcode = '42501';
  end if;

  if not exists (select 1 from public.orders where id = p_order_id) then
    raise exception 'Pedido nao encontrado' using errcode = 'P0001';
  end if;

  if v_vis not in ('internal', 'customer') then
    raise exception 'visibility invalida' using errcode = 'P0001';
  end if;

  if p_action not in ('open', 'update', 'assign', 'start', 'resolve', 'reopen') then
    raise exception 'acao invalida' using errcode = 'P0001';
  end if;

  if v_grav not in ('baixa', 'media', 'alta') then
    raise exception 'gravidade invalida' using errcode = 'P0001';
  end if;

  if v_prio not in ('baixa', 'media', 'alta', 'urgente') then
    raise exception 'prioridade invalida' using errcode = 'P0001';
  end if;

  if p_action = 'open' then
    v_occ := coalesce(p_occurrence_id, gen_random_uuid());
    v_event := 'occurrence_opened';
    if coalesce(nullif(trim(p_tipo), ''), '') = '' then
      raise exception 'tipo obrigatorio ao abrir ocorrencia' using errcode = 'P0001';
    end if;
    if coalesce(nullif(trim(p_acao_necessaria), ''), '') = '' then
      raise exception 'acao_necessaria obrigatoria ao abrir' using errcode = 'P0001';
    end if;
  else
    if p_occurrence_id is null then
      raise exception 'occurrence_id obrigatorio' using errcode = 'P0001';
    end if;
    v_occ := p_occurrence_id;

    -- último evento da cadeia
    select e.event_type into v_last
    from public.order_events e
    where e.order_id = p_order_id
      and e.event_type in (
        'occurrence_opened', 'occurrence_updated', 'occurrence_assigned',
        'occurrence_started', 'occurrence_resolved', 'occurrence_reopened'
      )
      and e.payload->>'occurrence_id' = v_occ::text
    order by e.created_at desc
    limit 1;

    if v_last is null then
      raise exception 'ocorrencia nao encontrada' using errcode = 'P0001';
    end if;

    if p_action = 'update' then
      v_event := 'occurrence_updated';
      if v_last = 'occurrence_resolved' then
        raise exception 'ocorrencia resolvida — use reopen' using errcode = 'P0001';
      end if;
    elsif p_action = 'assign' then
      v_event := 'occurrence_assigned';
      if p_assignee_id is null then
        raise exception 'assignee_id obrigatorio' using errcode = 'P0001';
      end if;
      if v_last = 'occurrence_resolved' then
        raise exception 'ocorrencia resolvida — use reopen' using errcode = 'P0001';
      end if;
    elsif p_action = 'start' then
      v_event := 'occurrence_started';
      if v_last = 'occurrence_resolved' then
        raise exception 'ocorrencia resolvida — use reopen' using errcode = 'P0001';
      end if;
    elsif p_action = 'resolve' then
      v_event := 'occurrence_resolved';
      if coalesce(nullif(trim(p_solucao), ''), '') = '' then
        raise exception 'solucao obrigatoria ao resolver' using errcode = 'P0001';
      end if;
      if v_last = 'occurrence_resolved' then
        raise exception 'ja resolvida' using errcode = 'P0001';
      end if;
    else
      -- reopen
      v_event := 'occurrence_reopened';
      if v_last is distinct from 'occurrence_resolved' then
        raise exception 'so reabre ocorrencia resolvida' using errcode = 'P0001';
      end if;
      if coalesce(nullif(trim(p_motivo_reabertura), ''), '') = '' then
        raise exception 'motivo_reabertura obrigatorio' using errcode = 'P0001';
      end if;
    end if;
  end if;

  v_payload := jsonb_build_object(
    'occurrence_id', v_occ,
    'tipo', nullif(trim(coalesce(p_tipo, '')), ''),
    'gravidade', v_grav,
    'prioridade', v_prio,
    'acao_necessaria', nullif(trim(coalesce(p_acao_necessaria, '')), ''),
    'note', nullif(trim(coalesce(p_note, '')), ''),
    'solucao', nullif(trim(coalesce(p_solucao, '')), ''),
    'motivo_encerramento', coalesce(
      nullif(trim(coalesce(p_motivo_encerramento, '')), ''),
      nullif(trim(coalesce(p_solucao, '')), '')
    ),
    'motivo_reabertura', nullif(trim(coalesce(p_motivo_reabertura, '')), ''),
    'responsavel_id', v_uid,
    'assignee_id', p_assignee_id
  );

  v_event_id := public.emit_order_event(
    p_order_id,
    v_event,
    v_vis,
    v_payload,
    v_uid
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'occurrence_id', v_occ,
    'event_type', v_event,
    'event_id', v_event_id,
    'payload', v_payload
  );
end;
$$;

comment on function public.admin_occurrence_action(
  uuid, text, uuid, text, text, text, text, text, text, text, uuid, text, text
) is
  'Marcha 7: open/update/assign/start/resolve/reopen — cadeia append-only.';

revoke all on function public.admin_occurrence_action(
  uuid, text, uuid, text, text, text, text, text, text, text, uuid, text, text
) from public;
grant execute on function public.admin_occurrence_action(
  uuid, text, uuid, text, text, text, text, text, text, text, uuid, text, text
) to authenticated;

-- Compat: assinatura antiga (8 args) → defaults
create or replace function public.admin_occurrence_action(
  p_order_id uuid,
  p_action text,
  p_occurrence_id uuid default null,
  p_tipo text default null,
  p_gravidade text default 'media',
  p_note text default null,
  p_solucao text default null,
  p_visibility text default 'internal'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.admin_occurrence_action(
    p_order_id, p_action, p_occurrence_id, p_tipo, p_gravidade, p_note, p_solucao,
    p_visibility, 'media', null, null, null, null
  );
end;
$$;

revoke all on function public.admin_occurrence_action(uuid, text, uuid, text, text, text, text, text) from public;
grant execute on function public.admin_occurrence_action(uuid, text, uuid, text, text, text, text, text) to authenticated;

-- Fila revisão: ocorrência aberta = último evento não é resolved (inclui reopened)
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

  select count(*)::int into v_own
  from public.orders o
  join public.shipments s on s.order_id = o.id
  where o.status in ('pronto_para_envio', 'preparando_envio')
    and lower(coalesce(s.provider, '')) = 'own'
    and public.order_packing_is_complete(o.id)
    and exists (
      select 1 from public.payments p
      where p.order_id = o.id and p.status = 'approved'
    );

  -- Revisão: own pending OU ocorrência cujo ÚLTIMO evento ≠ resolved (reaberta conta)
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

-- Extensão leve own_manual_reviews: ciclo em payload (sem quebrar check antigo)
comment on table public.own_manual_reviews is
  'Marcha 7: reviews manuais; ciclo detalhado preferir order_events ocorrências unificadas.';
