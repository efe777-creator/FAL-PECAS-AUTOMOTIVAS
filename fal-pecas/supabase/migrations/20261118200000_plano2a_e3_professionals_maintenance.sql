-- PLANO 2A / Etapa 3: professional_profiles + trust + vínculos evento + manutenções.
-- Profissional NÃO ganha acesso automático à garagem (só vínculo explícito em eventos).

-- ---------------------------------------------------------------------------
-- 1) Especialidades (catálogo)
-- ---------------------------------------------------------------------------
create table if not exists public.professional_specialties (
  id text primary key,
  label text not null,
  sort_order integer not null default 0
);

insert into public.professional_specialties (id, label, sort_order) values
  ('mecanica_geral', 'Mecânica geral', 10),
  ('eletrica', 'Elétrica', 20),
  ('suspensao', 'Suspensão', 30),
  ('freios', 'Freios', 40),
  ('motor', 'Motor', 50),
  ('cambio', 'Câmbio', 60),
  ('funilaria', 'Funilaria / pintura', 70),
  ('ar_condicionado', 'Ar-condicionado', 80),
  ('diagnostico', 'Diagnóstico', 90),
  ('outro', 'Outro', 100)
on conflict (id) do nothing;

alter table public.professional_specialties enable row level security;

drop policy if exists ps_select_all on public.professional_specialties;
create policy ps_select_all on public.professional_specialties
  for select to authenticated
  using (true);

revoke all on public.professional_specialties from public;
grant select on public.professional_specialties to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Perfis profissionais (independentes; sem acesso auto)
-- ---------------------------------------------------------------------------
create table if not exists public.professional_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  fal_code text generated always as (
    'PROF-' || upper(substr(replace(id::text, '-', ''), 1, 8))
  ) stored,
  photo_url text,
  description text,
  region text,
  contact_phone text,
  contact_email text,
  contact_links jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  -- Trust 1–5 = critérios verificáveis (sem medalha):
  -- 1 cadastrado | 2 identidade confirmada | 3 docs analisados
  -- 4 atuação documentada | 5 histórico profissional FAL
  trust_level smallint not null default 1
    check (trust_level between 1 and 5),
  trust_note text,
  verification_state text not null default 'declarado'
    check (verification_state in (
      'declarado', 'identidade_confirmada', 'docs_analisados',
      'atuacao_documentada', 'historico_fal', 'contestado'
    )),
  created_by_customer_id uuid references public.customers (id) on delete set null,
  created_by_user_id uuid references auth.users (id) on delete set null,
  linked_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.professional_profiles is
  'PLANO 2A E3: profissionais independentes. Sem acesso automático à garagem.';

comment on column public.professional_profiles.trust_level is
  'Nível 1–5 por critérios verificáveis; declarado ≠ verificado.';

create index if not exists pp_created_by_idx
  on public.professional_profiles (created_by_customer_id);

create index if not exists pp_name_idx
  on public.professional_profiles (display_name);

alter table public.professional_profiles enable row level security;

-- Policies de select ampliada após criar vehicle_event_professionals (§4)
drop policy if exists pp_insert_customer on public.professional_profiles;
create policy pp_insert_customer on public.professional_profiles
  for insert to authenticated
  with check (
    public.is_staff()
    or (
      created_by_customer_id = public.current_customer_id()
      and trust_level = 1
      and verification_state = 'declarado'
    )
  );

drop policy if exists pp_update_owner on public.professional_profiles;
create policy pp_update_owner on public.professional_profiles
  for update to authenticated
  using (
    public.is_staff()
    or created_by_customer_id = public.current_customer_id()
  )
  with check (
    public.is_staff()
    or (
      created_by_customer_id = public.current_customer_id()
      and trust_level = 1
      and verification_state in ('declarado', 'contestado')
    )
  );

revoke all on public.professional_profiles from public;
grant select, insert, update on public.professional_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Especialidades M:N
-- ---------------------------------------------------------------------------
create table if not exists public.professional_profile_specialties (
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  specialty_id text not null references public.professional_specialties (id) on delete cascade,
  primary key (professional_id, specialty_id)
);

