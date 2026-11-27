-- Fase 4 — lotes e itens de importação do mestre (não misturar com imports/import_items de PVC).

create table if not exists public.vehicle_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.vehicle_data_sources (id) on delete restrict,
  file_name text,
  content_hash text,
  status text not null default 'preview'
    check (status in (
      'preview', 'authorized', 'applying', 'completed', 'completed_with_errors', 'failed', 'cancelled'
    )),
  total_records int not null default 0,
  created_count int not null default 0,
  updated_count int not null default 0,
  unchanged_count int not null default 0,
  conflict_count int not null default 0,
  error_count int not null default 0,
  ambiguous_count int not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists vehicle_import_batches_source_idx
  on public.vehicle_import_batches (source_id, created_at desc);

create index if not exists vehicle_import_batches_hash_idx
  on public.vehicle_import_batches (content_hash)
  where content_hash is not null;

create table if not exists public.vehicle_import_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.vehicle_import_batches (id) on delete cascade,
  source_record_id uuid references public.vehicle_source_records (id) on delete set null,
  external_id text,
  proposed_entity_id uuid,
  operation text not null default 'preview'
    check (operation in (
      'create', 'enrich', 'unchanged', 'conflict', 'invalid', 'ambiguous', 'reject'
    )),
  processing_status text not null default 'pending'
    check (processing_status in (
      'pending', 'authorized', 'applied', 'skipped', 'error'
    )),
  validation_errors jsonb,
  conflict_details jsonb,
  payload_normalized jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists vehicle_import_items_batch_idx
  on public.vehicle_import_items (batch_id, operation);

-- FK opcional de source_records → batch (aditiva).
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'vehicle_source_records_batch_fk'
      and table_name = 'vehicle_source_records'
  ) then
    alter table public.vehicle_source_records
      add constraint vehicle_source_records_batch_fk
      foreign key (batch_id) references public.vehicle_import_batches (id) on delete set null;
  end if;
end $$;

alter table public.vehicle_import_batches enable row level security;
alter table public.vehicle_import_items enable row level security;

drop policy if exists vehicle_import_batches_staff_all on public.vehicle_import_batches;
create policy vehicle_import_batches_staff_all on public.vehicle_import_batches
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists vehicle_import_items_staff_all on public.vehicle_import_items;
create policy vehicle_import_items_staff_all on public.vehicle_import_items
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant select, insert, update, delete on public.vehicle_import_batches to authenticated, service_role;
grant select, insert, update, delete on public.vehicle_import_items to authenticated, service_role;
