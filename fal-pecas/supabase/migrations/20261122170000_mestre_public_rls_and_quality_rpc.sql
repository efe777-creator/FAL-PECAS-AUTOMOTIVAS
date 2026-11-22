-- Fechamento mestre: RLS público só verified; RPC staff set_model_quality_status.

-- ---------------------------------------------------------------------------
-- RLS público
-- ---------------------------------------------------------------------------
drop policy if exists models_public_read on public.models;
create policy models_public_read on public.models
  for select using (
    status = 'active'
    and quality_status = 'verified'
  );

drop policy if exists vehicle_versions_public_read on public.vehicle_versions;
create policy vehicle_versions_public_read on public.vehicle_versions
  for select using (
    status = 'active'
    and exists (
      select 1
      from public.models mo
      where mo.id = vehicle_versions.model_id
        and mo.status = 'active'
        and mo.quality_status = 'verified'
    )
  );

comment on policy models_public_read on public.models is
  'Loja/anon: só modelos active+verified. Staff usa policies FOR ALL.';
comment on policy vehicle_versions_public_read on public.vehicle_versions is
  'Loja/anon: VV active só se o modelo pai for active+verified.';

-- ---------------------------------------------------------------------------
-- RPC: staff promove/rebaixa com evidência (sem auto-promote em writers)
-- ---------------------------------------------------------------------------
create or replace function public.set_model_quality_status(
  p_model_id uuid,
  p_quality_status text,
  p_evidence_kind text default null,
  p_evidence_url text default null,
  p_review_note text default null,
  p_canonical_model_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text := nullif(trim(both from coalesce(p_evidence_kind, '')), '');
  v_url text := nullif(trim(both from coalesce(p_evidence_url, '')), '');
  v_note text := nullif(trim(both from coalesce(p_review_note, '')), '');
  v_status text := lower(trim(both from coalesce(p_quality_status, '')));
  v_row public.models%rowtype;
begin
  if not public.is_staff() then
    raise exception 'not_staff' using errcode = '42501';
  end if;

  if v_status not in ('review', 'verified', 'quarantined', 'superseded') then
    raise exception 'invalid_quality_status' using errcode = 'P0001';
  end if;

  select * into v_row from public.models where id = p_model_id;
  if not found then
    raise exception 'model_not_found' using errcode = 'P0001';
  end if;

  if v_status = 'verified' then
    -- A1 OEM ou par A2 concordante — nunca plate/fipeX/LLM sozinho.
    if v_kind is null or v_kind not in ('oem_a1', 'a2_concordant') then
      raise exception 'verified_requires_a1_or_a2_pair' using errcode = 'P0001';
    end if;
    if v_url is null then
      raise exception 'verified_requires_evidence_url' using errcode = 'P0001';
    end if;
  end if;

  if v_status = 'superseded' then
    if p_canonical_model_id is null then
      raise exception 'superseded_requires_canonical' using errcode = 'P0001';
    end if;
    if p_canonical_model_id = p_model_id then
      raise exception 'canonical_cannot_be_self' using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from public.models c
      where c.id = p_canonical_model_id
        and c.status = 'active'
        and c.quality_status = 'verified'
    ) then
      raise exception 'canonical_must_be_verified_active' using errcode = 'P0001';
    end if;
  end if;

  update public.models
  set quality_status = v_status,
      evidence_kind = coalesce(v_kind, evidence_kind),
      evidence_url = coalesce(v_url, evidence_url),
      review_note = coalesce(v_note, review_note),
      canonical_model_id = case
        when v_status = 'superseded' then p_canonical_model_id
        when v_status = 'verified' then null
        else canonical_model_id
      end,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = p_model_id
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'qualityStatus', v_row.quality_status,
    'evidenceKind', v_row.evidence_kind,
    'evidenceUrl', v_row.evidence_url,
    'reviewNote', v_row.review_note,
    'canonicalModelId', v_row.canonical_model_id,
    'reviewedAt', v_row.reviewed_at
  );
end;
$$;

revoke all on function public.set_model_quality_status(uuid, text, text, text, text, uuid) from public;
grant execute on function public.set_model_quality_status(uuid, text, text, text, text, uuid) to authenticated;
grant execute on function public.set_model_quality_status(uuid, text, text, text, text, uuid) to service_role;

comment on function public.set_model_quality_status(uuid, text, text, text, text, uuid) is
  'Staff: altera quality_status com evidência. verified exige oem_a1|a2_concordant + URL.';
