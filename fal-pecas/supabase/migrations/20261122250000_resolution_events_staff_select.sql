-- Telemetria INV: staff SELECT (hub). Escrita continua só service_role / edge.
-- Não inventa mestre; só leitura de vehicle_resolution_events.

drop policy if exists "vehicle_resolution_events_backend_only"
  on public.vehicle_resolution_events;

create policy vehicle_resolution_events_staff_select
  on public.vehicle_resolution_events
  for select
  to authenticated
  using (public.is_staff());

grant select on public.vehicle_resolution_events to authenticated;

comment on policy vehicle_resolution_events_staff_select on public.vehicle_resolution_events is
  'Staff lê telemetria INV (catalog_total / cascas de lookup). Sem write client.';
