-- MARCHA UX frete próprio: ícone + km máx por veículo; adicional na tarifa
-- Fórmula atualizada: frete = max(km_ida * R$/km, tarifa_minima) + adicional

alter table public.own_vehicle_categories
  add column if not exists icon text not null default 'vehicle';
alter table public.own_vehicle_categories
  add column if not exists max_distance_km numeric(10, 2);

comment on column public.own_vehicle_categories.icon is
  'Identificador visual da modalidade (ex.: motorcycle, car, van, truck).';
comment on column public.own_vehicle_categories.max_distance_km is
  'Alcance máximo em km desta modalidade; null = usa max global das settings.';

alter table public.own_vehicle_tariffs
  add column if not exists adicional numeric(12, 2) not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'own_vehicle_tariffs_adicional_chk'
  ) then
    alter table public.own_vehicle_tariffs
      add constraint own_vehicle_tariffs_adicional_chk check (adicional >= 0);
  end if;
end $$;

update public.own_vehicle_categories set icon = 'motorcycle' where code = 'motorcycle' and (icon is null or icon = 'vehicle');
update public.own_vehicle_categories set icon = 'car' where code = 'car' and (icon is null or icon = 'vehicle');
