-- ME híbrido D12: shipping_quotes + resolve meq: + place_order
-- RLS: customers.profile_id (NÃO user_id)
-- Apply controlado (sem db push cego). Secrets ME na Edge.

-- 1) shipping_quotes
create table if not exists public.shipping_quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete set null,
  provider text not null,
  request_fingerprint text not null,
  postal_code text not null,
  origin_postal_code text,
  options jsonb not null default '[]'::jsonb,
  volumes jsonb,
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
    or customer_id in (select id from public.customers where profile_id = auth.uid())
    or public.is_staff()
  );

comment on table public.shipping_quotes is
  'Cotações ME (path meq:). TTL expires_at; consumo atômico em place_order. Mock default não exige esta tabela.';

-- 2) Ledger webhook ME (stub)
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

comment on column public.shipments.metadata is
  'JSON. Contrato ME: metadata.me = { label_state: none|quoted|prepared|cart|purchased|generated|printed, ... }. label_state ≠ status do pedido.';

-- 3) Resolve opção meq:<quote_uuid>:<service_id>
create or replace function public.resolve_me_shipping_option(
  p_option_id text,
  p_customer_id uuid,
  p_postal_code text
)
returns table (
  option_id text,
  provider text,
  service_code text,
  label text,
  amount numeric,
  eta_days_min int,
  eta_days_max int,
  quote_id uuid,
  service_id int,
  volumes jsonb,
  option_meta jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parts text[];
  v_quote_id uuid;
  v_service_id int;
  v_quote public.shipping_quotes%rowtype;
  v_opt jsonb;
  v_cep text := regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g');
begin
  if p_option_id is null or p_option_id not like 'meq:%' then
    raise exception 'Opção Melhor Envio inválida: %', p_option_id using errcode = 'P0001';
  end if;
  v_parts := string_to_array(p_option_id, ':');
  if array_length(v_parts, 1) < 3 then
    raise exception 'Formato meq inválido: %', p_option_id using errcode = 'P0001';
  end if;
  begin
    v_quote_id := (v_parts[2])::uuid;
  exception when others then
    raise exception 'quote_id inválido em %', p_option_id using errcode = 'P0001';
  end;
  begin
    v_service_id := (v_parts[3])::int;
  exception when others then
    raise exception 'service_id inválido em %', p_option_id using errcode = 'P0001';
  end;

  select * into v_quote
  from public.shipping_quotes q
  where q.id = v_quote_id
  for update;

  if not found then
    raise exception 'Cotação Melhor Envio não encontrada' using errcode = 'P0001';
  end if;
  if v_quote.consumed_at is not null then
    raise exception 'Cotação Melhor Envio já consumida' using errcode = 'P0001';
  end if;
  if v_quote.expires_at <= now() then
    raise exception 'Cotação Melhor Envio expirada' using errcode = 'P0001';
  end if;
  if v_quote.customer_id is not null and v_quote.customer_id is distinct from p_customer_id then
    raise exception 'Cotação Melhor Envio de outro cliente' using errcode = 'P0001';
  end if;
  if regexp_replace(coalesce(v_quote.postal_code, ''), '\D', '', 'g') is distinct from v_cep then
    raise exception 'CEP da cotação não confere com o endereço' using errcode = 'P0001';
  end if;

  select o into v_opt
  from jsonb_array_elements(v_quote.options) o
  where (o->>'service_id')::int = v_service_id
  limit 1;

  if v_opt is null then
    raise exception 'Serviço % não está na cotação', v_service_id using errcode = 'P0001';
  end if;

  option_id := p_option_id;
  provider := 'melhorenvio';
  service_code := v_service_id::text;
  label := coalesce(v_opt->>'name', 'Melhor Envio');
  amount := coalesce((v_opt->>'amount')::numeric, 0);
  eta_days_min := coalesce((v_opt->>'eta_days_min')::int, 0);
  eta_days_max := coalesce((v_opt->>'eta_days_max')::int, 0);
  quote_id := v_quote.id;
  service_id := v_service_id;
  volumes := v_quote.volumes;
  option_meta := v_opt;
  return next;
end;
$$;

revoke all on function public.resolve_me_shipping_option(text, uuid, text) from public;
grant execute on function public.resolve_me_shipping_option(text, uuid, text) to authenticated;
grant execute on function public.resolve_me_shipping_option(text, uuid, text) to service_role;

-- 4) place_order: mock/own via resolve_mock; meq via resolve_me
create or replace function public.place_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_customer_id uuid;
  v_idempotency uuid;
  v_address_id uuid;
  v_shipping_option_id text;
  v_payment_method text;
  v_doc_kind text;
  v_doc_value text;
  v_existing_id uuid;
  v_existing_status text;
  v_existing_total numeric;
  v_addr record;
  v_ship record;
  v_me record;
  v_item jsonb;
  v_product_id uuid;
  v_qty int;
  v_prod record;
  v_avail int;
  v_unit numeric;
  v_price_list_id uuid;
  v_subtotal numeric := 0;
  v_shipping_amount numeric := 0;
  v_total numeric := 0;
  v_order_id uuid;
  v_payment_id uuid;
  v_cart_id uuid;
  v_items jsonb;
  v_address_snapshot jsonb;
  v_sku text;
  v_name text;
  v_resolved record;
  v_inv_mode text;
  v_track boolean;
  v_is_mp boolean;
  v_is_me boolean := false;
  v_ship_meta jsonb;
  v_consumed int := 0;
