-- Marcha 1b residual: mock/retirada leem prazos de store_shipping_eta_policy.

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
security definer
set search_path = public
as $$
declare
  v_cep text := regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g');
  v_first text;
  v_surcharge numeric := 0;
  v_settings public.store_own_delivery_settings%rowtype;
  v_rate jsonb;
  v_eta public.store_shipping_eta_policy%rowtype;
  v_econ_min int := 5;
  v_econ_max int := 8;
  v_exp_min int := 2;
  v_exp_max int := 4;
  v_pick_min int := 0;
  v_pick_max int := 1;
begin
  if p_option_id like 'own:%' and p_option_id not like 'ownq:%' then
    select * into v_settings from public.store_own_delivery_settings limit 1;
    if not found or v_settings.enabled is not true then
      raise exception 'Frete próprio desativado' using errcode = 'P0001';
    end if;
    if not public.own_delivery_cep_in_coverage(v_cep) then
      raise exception 'CEP fora da cobertura do frete próprio' using errcode = 'P0001';
    end if;
    select r into v_rate
    from jsonb_array_elements(coalesce(v_settings.rates, '[]'::jsonb)) r
    where r->>'id' = p_option_id
    limit 1;
    if v_rate is null then
      raise exception 'Modalidade frete próprio inválida: %', p_option_id using errcode = 'P0001';
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

  select * into v_eta from public.store_shipping_eta_policy limit 1;
  if found then
    v_econ_min := v_eta.mock_economic_min;
    v_econ_max := greatest(v_eta.mock_economic_min, v_eta.mock_economic_max);
    v_exp_min := v_eta.mock_express_min;
    v_exp_max := greatest(v_eta.mock_express_min, v_eta.mock_express_max);
    v_pick_min := v_eta.pickup_days_min;
    v_pick_max := greatest(v_eta.pickup_days_min, v_eta.pickup_days_max);
  end if;

  v_first := substr(v_cep, 1, 1);
  if v_first in ('4', '5', '6') then v_surcharge := 5;
  elsif v_first in ('7', '8', '9') then v_surcharge := 10;
  end if;

  if p_option_id = 'mock:economic' then
    option_id := p_option_id; provider := 'mock'; service_code := 'economic';
    label := 'Entrega econômica'; amount := 29.9 + v_surcharge;
    eta_days_min := v_econ_min; eta_days_max := v_econ_max; return next; return;
  elsif p_option_id = 'mock:express' then
    option_id := p_option_id; provider := 'mock'; service_code := 'express';
    label := 'Entrega expressa'; amount := 49.9 + v_surcharge;
    eta_days_min := v_exp_min; eta_days_max := v_exp_max; return next; return;
  elsif p_option_id = 'mock:pickup' then
    option_id := p_option_id; provider := 'mock'; service_code := 'pickup';
    label := 'Retirada na loja'; amount := 0;
    eta_days_min := v_pick_min; eta_days_max := v_pick_max; return next; return;
  end if;

  raise exception 'Opção de frete inválida: %', p_option_id using errcode = 'P0001';
end;
$$;

comment on function public.resolve_mock_shipping_option(text, text) is
  'Mock/retirada: prazos de store_shipping_eta_policy. own: flat legado. ownq: não passa aqui.';
