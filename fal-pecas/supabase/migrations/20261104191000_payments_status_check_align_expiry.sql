-- M5: alinhar payments_status_check ao contrato F9A (inclui expired/created/…)
-- wtbp ainda tinha CHECK antigo: pending|approved|failed|cancelled
-- o que quebrava expire_unpaid_orders (status = 'expired').

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'payments_status_check'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments drop constraint payments_status_check;
  end if;

  alter table public.payments
    add constraint payments_status_check
    check (
      status in (
        'created',
        'pending',
        'approved',
        'rejected',
        'failed',
        'cancelled',
        'expired',
        'refunded'
      )
    );
end $$;

comment on column public.payments.status is
  'created|pending|approved|rejected|failed|cancelled|expired|refunded';
