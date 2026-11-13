-- Spec cotação carrinho §6.2: congelar checkout_quote no shipment na compra
-- (não só na 1ª ação ME label / backfill). Frete cobrado permanece em orders.shipping_amount.

create or replace function public.shipments_ensure_checkout_quote()
returns trigger
language plpgsql
as $$
declare
  v_vols jsonb;
  v_amount numeric;
  v_label text;
  v_company text;
  v_weight numeric;
begin
  if new.metadata is null then
    return new;
  end if;
  if new.metadata ? 'checkout_quote' then
    return new;
  end if;
  -- Só congela quando há cotação real (ME / own / charged)
  if not (
    new.metadata ? 'charged_shipping'
    or new.metadata ? 'volumes'
    or new.metadata ? 'own'
    or (new.metadata ? 'me')
  ) then
    return new;
  end if;

  v_vols := coalesce(
    new.metadata -> 'volumes',
    new.metadata #> '{me,volumes}',
    '[]'::jsonb
  );
  v_amount := coalesce(
    nullif(new.metadata ->> 'charged_shipping', '')::numeric,
    nullif(new.metadata #>> '{me,quoted_amount}', '')::numeric,
    new.amount
  );
  v_label := new.metadata ->> 'label';
  if v_label is not null and position('—' in v_label) > 0 then
    v_company := trim(split_part(v_label, '—', 1));
  elsif v_label is not null and position('-' in v_label) > 0 then
    v_company := trim(split_part(v_label, '-', 1));
  else
    v_company := null;
  end if;

  if jsonb_typeof(v_vols) = 'object' then
    v_weight := nullif(v_vols ->> 'weightKg', '')::numeric;
    if v_weight is null then
      v_weight := nullif(v_vols ->> 'weight_kg', '')::numeric;
    end if;
  end if;

  new.metadata := new.metadata || jsonb_build_object(
    'checkout_quote',
    jsonb_build_object(
      'label', v_label,
      'company', v_company,
      'service_id', nullif(new.metadata ->> 'service_id', '')::numeric,
      'service_code', new.metadata ->> 'service_code',
      'amount', v_amount,
      'quote_id', new.metadata ->> 'quote_id',
      'volumes', v_vols,
      'volume_count', case
        when jsonb_typeof(v_vols) = 'array' then jsonb_array_length(v_vols)
        when v_vols = '[]'::jsonb then 0
        else 1
      end,
      'total_weight_kg', v_weight,
      'frozen_at', now()
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_shipments_ensure_checkout_quote on public.shipments;
create trigger trg_shipments_ensure_checkout_quote
  before insert or update of metadata on public.shipments
  for each row
  execute function public.shipments_ensure_checkout_quote();

comment on function public.shipments_ensure_checkout_quote() is
  'Congela metadata.checkout_quote na inserção/atualização do shipment se ainda ausente (cotação ME/own).';

-- Backfill residual own (ME já coberto em 20261113161000)
update public.shipments s
set metadata = s.metadata
where (s.metadata -> 'checkout_quote') is null
  and (
    s.metadata ? 'charged_shipping'
    or s.metadata ? 'own'
    or lower(coalesce(s.provider, '')) like 'melhorenvio%'
  );
