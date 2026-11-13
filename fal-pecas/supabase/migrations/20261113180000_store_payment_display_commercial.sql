-- PAY consolidação: disponibilidade comercial + regras reais de parcelamento.
-- Home da Loja escreve; checkout/Edge consomem. Integração MP permanece em env/secrets.

alter table public.store_payment_display
  add column if not exists card_enabled boolean not null default true,
  add column if not exists pix_enabled boolean not null default true,
  add column if not exists installments_enabled boolean not null default false,
  add column if not exists interest_free_max integer not null default 0
    check (interest_free_max >= 0 and interest_free_max <= 24),
  add column if not exists allow_interest_installments boolean not null default true;

-- Migração de dados existentes:
-- installments_enabled ← enabled (P0: display off = só 1x)
-- interest_free=true → interest_free_max = max_installments
-- interest_free=false → interest_free_max = 0, allow_interest = true
update public.store_payment_display
set
  installments_enabled = enabled,
  interest_free_max = case
    when interest_free then greatest(1, least(max_installments, 24))
    else 0
  end,
  allow_interest_installments = case
    when interest_free then false
    else true
  end,
  updated_at = now()
where true;

comment on column public.store_payment_display.card_enabled is
  'Disponibilidade comercial do cartão (AND com integração MP).';
comment on column public.store_payment_display.pix_enabled is
  'Disponibilidade comercial do Pix (AND com integração MP).';
comment on column public.store_payment_display.installments_enabled is
  'Se false, checkout cartão só 1x.';
comment on column public.store_payment_display.interest_free_max is
  'Até Nx tratado como sem juros na política FAL.';
comment on column public.store_payment_display.allow_interest_installments is
  'Se false, não oferece parcelas com juros do gateway.';