alter table public.professional_profile_specialties enable row level security;

drop policy if exists pps_select_related on public.professional_profile_specialties;
create policy pps_select_related on public.professional_profile_specialties
  for select to authenticated
  using (
    exists (
      select 1 from public.professional_profiles pp
      where pp.id = professional_profile_specialties.professional_id
    )
  );

drop policy if exists pps_write_owner on public.professional_profile_specialties;
create policy pps_write_owner on public.professional_profile_specialties
  for all to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.professional_profiles pp
      where pp.id = professional_profile_specialties.professional_id
        and pp.created_by_customer_id = public.current_customer_id()
    )
  )
  with check (
    public.is_staff()
    or exists (
      select 1 from public.professional_profiles pp
      where pp.id = professional_profile_specialties.professional_id
        and pp.created_by_customer_id = public.current_customer_id()
    )
  );

revoke all on public.professional_profile_specialties from public;
grant select, insert, delete on public.professional_profile_specialties to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Vínculo evento ↔ profissional (explícito; sem grant de garagem)
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_event_professionals (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.vehicle_events (id) on delete cascade,
  professional_id uuid not null references public.professional_profiles (id) on delete cascade,
  role text not null default 'executor'
    check (role in ('executor', 'consultor', 'oficina', 'outro')),
  note text,
  linked_by_customer_id uuid references public.customers (id) on delete set null,
  linked_at timestamptz not null default now(),
  unique (event_id, professional_id, role)
);

comment on table public.vehicle_event_professionals is
  'PLANO 2A E3: vínculo explícito. NÃO concede acesso à garagem.';

create index if not exists vep_professional_idx
  on public.vehicle_event_professionals (professional_id);

create index if not exists vep_event_idx
  on public.vehicle_event_professionals (event_id);

alter table public.vehicle_event_professionals enable row level security;

drop policy if exists vep_select_related on public.vehicle_event_professionals;
create policy vep_select_related on public.vehicle_event_professionals
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1
      from public.vehicle_events e
      join public.vehicle_ownership_periods p
        on p.vehicle_identity_id = e.vehicle_identity_id
      where e.id = vehicle_event_professionals.event_id
        and p.customer_id = public.current_customer_id()
    )
  );

drop policy if exists vep_insert_owner on public.vehicle_event_professionals;
create policy vep_insert_owner on public.vehicle_event_professionals
  for insert to authenticated
  with check (
    public.is_staff()
    or (
      linked_by_customer_id = public.current_customer_id()
      and exists (
        select 1
        from public.vehicle_events e
        join public.vehicle_ownership_periods p
          on p.vehicle_identity_id = e.vehicle_identity_id
        where e.id = vehicle_event_professionals.event_id
          and p.customer_id = public.current_customer_id()
          and p.ended_at is null
      )
    )
  );

revoke all on public.vehicle_event_professionals from public;
grant select, insert on public.vehicle_event_professionals to authenticated;

