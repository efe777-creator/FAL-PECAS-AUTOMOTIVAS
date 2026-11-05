-- ME-C4/C5 · P-ME-3: catálogo admin Melhor Envio (allowlist + nomes + logo empresa)

create table if not exists public.me_shipping_services (
  service_id integer primary key,
  service_name text not null default '',
  company_id integer null,
  company_name text not null default '',
  company_picture text null,
  display_name text null,
  enabled boolean not null default false,
  sort_hint integer not null default 100,
  last_seen_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.me_shipping_services is
  'Catálogo ME: admin vê todos; loja só enabled. Logo/nome fantasia via company ME.';

create index if not exists me_shipping_services_enabled_idx
  on public.me_shipping_services (enabled)
  where enabled = true;

alter table public.me_shipping_services enable row level security;

drop policy if exists me_shipping_services_staff_all on public.me_shipping_services;
create policy me_shipping_services_staff_all on public.me_shipping_services
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Loja / Edge: leitura das linhas (filtro enabled no Edge; anon pode listar enabled se necessário)
drop policy if exists me_shipping_services_anon_read_enabled on public.me_shipping_services;
create policy me_shipping_services_anon_read_enabled on public.me_shipping_services
  for select to anon
  using (enabled = true);

drop policy if exists me_shipping_services_auth_read_enabled on public.me_shipping_services;
create policy me_shipping_services_auth_read_enabled on public.me_shipping_services
  for select to authenticated
  using (enabled = true or public.is_staff());

grant select on public.me_shipping_services to anon, authenticated;
grant insert, update, delete on public.me_shipping_services to authenticated;

-- Seed: PAC / SEDEX / Jadlog Package ligados; outros comuns conhecidos desligados
insert into public.me_shipping_services (
  service_id, service_name, company_name, enabled, sort_hint
) values
  (1,  'PAC',                   'Correios', true,  10),
  (2,  'SEDEX',                 'Correios', true,  20),
  (3,  '.Package',              'Jadlog',   true,  30),
  (4,  '.Com',                  'Jadlog',   false, 40),
  (15, 'Expresso',              'Buslog',   false, 50),
  (16, 'e-commerce',            'JeT',      false, 60),
  (17, 'Mini Envios',           'Correios', false, 70),
  (22, 'Rodoviário',            'LATAM Cargo', false, 80),
  (27, '.Package Centralizado', 'Jadlog',   false, 90),
  (31, 'Express',               'Loggi',    false, 100),
  (32, 'Coleta',                'Loggi',    false, 110),
  (33, 'Standard',              'JeT',      false, 120),
  (34, 'Loggi Ponto',           'Loggi',    false, 130),
  (35, 'Standard',              'LATAM Cargo', false, 140)
on conflict (service_id) do nothing;

-- Upsert em lote a partir de opções de cotação (staff / service role)
create or replace function public.upsert_me_shipping_services_from_options(p_options jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  o jsonb;
  v_sid integer;
  v_count integer := 0;
  v_company jsonb;
begin
  if not public.is_staff() then
    raise exception 'staff_required';
  end if;
  if p_options is null or jsonb_typeof(p_options) <> 'array' then
    return 0;
  end if;

  for o in select * from jsonb_array_elements(p_options)
  loop
    v_sid := nullif(o->>'service_id', '')::integer;
    if v_sid is null then
      v_sid := nullif(o->>'serviceId', '')::integer;
    end if;
    if v_sid is null and (o->>'id') ~ '^[0-9]+$' then
      v_sid := (o->>'id')::integer;
    end if;
    if v_sid is null then
      continue;
    end if;

    v_company := coalesce(o->'company', '{}'::jsonb);

    insert into public.me_shipping_services as t (
      service_id,
      service_name,
      company_id,
      company_name,
      company_picture,
      enabled,
      last_seen_at,
      updated_at
    ) values (
      v_sid,
      coalesce(nullif(o->>'name', ''), nullif(o->>'service_name', ''), 'Serviço ' || v_sid),
      nullif(v_company->>'id', '')::integer,
      coalesce(nullif(v_company->>'name', ''), ''),
      nullif(v_company->>'picture', ''),
      false,
      now(),
      now()
    )
    on conflict (service_id) do update set
      service_name = coalesce(nullif(excluded.service_name, ''), t.service_name),
      company_id = coalesce(excluded.company_id, t.company_id),
      company_name = case
        when excluded.company_name <> '' then excluded.company_name
        else t.company_name
      end,
      company_picture = coalesce(excluded.company_picture, t.company_picture),
      last_seen_at = now(),
      updated_at = now();

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.upsert_me_shipping_services_from_options(jsonb) from public;
grant execute on function public.upsert_me_shipping_services_from_options(jsonb) to authenticated;
