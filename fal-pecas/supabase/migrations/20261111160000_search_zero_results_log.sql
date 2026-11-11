-- Log mínimo de buscas sem resultado (monitor P2-3 / 3.10).
-- Insert via anon/authenticated; leitura admin (service / authenticated staff).

create table if not exists public.search_zero_results (
  id uuid primary key default gen_random_uuid(),
  q text,
  maker text,
  model text,
  year text,
  engine text,
  version text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists search_zero_results_created_idx
  on public.search_zero_results (created_at desc);

alter table public.search_zero_results enable row level security;

drop policy if exists search_zero_results_insert_public on public.search_zero_results;
create policy search_zero_results_insert_public
  on public.search_zero_results
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists search_zero_results_select_auth on public.search_zero_results;
create policy search_zero_results_select_auth
  on public.search_zero_results
  for select
  to authenticated
  using (true);

grant insert on public.search_zero_results to anon, authenticated;
grant select on public.search_zero_results to authenticated;
