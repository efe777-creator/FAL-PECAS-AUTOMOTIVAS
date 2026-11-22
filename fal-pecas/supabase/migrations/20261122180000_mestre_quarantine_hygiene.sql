-- Higiene pós-fechamento: duplicata Crossfox → superseded; fora de escopo inactive.

-- Crossfox (legado one-word) → canônico Cross Fox verified
update public.models mo
set quality_status = 'superseded',
    canonical_model_id = '522cdb6b-0f7e-4b24-be00-3c3f62befa23',
    status = 'inactive',
    evidence_kind = coalesce(mo.evidence_kind, 'oem_a1'),
    review_note = coalesce(
      nullif(trim(mo.review_note), ''),
      'Duplicata ortográfica Crossfox → Cross Fox'
    ),
    reviewed_at = now()
where mo.id = '026dd2ab-660b-4f14-8163-f749e075fab1'
  and mo.quality_status = 'quarantined'
  and exists (
    select 1 from public.models c
    where c.id = '522cdb6b-0f7e-4b24-be00-3c3f62befa23'
      and c.status = 'active'
      and c.quality_status = 'verified'
  );

-- Fora do escopo carro/utilitário: manter quarantined e garantir inactive
update public.models
set status = 'inactive',
    reviewed_at = now(),
    review_note = coalesce(
      nullif(trim(review_note), ''),
      'Fora do escopo — inactive'
    )
where quality_status = 'quarantined'
  and status = 'active'
  and (
    review_note ilike '%fora do escopo%'
    or review_note ilike '%trailer%'
    or review_note ilike '%moto%'
  );
