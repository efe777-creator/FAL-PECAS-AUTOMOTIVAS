-- O1-C: modelos de caixa / embalagem para cotação de frete
create table if not exists public.shipping_box_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  length_cm numeric(10,2) not null check (length_cm > 0),
  width_cm numeric(10,2) not null check (width_cm > 0),
  height_cm numeric(10,2) not null check (height_cm > 0),
  empty_weight_kg numeric(10,3) not null default 0 check (empty_weight_kg >= 0),
  max_weight_kg numeric(10,3) null check (max_weight_kg is null or max_weight_kg > 0),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shipping_box_templates_active_idx
  on public.shipping_box_templates (active, sort_order);

alter table public.shipping_box_templates enable row level security;

drop policy if exists shipping_box_templates_staff_all on public.shipping_box_templates;
create policy shipping_box_templates_staff_all
  on public.shipping_box_templates
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists shipping_box_templates_anon_read_active on public.shipping_box_templates;
create policy shipping_box_templates_anon_read_active
  on public.shipping_box_templates
  for select
  to anon, authenticated
  using (active = true);

-- Padrões de medida por categoria (fallback quando produto sem medida individual)
alter table public.product_categories
  add column if not exists default_weight_kg numeric(10,3) null,
  add column if not exists default_length_cm numeric(10,2) null,
  add column if not exists default_width_cm numeric(10,2) null,
  add column if not exists default_height_cm numeric(10,2) null;

comment on column public.product_categories.default_weight_kg is
  'Peso padrão (kg) para produtos da classificação sem medida individual.';
comment on table public.shipping_box_templates is
  'Caixas/embalagens padrão FAL para packing na cotação (O1-C).';
