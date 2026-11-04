-- ============================================================================
-- SUPERSEDIDO por migrations/20261104192000_me_hybrid_shipping_quotes_place_order.sql
-- (RLS profile_id + place_order meq:). Manter só como histórico.
-- ============================================================================

-- 1) Comentário de contrato em shipments.metadata.me (documentação)
comment on column public.shipments.metadata is
  'JSON livre. Contrato Melhor Envio (sandbox): metadata.me = {
     label_state: none|quoted|cart|purchased|generated|printed,
     cart_item_id, protocol, tracking, label_url, service_id,
     label_amount, quoted_amount, volumes, last_error, checkout_snapshot_ref,
     dry_run, divergence: { chargedShipping, labelAmount, delta, blocked, reason }
   }. label_state NÃO é status comercial do pedido. ship_order/deliver_order permanecem RPCs separadas.';

-- 2) Ledger de webhooks ME (idempotência de eventos; sem auto-transição de pedido)
create table if not exists public.melhorenvio_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  event_type text not null,
  protocol text,
  payload_sanitized jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint melhorenvio_webhook_events_event_id_uidx unique (event_id)
);

alter table public.melhorenvio_webhook_events enable row level security;

drop policy if exists me_webhook_events_staff_select on public.melhorenvio_webhook_events;
create policy me_webhook_events_staff_select on public.melhorenvio_webhook_events
  for select to authenticated using (public.is_staff());

-- inserts via service_role (Edge webhook); sem grant a authenticated insert

comment on table public.melhorenvio_webhook_events is
  'Stub ledger Melhor Envio. Eventos NÃO disparam ship_order/deliver_order automaticamente nesta marcha.';

-- 3) shipping_quotes — só necessário se ativar path ME no checkout (NÃO default mock)
create table if not exists public.shipping_quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete set null,
  provider text not null,
  request_fingerprint text not null,
  postal_code text not null,
  options jsonb not null default '[]'::jsonb,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by_order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists shipping_quotes_fingerprint_idx
  on public.shipping_quotes (request_fingerprint, expires_at desc);

alter table public.shipping_quotes enable row level security;

drop policy if exists shipping_quotes_own_select on public.shipping_quotes;
create policy shipping_quotes_own_select on public.shipping_quotes
  for select to authenticated
  using (
    customer_id is null
    or customer_id in (select id from public.customers where user_id = auth.uid())
    or public.is_staff()
  );

comment on table public.shipping_quotes is
  'Cotações persistidas (path ME). TTL em expires_at impede consumo em place_order; snapshot do pedido preserva frete cobrado historicamente. Mock default da loja NÃO exige esta tabela.';

-- FIM PROPOSTA — aguardar autorização antes de mover para migrations/ e aplicar
