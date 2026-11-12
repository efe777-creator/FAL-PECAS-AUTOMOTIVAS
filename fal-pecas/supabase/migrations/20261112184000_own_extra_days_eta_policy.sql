-- Tempo extra own + simplifica ME: me_buffer_days = tempo a mais sobre prazo real do carrier.

alter table public.store_shipping_eta_policy
  add column if not exists own_extra_days int not null default 0 check (own_extra_days >= 0);

-- Padrão: não somar prep; só tempo a mais (buffer).
update public.store_shipping_eta_policy
set
  me_prep_included_in_carrier = true,
  me_buffer_days = me_buffer_days + case when me_prep_included_in_carrier then 0 else me_prep_days end,
  me_prep_days = 0
where true;

comment on column public.store_shipping_eta_policy.me_buffer_days is
  'Tempo a mais (dias) sobre o prazo real da transportadora Melhor Envio.';
comment on column public.store_shipping_eta_policy.own_extra_days is
  'Tempo a mais (dias) sobre o prazo base do frete próprio (eta_days_min/max).';
