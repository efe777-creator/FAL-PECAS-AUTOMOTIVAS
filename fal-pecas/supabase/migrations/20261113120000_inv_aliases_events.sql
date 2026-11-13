-- FAL INV Onda 1 — schema mínimo: aliases + telemetria
-- Não altera manufacturers/models/vehicle_versions/PVC schema.

create table if not exists public.vehicle_aliases (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('maker', 'model', 'version', 'engine')),
  maker_scope text,
  from_raw text not null,
  from_norm text not null,
  to_canonical text,
  status text not null default 'pending_validation'
    check (status in ('validated', 'pending_validation')),
  source_ref text,
  evidence_note text,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  validated_by text
);

create unique index if not exists vehicle_aliases_validated_uidx
  on public.vehicle_aliases (kind, coalesce(maker_scope, ''), from_norm)
  where status = 'validated';

create index if not exists vehicle_aliases_lookup_idx
  on public.vehicle_aliases (kind, from_norm)
  where status = 'validated';

comment on table public.vehicle_aliases is
  'INV: normalização textual. pending_validation nunca altera filtro.';

create table if not exists public.vehicle_resolution_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  status text not null,
  confidence_band text not null check (confidence_band in ('A', 'B', 'C', 'D')),
  rule_ids text[] not null default '{}',
  input_hash text,
  maker text,
  model text,
  year text,
  engine text,
  version text,
  vehicle_version_id uuid,
  customer_edited boolean,
  catalog_total integer
);

create index if not exists vehicle_resolution_events_created_idx
  on public.vehicle_resolution_events (created_at desc);

create index if not exists vehicle_resolution_events_status_band_idx
  on public.vehicle_resolution_events (status, confidence_band);

create index if not exists vehicle_resolution_events_zero_catalog_idx
  on public.vehicle_resolution_events (created_at desc)
  where catalog_total = 0;

comment on table public.vehicle_resolution_events is
  'INV: telemetria append-only (sem placa completa).';

alter table public.vehicle_aliases enable row level security;
alter table public.vehicle_resolution_events enable row level security;

revoke all on public.vehicle_aliases from anon, authenticated;
revoke all on public.vehicle_resolution_events from anon, authenticated;
grant select on public.vehicle_aliases to authenticated, service_role;
grant select, insert, update, delete on public.vehicle_aliases to service_role;
grant insert on public.vehicle_resolution_events to authenticated, service_role;
grant select, insert, update, delete on public.vehicle_resolution_events to service_role;

-- Seed aliases (idempotente via NOT EXISTS)
insert into public.vehicle_aliases (kind, maker_scope, from_raw, from_norm, to_canonical, status, source_ref, evidence_note, validated_at, validated_by)
select v.kind, v.maker_scope, v.from_raw, v.from_norm, v.to_canonical, v.status, v.source_ref, v.evidence_note,
       case when v.status = 'validated' then now() else null end,
       case when v.status = 'validated' then 'system' else null end
from (
  values
    ('maker', null::text, 'CHEV', 'chev', 'Chevrolet', 'validated', 'inv-onda1', 'API placas / DENATRAN'),
    ('maker', null, 'GM', 'gm', 'Chevrolet', 'validated', 'inv-onda1', 'alias comercial'),
    ('maker', null, 'VW', 'vw', 'Volkswagen', 'validated', 'inv-onda1', 'alias comercial'),
    ('engine', 'Fiat', '1,3', '13', '1.3', 'validated', 'inv-onda1', 'vírgula → ponto'),
    ('engine', 'Fiat', '1300', '1300', '1.3', 'validated', 'inv-onda1', 'cilindrada compacta'),
    ('engine', 'Fiat', 'FIREFLY', 'firefly', 'Firefly', 'validated', 'inv-onda1', 'família motor (Fire Fly / Fire-Fly)'),
    ('engine', 'Fiat', 'E.TORQ', 'etorq', 'E.torQ', 'validated', 'inv-onda1', 'família motor (E Torq / ETORQ)'),
    ('version', 'Fiat', 'DRIVE', 'drive', 'Drive', 'validated', 'inv-onda1', 'Argo comercial'),
    ('version', 'Fiat', 'TREKKING', 'trekking', 'Trekking', 'validated', 'inv-onda1', 'Argo comercial'),
    ('version', 'Fiat', 'HGT', 'hgt', 'HGT', 'validated', 'inv-onda1', 'Argo comercial'),
    ('version', 'Fiat', 'PRECISION', 'precision', 'Precision', 'validated', 'inv-onda1', 'Argo comercial'),
    ('version', 'Fiat', 'GSR', 'gsr', 'GSR', 'validated', 'inv-onda1', 'label versão comercial'),
    ('version', 'Fiat', 'OPENING EDITION', 'openingedition', 'Opening Edition', 'validated', 'inv-onda1', 'série especial'),
    ('version', null, 'INTENS', 'intens', 'Intense', 'validated', 'inv-onda1', 'Renault truncado'),
    ('version', null, 'JOYE', 'joye', 'Joy', 'validated', 'inv-onda1', 'Chevrolet truncado'),
    ('version', null, 'JOY', 'joy', 'Joy', 'validated', 'inv-onda1', 'Chevrolet'),
    ('version', 'Fiat', 'HL AP', 'hlap', null, 'pending_validation', 'inv-onda1', 'Preservar raw; sem equivalência validada')
) as v(kind, maker_scope, from_raw, from_norm, to_canonical, status, source_ref, evidence_note)
where not exists (
  select 1 from public.vehicle_aliases a
  where a.kind = v.kind
    and coalesce(a.maker_scope, '') = coalesce(v.maker_scope, '')
    and a.from_norm = v.from_norm
    and a.status = v.status
);