-- Select de profissionais: criador, linked user, staff, ou vínculo via evento visível
drop policy if exists pp_select_related on public.professional_profiles;
create policy pp_select_related on public.professional_profiles
  for select to authenticated
  using (
    public.is_staff()
    or created_by_customer_id = public.current_customer_id()
    or linked_user_id = auth.uid()
    or exists (
      select 1
      from public.vehicle_event_professionals vep
      join public.vehicle_events e on e.id = vep.event_id
      join public.vehicle_ownership_periods p
        on p.vehicle_identity_id = e.vehicle_identity_id
      where vep.professional_id = professional_profiles.id
        and p.customer_id = public.current_customer_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Manutenções estruturadas (criam vehicle_events)
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_maintenances (
  id uuid primary key default gen_random_uuid(),
  vehicle_identity_id uuid not null references public.vehicle_identities (id) on delete cascade,
  event_id uuid not null unique references public.vehicle_events (id) on delete cascade,
  maintenance_type text not null
    check (maintenance_type in (
      'preventiva', 'corretiva', 'preditiva', 'inspecao',
      'emergencia', 'instalacao', 'substituicao', 'modificacao'
    )),
  workshop_name text,
  cost_cents integer check (cost_cents is null or cost_cents >= 0),
  next_due_at timestamptz,
  next_due_km integer check (next_due_km is null or next_due_km >= 0),
  professional_id uuid references public.professional_profiles (id) on delete set null,
  created_by_customer_id uuid references public.customers (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.vehicle_maintenances is
  'PLANO 2A E3: manutenção estruturada; sempre amarrada a um vehicle_event.';

create index if not exists vm_identity_idx
  on public.vehicle_maintenances (vehicle_identity_id, created_at desc);

alter table public.vehicle_maintenances enable row level security;

drop policy if exists vm_select_related on public.vehicle_maintenances;
create policy vm_select_related on public.vehicle_maintenances
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.vehicle_ownership_periods p
      where p.vehicle_identity_id = vehicle_maintenances.vehicle_identity_id
        and p.customer_id = public.current_customer_id()
    )
  );

-- Inserts só via RPC append_vehicle_maintenance
revoke all on public.vehicle_maintenances from public;
grant select on public.vehicle_maintenances to authenticated;

-- ---------------------------------------------------------------------------
-- 6) RPC: criar profissional (trust=1 declarado; sem acesso garagem)
-- ---------------------------------------------------------------------------
create or replace function public.create_professional_profile(
  p_display_name text,
  p_description text default null,
  p_region text default null,
  p_contact_phone text default null,
  p_contact_email text default null,
  p_specialty_ids text[] default '{}'
)
returns public.professional_profiles
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer uuid := public.current_customer_id();
  v_row public.professional_profiles;
  v_sid text;
begin
  if v_customer is null then
    raise exception 'customer not found' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_display_name, '')), '') is null then
    raise exception 'display_name required' using errcode = '22023';
  end if;

  insert into public.professional_profiles (
    display_name, description, region, contact_phone, contact_email,
    created_by_customer_id, created_by_user_id, trust_level, verification_state
  ) values (
    trim(p_display_name),
    nullif(trim(coalesce(p_description, '')), ''),
    nullif(trim(coalesce(p_region, '')), ''),
    nullif(trim(coalesce(p_contact_phone, '')), ''),
    nullif(trim(coalesce(p_contact_email, '')), ''),
    v_customer, auth.uid(), 1, 'declarado'
  )
  returning * into v_row;

  if p_specialty_ids is not null then
    foreach v_sid in array p_specialty_ids loop
      if exists (select 1 from public.professional_specialties where id = v_sid) then
        insert into public.professional_profile_specialties (professional_id, specialty_id)
        values (v_row.id, v_sid)
        on conflict do nothing;
      end if;
    end loop;
  end if;

  return v_row;
end;
$$;

revoke all on function public.create_professional_profile from public;
grant execute on function public.create_professional_profile to authenticated;

-- ---------------------------------------------------------------------------
-- 7) RPC: registrar manutenção (+ evento + vínculo profissional opcional)
-- ---------------------------------------------------------------------------
create or replace function public.append_vehicle_maintenance(
  p_vehicle_identity_id uuid,
  p_maintenance_type text,
  p_title text,
  p_description text default null,
  p_occurred_at timestamptz default now(),
  p_odometer_km integer default null,
  p_create_odometer_record boolean default false,
  p_workshop_name text default null,
  p_cost_cents integer default null,
  p_next_due_at timestamptz default null,
  p_next_due_km integer default null,
  p_professional_id uuid default null
)
returns public.vehicle_maintenances
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer uuid := public.current_customer_id();
  v_period uuid;
  v_odo uuid;
  v_event public.vehicle_events;
  v_category text;
  v_maint public.vehicle_maintenances;
