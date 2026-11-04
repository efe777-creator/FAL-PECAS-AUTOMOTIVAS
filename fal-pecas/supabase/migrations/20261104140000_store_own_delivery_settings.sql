-- MARCHA_LOGISTICA_FRETE_PROPRIO: config editável (SP capital) sob D-FRETE B
-- Critérios de preço avançados = PENDÊNCIA do plano; aqui = tabela rates jsonb.

create table if not exists public.store_own_delivery_settings (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null default false,
  coverage_label text not null default 'São Paulo — capital',
  cep_ranges jsonb not null default '[{"from":"01000000","to":"05999999"}]'::jsonb,
  rates jsonb not null default '[
    {
      "id": "own:fal",
      "serviceCode": "fal_sp",
      "label": "Entrega FAL (SP capital)",
      "amount": 29.90,
      "etaDaysMin": 1,
      "etaDaysMax": 3
    }
  ]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists store_own_delivery_settings_singleton
  on public.store_own_delivery_settings ((true));

alter table public.store_own_delivery_settings enable row level security;

drop policy if exists store_own_delivery_settings_staff_select on public.store_own_delivery_settings;
create policy store_own_delivery_settings_staff_select on public.store_own_delivery_settings
  for select to authenticated using (public.is_staff());

drop policy if exists store_own_delivery_settings_staff_insert on public.store_own_delivery_settings;
create policy store_own_delivery_settings_staff_insert on public.store_own_delivery_settings
  for insert to authenticated with check (public.is_staff());

drop policy if exists store_own_delivery_settings_staff_update on public.store_own_delivery_settings;
create policy store_own_delivery_settings_staff_update on public.store_own_delivery_settings
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists store_own_delivery_settings_auth_read on public.store_own_delivery_settings;
create policy store_own_delivery_settings_auth_read on public.store_own_delivery_settings
  for select to authenticated using (true);

grant select on public.store_own_delivery_settings to authenticated;
grant insert, update on public.store_own_delivery_settings to authenticated;

insert into public.store_own_delivery_settings (enabled)
select false
where not exists (select 1 from public.store_own_delivery_settings);

-- CEP dentro das faixas da config (8 dígitos).
create or replace function public.own_delivery_cep_in_coverage(p_postal_code text)
returns boolean
language plpgsql
stable
as $$
declare
  v_digits text := regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g');
  v_ranges jsonb;
  r jsonb;
  v_from text;
  v_to text;
begin
  if length(v_digits) <> 8 then
    return false;
  end if;
  select cep_ranges into v_ranges
  from public.store_own_delivery_settings
  where enabled = true
  limit 1;
  if v_ranges is null then
    return false;
  end if;
  for r in select * from jsonb_array_elements(v_ranges)
  loop
    v_from := regexp_replace(coalesce(r->>'from', ''), '\D', '', 'g');
    v_to := regexp_replace(coalesce(r->>'to', ''), '\D', '', 'g');
    if length(v_from) = 8 and length(v_to) = 8
       and v_digits >= v_from and v_digits <= v_to then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

-- Extende resolve mock: opções own:* leem rates da config (place_order alinhado à UI).
create or replace function public.resolve_mock_shipping_option(
  p_option_id text,
  p_postal_code text
)
returns table (
  option_id text,
  provider text,
  service_code text,
  label text,
  amount numeric,
  eta_days_min int,
  eta_days_max int
)
language plpgsql
stable
as $$
declare
  v_surcharge numeric := public.mock_shipping_region_surcharge(p_postal_code);
  v_rate jsonb;
  v_enabled boolean;
begin
  if p_option_id like 'own:%' then
    select s.enabled,
           (
             select r
             from jsonb_array_elements(s.rates) r
             where r->>'id' = p_option_id
             limit 1
           )
      into v_enabled, v_rate
    from public.store_own_delivery_settings s
    limit 1;

    if v_enabled is not true or v_rate is null then
      raise exception 'Opção de frete próprio inválida ou desativada: %', p_option_id;
    end if;
    if not public.own_delivery_cep_in_coverage(p_postal_code) then
      raise exception 'CEP fora da cobertura do frete próprio FAL';
    end if;

    option_id := p_option_id;
    provider := 'own';
    service_code := coalesce(v_rate->>'serviceCode', 'fal_sp');
    label := coalesce(v_rate->>'label', 'Entrega FAL');
    amount := coalesce((v_rate->>'amount')::numeric, 0);
    eta_days_min := coalesce((v_rate->>'etaDaysMin')::int, 1);
    eta_days_max := coalesce((v_rate->>'etaDaysMax')::int, 3);
    return next;
    return;
  end if;

  if p_option_id = 'mock:economic' then
    option_id := 'mock:economic';
    provider := 'mock';
    service_code := 'economic';
    label := 'Entrega econômica';
    amount := 29.90 + v_surcharge;
    eta_days_min := 5;
    eta_days_max := 8;
    return next;
  elsif p_option_id = 'mock:express' then
    option_id := 'mock:express';
    provider := 'mock';
    service_code := 'express';
    label := 'Entrega expressa';
    amount := 49.90 + v_surcharge;
    eta_days_min := 2;
    eta_days_max := 4;
    return next;
  elsif p_option_id = 'mock:pickup' then
    option_id := 'mock:pickup';
    provider := 'mock';
    service_code := 'pickup';
    label := 'Retirada na loja';
    amount := 0;
    eta_days_min := 0;
    eta_days_max := 1;
    return next;
  else
    raise exception 'Opção de frete mock inválida: %', p_option_id;
  end if;
end;
$$;
