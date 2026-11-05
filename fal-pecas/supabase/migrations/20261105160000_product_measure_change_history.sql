-- P1-LOG-HIST / MARCHA_LOGISTICA_FILTROS_HISTORICO_MEDIDAS
-- Auditoria de alterações de medidas físicas + POL (trigger em products).

create table if not exists public.product_measure_change_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  changes jsonb not null default '{}'::jsonb,
  source text not null default 'manual'
    check (source in ('manual', 'bulk', 'system', 'seed')),
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists product_measure_change_history_product_created_idx
  on public.product_measure_change_history (product_id, created_at desc);

comment on table public.product_measure_change_history is
  'Histórico de alterações de medidas/POL do produto (P1-LOG-HIST).';

-- Coluna efêmera: app envia no mesmo UPDATE; BEFORE trigger lê e zera (PostgREST-safe).
alter table public.products
  add column if not exists measure_audit_source text
    check (
      measure_audit_source is null
      or measure_audit_source in ('manual', 'bulk', 'system', 'seed')
    );

comment on column public.products.measure_audit_source is
  'Efêmero: origem do próximo log de medidas; limpo pelo trigger BEFORE UPDATE.';

alter table public.product_measure_change_history enable row level security;

drop policy if exists product_measure_change_history_staff_select
  on public.product_measure_change_history;
create policy product_measure_change_history_staff_select
  on public.product_measure_change_history
  for select to authenticated
  using (public.is_staff());

drop policy if exists product_measure_change_history_staff_insert
  on public.product_measure_change_history;
create policy product_measure_change_history_staff_insert
  on public.product_measure_change_history
  for insert to authenticated
  with check (public.is_staff());

create or replace function public.products_measure_audit_before()
returns trigger
language plpgsql
as $$
begin
  if new.measure_audit_source is not null then
    perform set_config('fal.measure_source', new.measure_audit_source, true);
    new.measure_audit_source := null;
  end if;
  return new;
end;
$$;

drop trigger if exists products_measure_audit_before on public.products;
create trigger products_measure_audit_before
  before update on public.products
  for each row
  execute function public.products_measure_audit_before();

create or replace function public.log_product_measure_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes jsonb := '{}'::jsonb;
  v_source text := coalesce(nullif(current_setting('fal.measure_source', true), ''), 'manual');
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.weight_kg is distinct from new.weight_kg
     or old.weight_origin is distinct from new.weight_origin then
    v_changes := v_changes || jsonb_build_object(
      'weight_kg', jsonb_build_object(
        'old', old.weight_kg, 'new', new.weight_kg,
        'old_origin', old.weight_origin, 'new_origin', new.weight_origin
      )
    );
  end if;

  if old.height_cm is distinct from new.height_cm
     or old.height_origin is distinct from new.height_origin then
    v_changes := v_changes || jsonb_build_object(
      'height_cm', jsonb_build_object(
        'old', old.height_cm, 'new', new.height_cm,
        'old_origin', old.height_origin, 'new_origin', new.height_origin
      )
    );
  end if;

  if old.width_cm is distinct from new.width_cm
     or old.width_origin is distinct from new.width_origin then
    v_changes := v_changes || jsonb_build_object(
      'width_cm', jsonb_build_object(
        'old', old.width_cm, 'new', new.width_cm,
        'old_origin', old.width_origin, 'new_origin', new.width_origin
      )
    );
  end if;

  if old.length_cm is distinct from new.length_cm
     or old.length_origin is distinct from new.length_origin then
    v_changes := v_changes || jsonb_build_object(
      'length_cm', jsonb_build_object(
        'old', old.length_cm, 'new', new.length_cm,
        'old_origin', old.length_origin, 'new_origin', new.length_origin
      )
    );
  end if;

  if old.pol_unit is distinct from new.pol_unit
     or old.pol_origin is distinct from new.pol_origin then
    v_changes := v_changes || jsonb_build_object(
      'pol_unit', jsonb_build_object(
        'old', old.pol_unit, 'new', new.pol_unit,
        'old_origin', old.pol_origin, 'new_origin', new.pol_origin
      )
    );
  end if;

  if old.logistic_profile is distinct from new.logistic_profile
     or old.logistic_profile_origin is distinct from new.logistic_profile_origin then
    v_changes := v_changes || jsonb_build_object(
      'logistic_profile', jsonb_build_object(
        'old', old.logistic_profile, 'new', new.logistic_profile,
        'old_origin', old.logistic_profile_origin,
        'new_origin', new.logistic_profile_origin
      )
    );
  end if;

  if old.own_delivery_allowed is distinct from new.own_delivery_allowed then
    v_changes := v_changes || jsonb_build_object(
      'own_delivery_allowed', jsonb_build_object(
        'old', old.own_delivery_allowed, 'new', new.own_delivery_allowed
      )
    );
  end if;

  if v_changes <> '{}'::jsonb then
    insert into public.product_measure_change_history (
      product_id, changes, source, changed_by
    ) values (
      new.id,
      v_changes,
      case when v_source in ('manual', 'bulk', 'system', 'seed') then v_source else 'manual' end,
      auth.uid()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists products_log_measure_changes on public.products;
create trigger products_log_measure_changes
  after update on public.products
  for each row
  execute function public.log_product_measure_changes();

comment on function public.log_product_measure_changes() is
  'Grava histórico quando medidas/POL mudam. source via measure_audit_source no UPDATE.';
