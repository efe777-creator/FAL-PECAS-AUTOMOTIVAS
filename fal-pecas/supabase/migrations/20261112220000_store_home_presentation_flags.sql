-- HOME-07: flags de apresentação comercial (não alteram cálculo de preço).

alter table public.store_home_settings
  add column if not exists show_oferta_badge boolean not null default true,
  add column if not exists show_discount_percent boolean not null default true;

comment on column public.store_home_settings.show_oferta_badge is
  'HOME-07: exibir selo Oferta no card/PDP quando houver comparação válida.';
comment on column public.store_home_settings.show_discount_percent is
  'HOME-07: incluir % no selo Oferta quando desconto >= 1%.';
