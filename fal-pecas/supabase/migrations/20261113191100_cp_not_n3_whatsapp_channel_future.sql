-- CP-NOT N3 WhatsApp: reserva de canal (OFF). Sem envio. MARCHA FUTURO eFe 2026-11-13.

create table if not exists public.notification_channel_config (
  channel text primary key check (channel in ('in_app', 'whatsapp', 'email', 'push')),
  enabled boolean not null default false,
  provider text null,
  notes text null,
  updated_at timestamptz not null default now()
);

comment on table public.notification_channel_config is
  'CP-NOT: liga/desliga canal. whatsapp/email ficam false até MARCHA N3/N4.';

alter table public.notification_channel_config enable row level security;

drop policy if exists notification_channel_config_select_auth on public.notification_channel_config;
create policy notification_channel_config_select_auth
  on public.notification_channel_config
  for select to authenticated
  using (true);

revoke insert, update, delete on public.notification_channel_config from authenticated, anon;
grant select on public.notification_channel_config to authenticated;

insert into public.notification_channel_config (channel, enabled, provider, notes) values
  ('in_app', true, 'app_notifications', 'N1/N2 ativo'),
  ('whatsapp', false, null, 'N3 FUTURO — FAL_SPEC_NOTIFICACOES_WHATSAPP_FUTURO_2026-11-13; wa.me manual não usa esta flag'),
  ('email', false, null, 'N4 futuro'),
  ('push', false, null, 'Fora do escopo CP-NOT atual')
on conflict (channel) do update set
  notes = excluded.notes,
  updated_at = now();

-- Catálogo: kinds críticos do cliente passam a listar whatsapp como canal *previsto*
-- (envio só quando notification_channel_config.whatsapp.enabled = true na N3).
update public.notification_kind_catalog
set
  channels = array['in_app', 'whatsapp']::text[],
  updated_at = now()
where kind in (
  'payment_approved',
  'payment_failed',
  'order_awaiting_decision',
  'staff_requested_customer_decision',
  'order_shipped',
  'shipment_tracking_updated',
  'order_delivered',
  'pickup_authorized',
  'order_cancelled',
  'cancellation_approved',
  'cancellation_rejected'
)
and enabled = true;