begin
  if v_customer is null then
    raise exception 'customer not found' using errcode = '42501';
  end if;

  if p_maintenance_type not in (
    'preventiva', 'corretiva', 'preditiva', 'inspecao',
    'emergencia', 'instalacao', 'substituicao', 'modificacao'
  ) then
    raise exception 'invalid maintenance_type' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_title, '')), '') is null then
    raise exception 'title required' using errcode = '22023';
  end if;

  select id into v_period
  from public.vehicle_ownership_periods
  where vehicle_identity_id = p_vehicle_identity_id
    and customer_id = v_customer
    and ended_at is null
  limit 1;

  if v_period is null then
    raise exception 'not current owner' using errcode = '42501';
  end if;

  -- Instalação/substituição/modificação/inspeção mapeiam categoria do evento;
  -- compra NUNCA cria instalação aqui.
  v_category := case p_maintenance_type
    when 'inspecao' then 'inspecao'
    when 'instalacao' then 'instalacao'
    when 'substituicao' then 'substituicao'
    when 'modificacao' then 'modificacao'
    when 'corretiva' then 'reparo'
    else 'manutencao'
  end;

  if p_create_odometer_record and p_odometer_km is not null then
    insert into public.vehicle_odometer_records (
      vehicle_identity_id, km, recorded_at, source,
      author_user_id, recording_customer_id
    ) values (
      p_vehicle_identity_id, p_odometer_km, coalesce(p_occurred_at, now()), 'customer',
      auth.uid(), v_customer
    )
    returning id into v_odo;
  end if;

  insert into public.vehicle_events (
    vehicle_identity_id, ownership_period_id, category, title, description,
    occurred_at, odometer_km, odometer_record_id,
    author_user_id, recording_customer_id, provenance, validation_state, origin_ref
  ) values (
    p_vehicle_identity_id, v_period, v_category, trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    coalesce(p_occurred_at, now()), p_odometer_km, v_odo,
    auth.uid(), v_customer, 'customer', 'declarado',
    jsonb_build_object('maintenance_type', p_maintenance_type)
  )
  returning * into v_event;

  insert into public.vehicle_maintenances (
    vehicle_identity_id, event_id, maintenance_type,
    workshop_name, cost_cents, next_due_at, next_due_km,
    professional_id, created_by_customer_id
  ) values (
    p_vehicle_identity_id, v_event.id, p_maintenance_type,
    nullif(trim(coalesce(p_workshop_name, '')), ''),
    p_cost_cents, p_next_due_at, p_next_due_km,
    p_professional_id, v_customer
  )
  returning * into v_maint;

  if p_professional_id is not null then
    insert into public.vehicle_event_professionals (
      event_id, professional_id, role, linked_by_customer_id
    ) values (
      v_event.id, p_professional_id, 'executor', v_customer
    )
    on conflict do nothing;
  end if;

  return v_maint;
end;
$$;

revoke all on function public.append_vehicle_maintenance from public;
grant execute on function public.append_vehicle_maintenance to authenticated;

-- ---------------------------------------------------------------------------
-- 8) RPC: vincular profissional a evento existente (sem grant de acesso)
-- ---------------------------------------------------------------------------
create or replace function public.link_event_professional(
  p_event_id uuid,
  p_professional_id uuid,
  p_role text default 'executor',
  p_note text default null
)
returns public.vehicle_event_professionals
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer uuid := public.current_customer_id();
  v_row public.vehicle_event_professionals;
begin
  if v_customer is null then
    raise exception 'customer not found' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.vehicle_events e
    join public.vehicle_ownership_periods p
      on p.vehicle_identity_id = e.vehicle_identity_id
    where e.id = p_event_id
      and p.customer_id = v_customer
      and p.ended_at is null
  ) and not public.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if not exists (select 1 from public.professional_profiles where id = p_professional_id) then
    raise exception 'professional not found' using errcode = 'P0002';
  end if;

  insert into public.vehicle_event_professionals (
    event_id, professional_id, role, note, linked_by_customer_id
  ) values (
    p_event_id, p_professional_id,
    coalesce(nullif(trim(p_role), ''), 'executor'),
    nullif(trim(coalesce(p_note, '')), ''),
    v_customer
  )
  on conflict (event_id, professional_id, role) do update
    set note = excluded.note
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.link_event_professional from public;
grant execute on function public.link_event_professional to authenticated;
