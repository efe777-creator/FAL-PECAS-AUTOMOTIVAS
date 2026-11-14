-- Crédito e débito comerciais separados (além de card_enabled legado).
alter table public.store_payment_display
  add column if not exists credit_enabled boolean not null default true,
  add column if not exists debit_enabled boolean not null default true;

comment on column public.store_payment_display.credit_enabled is
  'Disponibilizar cartão de crédito na loja (AND integração MP).';
comment on column public.store_payment_display.debit_enabled is
  'Disponibilizar cartão de débito na loja (AND integração MP).';

-- Backfill: se card_enabled estava off, desliga ambos.
update public.store_payment_display
set
  credit_enabled = coalesce(card_enabled, true),
  debit_enabled = coalesce(card_enabled, true)
where true;
