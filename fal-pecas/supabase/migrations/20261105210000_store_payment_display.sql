-- Onda 3 itens 11/12: texto de condições de pagamento na loja (cards/PDP).
-- Sem inventar política: default disabled até o admin ativar.

create table if not exists public.store_payment_display (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null default false,
  max_installments integer not null default 3
    check (max_installments >= 1 and max_installments <= 24),
  min_installment_amount numeric(12, 2) not null default 20
    check (min_installment_amount >= 0),
  interest_free boolean not null default true,
  show_on_cards boolean not null default true,
  show_on_pdp boolean not null default true,
  footnote text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists store_payment_display_singleton
  on public.store_payment_display ((true));

alter table public.store_payment_display enable row level security;

drop policy if exists store_payment_display_public_read on public.store_payment_display;
create policy store_payment_display_public_read on public.store_payment_display
  for select to anon, authenticated
  using (true);

drop policy if exists store_payment_display_staff_write on public.store_payment_display;
create policy store_payment_display_staff_write on public.store_payment_display
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on public.store_payment_display to anon, authenticated;
grant select, insert, update on public.store_payment_display to authenticated;

insert into public.store_payment_display (
  enabled, max_installments, min_installment_amount, interest_free, show_on_cards, show_on_pdp
)
select false, 3, 20, true, true, true
where not exists (select 1 from public.store_payment_display);
