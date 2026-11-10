-- FAL 028 — cache de consulta por placa (Edge plate-lookup)
-- Não expõe PII ao anon; escrita/leitura via service role na Edge.

create table if not exists public.cached_plates (
  plate text primary key,
  provider text not null default 'mock',
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cached_plates_expires_at_idx
  on public.cached_plates (expires_at);

comment on table public.cached_plates is
  'Cache server-side de lookup por placa (AJUSTE-028). Sem acesso público.';

alter table public.cached_plates enable row level security;

-- Sem policies para anon/authenticated: apenas service_role (bypass RLS).
revoke all on public.cached_plates from anon, authenticated;
grant select, insert, update, delete on public.cached_plates to service_role;
