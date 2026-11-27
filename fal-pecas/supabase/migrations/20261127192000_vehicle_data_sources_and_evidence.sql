-- Fase 3 — fontes, identificadores externos, registros e evidências de atributo.
-- Sem secrets. RLS: staff select/write; sem policy anon.

create table if not exists public.vehicle_data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider_type text not null
    check (provider_type in ('fipe', 'plate', 'fipex_csv', 'manual', 'catalog', 'other')),
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

insert into public.vehicle_data_sources (name, provider_type, description)
values
  ('FIPE', 'fipe', 'Catálogo FIPE via Parallelum'),
  ('API de placas', 'plate', 'Consulta de placa'),
  ('fipeX', 'fipex_csv', 'Importação CSV fipeX'),
  ('Manual', 'manual', 'Cadastro e confirmação administrativa')
on conflict (name) do nothing;

create table if not exists public.vehicle_external_identifiers (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.vehicle_data_sources (id) on delete cascade,
  manufacturer_id uuid references public.manufacturers (id) on delete cascade,
  model_id uuid references public.models (id) on delete cascade,
  vehicle_version_id uuid references public.vehicle_versions (id) on delete cascade,
  external_id text not null,
  external_parent_id text,
  external_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_external_identifiers_one_entity_chk check (
    (
      (manufacturer_id is not null)::int
      + (model_id is not null)::int
      + (vehicle_version_id is not null)::int
    ) = 1
  )
);

create unique index if not exists vehicle_ext_ids_maker_uidx
  on public.vehicle_external_identifiers (source_id, external_id)
  where manufacturer_id is not null;

create unique index if not exists vehicle_ext_ids_model_uidx
  on public.vehicle_external_identifiers (source_id, external_id)
  where model_id is not null;

create unique index if not exists vehicle_ext_ids_version_uidx
  on public.vehicle_external_identifiers (source_id, external_id)
  where vehicle_version_id is not null;

create table if not exists public.vehicle_source_records (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.vehicle_data_sources (id) on delete cascade,
  external_id text,
  payload jsonb not null default '{}'::jsonb,
  batch_id uuid,
  received_at timestamptz not null default now(),
  processing_status text not null default 'received'
    check (processing_status in (
      'received', 'normalized', 'matched', 'conflict', 'applied', 'error', 'skipped'
    )),
  processing_error text
);

create index if not exists vehicle_source_records_source_idx
  on public.vehicle_source_records (source_id, received_at desc);

create table if not exists public.vehicle_attribute_evidence (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.vehicle_data_sources (id) on delete cascade,
  source_record_id uuid references public.vehicle_source_records (id) on delete set null,
  model_id uuid references public.models (id) on delete cascade,
  vehicle_version_id uuid references public.vehicle_versions (id) on delete cascade,
  attribute_name text not null,
  attribute_value text not null,
  confidence text,
  validation_status text not null default 'received'
    check (validation_status in ('received', 'confirmed', 'in_review', 'rejected')),
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint vehicle_attribute_evidence_one_entity_chk check (
    (
      (model_id is not null)::int
      + (vehicle_version_id is not null)::int
    ) = 1
  )
);

create index if not exists vehicle_attribute_evidence_vv_idx
  on public.vehicle_attribute_evidence (vehicle_version_id, attribute_name);

create index if not exists vehicle_attribute_evidence_model_idx
  on public.vehicle_attribute_evidence (model_id, attribute_name);

alter table public.vehicle_data_sources enable row level security;
alter table public.vehicle_external_identifiers enable row level security;
alter table public.vehicle_source_records enable row level security;
alter table public.vehicle_attribute_evidence enable row level security;

drop policy if exists vehicle_data_sources_staff_all on public.vehicle_data_sources;
create policy vehicle_data_sources_staff_all on public.vehicle_data_sources
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists vehicle_external_identifiers_staff_all on public.vehicle_external_identifiers;
create policy vehicle_external_identifiers_staff_all on public.vehicle_external_identifiers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists vehicle_source_records_staff_all on public.vehicle_source_records;
create policy vehicle_source_records_staff_all on public.vehicle_source_records
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists vehicle_attribute_evidence_staff_all on public.vehicle_attribute_evidence;
create policy vehicle_attribute_evidence_staff_all on public.vehicle_attribute_evidence
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant select, insert, update, delete on public.vehicle_data_sources to authenticated, service_role;
grant select, insert, update, delete on public.vehicle_external_identifiers to authenticated, service_role;
grant select, insert, update, delete on public.vehicle_source_records to authenticated, service_role;
grant select, insert, update, delete on public.vehicle_attribute_evidence to authenticated, service_role;
