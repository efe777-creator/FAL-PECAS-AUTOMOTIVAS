-- These tables are backend-only. Explicit deny policies document that intent,
-- keep service_role access (it bypasses RLS), and prevent accidental client use.

create policy "cached_plates_backend_only"
on public.cached_plates
for all
to anon, authenticated
using (false)
with check (false);

create policy "vehicle_aliases_backend_only"
on public.vehicle_aliases
for all
to anon, authenticated
using (false)
with check (false);

create policy "vehicle_resolution_events_backend_only"
on public.vehicle_resolution_events
for all
to anon, authenticated
using (false)
with check (false);
