-- Home Onda 1: vigência de campanhas, imagem mobile, quantidade de destaques administrável.

alter table public.store_home_banners
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists image_src_mobile text;

comment on column public.store_home_banners.starts_at is 'Início da vigência (null = imediato).';
comment on column public.store_home_banners.ends_at is 'Fim da vigência (null = sem encerramento).';
comment on column public.store_home_banners.image_src_mobile is 'Arte opcional para telas estreitas; fallback = image_src.';

drop policy if exists store_home_banners_public_read on public.store_home_banners;
create policy store_home_banners_public_read on public.store_home_banners
  for select to anon, authenticated
  using (
    active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create table if not exists public.store_home_settings (
  id uuid primary key default gen_random_uuid(),
  featured_display_limit integer not null default 16
    check (featured_display_limit >= 1 and featured_display_limit <= 48),
  updated_at timestamptz not null default now()
);

create unique index if not exists store_home_settings_singleton
  on public.store_home_settings ((true));

alter table public.store_home_settings enable row level security;

drop policy if exists store_home_settings_public_read on public.store_home_settings;
create policy store_home_settings_public_read on public.store_home_settings
  for select to anon, authenticated
  using (true);

drop policy if exists store_home_settings_staff_write on public.store_home_settings;
create policy store_home_settings_staff_write on public.store_home_settings
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on public.store_home_settings to anon, authenticated;
grant select, insert, update on public.store_home_settings to authenticated;

insert into public.store_home_settings (featured_display_limit)
select 16
where not exists (select 1 from public.store_home_settings limit 1);