begin
  if v_uid is null then raise exception 'Não autenticado' using errcode = '42501'; end if;
  select c.id into v_customer_id from public.customers c where c.profile_id = v_uid;
  if v_customer_id is null then raise exception 'Cliente não encontrado' using errcode = 'P0001'; end if;
  v_idempotency := nullif(p_payload ->> 'idempotency_key', '')::uuid;
  if v_idempotency is null then raise exception 'idempotency_key obrigatória' using errcode = 'P0001'; end if;
  select o.id, o.status, o.total into v_existing_id, v_existing_status, v_existing_total
  from public.orders o
  where o.customer_id = v_customer_id and o.idempotency_key = v_idempotency;
  if v_existing_id is not null then
    return jsonb_build_object(
      'order_id', v_existing_id,
      'status', v_existing_status,
      'total', v_existing_total,
      'already_existed', true
    );
  end if;
  v_inv_mode := public.get_store_inventory_mode();
  v_track := (v_inv_mode = 'com_estoque');
  v_address_id := nullif(p_payload ->> 'address_id', '')::uuid;
  v_shipping_option_id := nullif(p_payload ->> 'shipping_option_id', '');
  v_payment_method := nullif(p_payload ->> 'payment_method', '');
  v_doc_kind := nullif(p_payload ->> 'document_kind', '');
  v_doc_value := regexp_replace(coalesce(p_payload ->> 'document_value', ''), '\D', '', 'g');
  if v_address_id is null then raise exception 'Endereço obrigatório' using errcode = 'P0001'; end if;
  if v_shipping_option_id is null then raise exception 'Opção de frete obrigatória' using errcode = 'P0001'; end if;
  if v_payment_method not in (
    'pix_simulated', 'card_simulated', 'pix', 'credit_card', 'debit_card'
  ) then
    raise exception 'Método de pagamento inválido' using errcode = 'P0001';
  end if;
  v_is_mp := v_payment_method in ('pix', 'credit_card', 'debit_card');
  if v_doc_kind = 'cpf' then
    if not public.is_valid_cpf(v_doc_value) then raise exception 'CPF inválido' using errcode = 'P0001'; end if;
    update public.customers set cpf = v_doc_value, cnpj = null where id = v_customer_id;
  elsif v_doc_kind = 'cnpj' then
    if not public.is_valid_cnpj(v_doc_value) then raise exception 'CNPJ inválido' using errcode = 'P0001'; end if;
    update public.customers set cnpj = v_doc_value, cpf = null where id = v_customer_id;
  else
    raise exception 'document_kind deve ser cpf ou cnpj' using errcode = 'P0001';
  end if;
  select * into v_addr
  from public.customer_addresses a
  where a.id = v_address_id and a.customer_id = v_customer_id;
  if not found then raise exception 'Endereço não encontrado' using errcode = 'P0001'; end if;

  if v_shipping_option_id like 'meq:%' then
    v_is_me := true;
    select * into v_me
    from public.resolve_me_shipping_option(v_shipping_option_id, v_customer_id, v_addr.postal_code);
    v_shipping_amount := v_me.amount;
    v_ship_meta := jsonb_build_object(
      'option_id', v_me.option_id,
      'service_code', v_me.service_code,
      'label', v_me.label,
      'eta_days_min', v_me.eta_days_min,
      'eta_days_max', v_me.eta_days_max,
      'quote_id', v_me.quote_id,
      'service_id', v_me.service_id,
      'volumes', v_me.volumes,
      'charged_shipping', v_me.amount,
      'me', jsonb_build_object(
        'label_state', 'quoted',
        'service_id', v_me.service_id,
        'quoted_amount', v_me.amount,
        'label_amount', v_me.amount,
        'volumes', v_me.volumes,
        'checkout_snapshot_ref', v_me.quote_id::text
      )
    );
  else
    select * into v_ship from public.resolve_mock_shipping_option(v_shipping_option_id, v_addr.postal_code);
    v_shipping_amount := v_ship.amount;
    v_ship_meta := jsonb_build_object(
      'option_id', v_ship.option_id,
      'service_code', v_ship.service_code,
      'label', v_ship.label,
      'eta_days_min', v_ship.eta_days_min,
      'eta_days_max', v_ship.eta_days_max
    );
  end if;

  v_address_snapshot := jsonb_build_object(
    'id', v_addr.id, 'recipient', v_addr.recipient, 'street', v_addr.street,
    'number', v_addr.number, 'complement', v_addr.complement, 'district', v_addr.district,
    'city', v_addr.city, 'state', v_addr.state, 'postal_code', v_addr.postal_code, 'label', v_addr.label
  );
  v_items := p_payload -> 'items';
  if v_items is null or jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    select c.id into v_cart_id from public.carts c where c.customer_id = v_customer_id;
    if v_cart_id is null then raise exception 'Carrinho vazio' using errcode = 'P0001'; end if;
    select coalesce(
      jsonb_agg(jsonb_build_object('product_id', ci.product_id, 'quantity', ci.quantity)),
      '[]'::jsonb
    )
    into v_items
    from public.cart_items ci
    where ci.cart_id = v_cart_id;
  end if;
  if v_items is null or jsonb_array_length(v_items) = 0 then
    raise exception 'Carrinho vazio' using errcode = 'P0001';
  end if;
  for v_item in select * from jsonb_array_elements(v_items) loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_qty := greatest(1, coalesce((v_item ->> 'quantity')::int, 0));
    if v_qty < 1 then raise exception 'Quantidade inválida' using errcode = 'P0001'; end if;
    select p.id, p.sku, p.name, p.status, p.is_available
    into v_prod
    from public.products p
    where p.id = v_product_id
    for update;
    if not found then raise exception 'Produto não encontrado' using errcode = 'P0001'; end if;
    if v_prod.status <> 'published' or v_prod.is_available is not true then
      raise exception 'Produto indisponível: %', v_prod.sku using errcode = 'P0001';
    end if;
    if v_track then
      select coalesce(i.quantity_on_hand, 0) - coalesce(i.quantity_reserved, 0)
      into v_avail
      from public.inventory i
      where i.product_id = v_product_id
      for update;
      if v_avail is null or v_avail < v_qty then
        raise exception 'Estoque insuficiente: %', v_prod.sku using errcode = 'P0001';
      end if;
    end if;
    select * into v_resolved from public.resolve_product_price(v_product_id, v_customer_id, now());
    v_unit := v_resolved.amount;
    v_subtotal := v_subtotal + (v_unit * v_qty);
  end loop;
  v_total := v_subtotal + v_shipping_amount;
  insert into public.orders (
    customer_id, status, subtotal, shipping_amount, total,
    address_snapshot, payment_ref, idempotency_key, inventory_mode_at_order
  )
  values (
    v_customer_id, 'aguardando_pagamento', v_subtotal, v_shipping_amount, v_total,
    v_address_snapshot, v_payment_method, v_idempotency, v_inv_mode
  )
  returning id into v_order_id;
  insert into public.order_status_history (order_id, status, note, changed_by)
  values (v_order_id, 'aguardando_pagamento', 'Pedido criado (ME híbrido / F9-F)', v_uid);
  for v_item in select * from jsonb_array_elements(v_items) loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_qty := greatest(1, coalesce((v_item ->> 'quantity')::int, 0));
    select p.sku, p.name into v_sku, v_name from public.products p where p.id = v_product_id;
    select * into v_resolved from public.resolve_product_price(v_product_id, v_customer_id, now());
    v_unit := v_resolved.amount;
    v_price_list_id := v_resolved.price_list_id;
    insert into public.order_items (
      order_id, product_id, sku, name_snapshot, unit_price, quantity, price_list_id
    )
    values (v_order_id, v_product_id, v_sku, v_name, v_unit, v_qty, v_price_list_id);
    if v_track then
      update public.inventory
      set quantity_reserved = quantity_reserved + v_qty, updated_at = now()
      where product_id = v_product_id;
      insert into public.inventory_movements (
        product_id, type, quantity, reason, order_id, user_id
      )
      values (v_product_id, 'reserve', v_qty, 'place_order', v_order_id, v_uid);
    end if;
  end loop;

  if v_is_me then
    update public.shipping_quotes
    set consumed_at = now(), consumed_by_order_id = v_order_id
    where id = v_me.quote_id and consumed_at is null;
    get diagnostics v_consumed = row_count;
    if v_consumed <> 1 then
      raise exception 'Falha ao consumir cotação Melhor Envio (concorrência)' using errcode = 'P0001';
    end if;
  end if;

  insert into public.shipments (order_id, provider, status, amount, metadata)
  values (
    v_order_id,
    case when v_is_me then 'melhorenvio' else v_ship.provider end,
    'pending',
    v_shipping_amount,
    v_ship_meta
  );
  if v_is_mp then
    insert into public.payments (order_id, provider, status, amount, method, metadata)
    values (
      v_order_id, 'mercadopago', 'pending', v_total, v_payment_method,
      jsonb_build_object('method', v_payment_method)
    )
    returning id into v_payment_id;
  else
    insert into public.payments (order_id, provider, status, amount, external_ref, metadata)
    values (
      v_order_id, 'simulated', 'pending', v_total,
      'sim-' || left(v_order_id::text, 8),
      jsonb_build_object('method', v_payment_method)
    )
    returning id into v_payment_id;
  end if;
  select c.id into v_cart_id from public.carts c where c.customer_id = v_customer_id;
  if v_cart_id is not null then delete from public.cart_items where cart_id = v_cart_id; end if;
  return jsonb_build_object(
    'order_id', v_order_id,
    'status', 'aguardando_pagamento',
    'total', v_total,
    'payment_id', v_payment_id,
    'already_existed', false,
    'inventory_mode_at_order', v_inv_mode
  );
end;
$function$;

comment on function public.place_order(jsonb) is
  'F9-F + ME híbrido: mock/own + meq:<quote>:<service>. Preço frete só server-side.';
