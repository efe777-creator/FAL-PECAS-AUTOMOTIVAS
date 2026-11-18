-- PLANO 1 / G3: personalização (cor/notes) + assets + stock images + Storage privado.

-- 1) Colunas em customer_vehicles
alter table public.customer_vehicles
  add column if not exists color_hex text,
  add column if not exists color_label text,
  add column if not exists notes text,
  add column if not exists primary_asset_id uuid;

comment on column public.customer_vehicles.color_hex is 'Cor visual (#RRGGBB); não altera identidade técnica.';
comment on column public.customer_vehicles.color_label is 'Rótulo da cor (ex.: Prata).';
comment on column public.customer_vehicles.notes is 'Observações pessoais do cliente.';
comment on column public.customer_vehicles.primary_asset_id is 'FK lógica para capa pessoal em customer_vehicle_assets.';

-- 2) Galeria pessoal
create table if not exists public.customer_vehicle_assets (
  id uuid primary key default gen_random_uuid(),
  customer_vehicle_id uuid not null references public.customer_vehicles (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  mime text,
  byte_size integer,
  created_at timestamptz not null default now(),
  constraint customer_vehicle_assets_path_uniq unique (storage_path)
);

create index if not exists customer_vehicle_assets_vehicle_idx
  on public.customer_vehicle_assets (customer_vehicle_id, sort_order);

create index if not exists customer_vehicle_assets_customer_idx
  on public.customer_vehicle_assets (customer_id);

alter table public.customer_vehicles
  drop constraint if exists customer_vehicles_primary_asset_fk;

alter table public.customer_vehicles
  add constraint customer_vehicles_primary_asset_fk
  foreign key (primary_asset_id)
  references public.customer_vehicle_assets (id)
  on delete set null;

alter table public.customer_vehicle_assets enable row level security;

drop policy if exists cvehicle_assets_all_own on public.customer_vehicle_assets;
create policy cvehicle_assets_all_own on public.customer_vehicle_assets
  for all to authenticated
  using (customer_id = public.current_customer_id() or public.is_staff())
  with check (customer_id = public.current_customer_id() or public.is_staff());

grant select, insert, update, delete on public.customer_vehicle_assets to authenticated;

-- 3) Stock curado (admin)
create table if not exists public.vehicle_stock_images (
  id uuid primary key default gen_random_uuid(),
  maker text not null,
  model text not null,
  generation text,
  body_style text,
  year_from integer,
  year_to integer,
  match_level text not null check (match_level in ('exact', 'family', 'generic')),
  image_url text,
  storage_path text,
  confidence numeric(4,3) not null default 0.800
    check (confidence >= 0 and confidence <= 1),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists vehicle_stock_images_lookup_idx
  on public.vehicle_stock_images (lower(maker), lower(model), active);

alter table public.vehicle_stock_images enable row level security;

drop policy if exists vehicle_stock_images_public_read on public.vehicle_stock_images;
create policy vehicle_stock_images_public_read on public.vehicle_stock_images
  for select to anon, authenticated
  using (active = true);

drop policy if exists vehicle_stock_images_staff_write on public.vehicle_stock_images;
create policy vehicle_stock_images_staff_write on public.vehicle_stock_images
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on public.vehicle_stock_images to anon, authenticated;
grant insert, update, delete on public.vehicle_stock_images to authenticated;

-- 4) Bucket privado + policies (prefix = customer_id)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-vehicle-images',
  'customer-vehicle-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists cvehicle_images_select_own on storage.objects;
create policy cvehicle_images_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'customer-vehicle-images'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = public.current_customer_id()::text
    )
  );

drop policy if exists cvehicle_images_insert_own on storage.objects;
create policy cvehicle_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'customer-vehicle-images'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = public.current_customer_id()::text
    )
  );

drop policy if exists cvehicle_images_update_own on storage.objects;
create policy cvehicle_images_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'customer-vehicle-images'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = public.current_customer_id()::text
    )
  )
  with check (
    bucket_id = 'customer-vehicle-images'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = public.current_customer_id()::text
    )
  );

drop policy if exists cvehicle_images_delete_own on storage.objects;
create policy cvehicle_images_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'customer-vehicle-images'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = public.current_customer_id()::text
    )
  );
