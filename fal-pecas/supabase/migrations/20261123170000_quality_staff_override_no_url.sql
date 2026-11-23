-- Staff pode alterar qualidade sem URL A1 (operação na guia).
-- evidence_kind staff_override = override manual até API de mestre estável.
-- oem_a1 / a2_concordant + URL continuam válidos quando houver evidência formal.

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
    -- Formal: oem_a1 | a2_concordant (+ URL). Operacional: staff_override (sem URL)
    -- até a API de mestre assumir o cadastro.
    if v_kind is null then
      v_kind := 'staff_override';
    end if;
    if v_kind not in ('oem_a1', 'a2_concordant', 'staff_override', 'master_api') then
      raise exception 'verified_requires_known_evidence_kind' using errcode = 'P0001';
    end if;
    if v_kind in ('oem_a1', 'a2_concordant') and v_url is null then
      raise exception 'verified_requires_evidence_url' using errcode = 'P0001';
    end if;
  end if;

  if v_status = 'superseded' then
    if p_canonical_model_id is not null then
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
    -- Sem canonical: staff pode marcar superseded (nota) até API consolidar aliases.
  end if;

  update public.models
  set quality_status = v_status,
      evidence_kind = coalesce(v_kind, evidence_kind),
      evidence_url = case
        when v_url is not null then v_url
        when v_kind in ('staff_override', 'master_api') then null
        else evidence_url
      end,
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

comment on function public.set_model_quality_status(uuid, text, text, text, text, uuid) is
  'Staff: altera quality_status. verified aceita staff_override|master_api sem URL, ou oem_a1|a2_concordant + URL.';
