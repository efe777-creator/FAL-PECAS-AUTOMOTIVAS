-- Fase 1 — atributos técnicos anuláveis em vehicle_versions.
-- Sem backfill, sem índice único novo, sem alterar fuel / chave natural / PVC.
-- Rollback: DROP COLUMN das seis colunas (ordem inversa).

alter table public.vehicle_versions
  add column if not exists transmission text null;

alter table public.vehicle_versions
  add column if not exists transmission_detail text null;

alter table public.vehicle_versions
  add column if not exists traction text null;

alter table public.vehicle_versions
  add column if not exists traction_detail text null;

alter table public.vehicle_versions
  add column if not exists body_configuration text null;

alter table public.vehicle_versions
  add column if not exists vehicle_class text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vehicle_versions_transmission_chk'
  ) then
    alter table public.vehicle_versions
      add constraint vehicle_versions_transmission_chk
      check (
        transmission is null
        or transmission in ('manual', 'automatica', 'automatizada')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'vehicle_versions_transmission_detail_chk'
  ) then
    alter table public.vehicle_versions
      add constraint vehicle_versions_transmission_detail_chk
      check (
        transmission_detail is null
        or transmission_detail in ('cvt', 'at', 'amt')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'vehicle_versions_traction_chk'
  ) then
    alter table public.vehicle_versions
      add constraint vehicle_versions_traction_chk
      check (
        traction is null
        or traction in ('4x2', '4x4', 'awd')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'vehicle_versions_traction_detail_chk'
  ) then
    alter table public.vehicle_versions
      add constraint vehicle_versions_traction_detail_chk
      check (
        traction_detail is null
        or traction_detail in ('dianteira', 'traseira')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'vehicle_versions_body_configuration_chk'
  ) then
    alter table public.vehicle_versions
      add constraint vehicle_versions_body_configuration_chk
      check (
        body_configuration is null
        or body_configuration in (
          'hatch',
          'sedan',
          'perua',
          'cabine_simples',
          'cabine_estendida',
          'cabine_dupla',
          'furgao',
          'chassi',
          'picape'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'vehicle_versions_vehicle_class_chk'
  ) then
    alter table public.vehicle_versions
      add constraint vehicle_versions_vehicle_class_chk
      check (
        vehicle_class is null
        or vehicle_class in ('car', 'light_utility', 'motorcycle', 'trailer', 'unknown')
      );
  end if;
end $$;

comment on column public.vehicle_versions.transmission is
  'Categoria: manual|automatica|automatizada. NULL = não informado.';
comment on column public.vehicle_versions.transmission_detail is
  'Subtipo: cvt|at|amt. NULL quando a fonte só informou a categoria.';
comment on column public.vehicle_versions.traction is
  'Categoria: 4x2|4x4|awd. NULL = não informado.';
comment on column public.vehicle_versions.traction_detail is
  'Detalhe: dianteira|traseira. NULL quando a fonte só informou 4x2/4x4/awd.';
comment on column public.vehicle_versions.body_configuration is
  'Configuração física (hatch, sedan, cabine_*, furgao, …). NULL = não informado.';
comment on column public.vehicle_versions.vehicle_class is
  'Override da classe da linha (models.vehicle_class). NULL = herda o modelo.';
