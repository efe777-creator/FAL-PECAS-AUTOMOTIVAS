-- Congela checkout_quote em shipments ME existentes (sem alterar shipping_amount).

update public.shipments s
set metadata =
  coalesce(s.metadata, '{}'::jsonb)
  || jsonb_build_object(
    'checkout_quote',
    jsonb_build_object(
      'label', s.metadata ->> 'label',
      'company', null,
      'service_id', nullif(s.metadata ->> 'service_id', '')::numeric,
      'service_code', s.metadata ->> 'service_code',
      'amount', coalesce(
        nullif(s.metadata ->> 'charged_shipping', '')::numeric,
        nullif(s.metadata #>> '{me,quoted_amount}', '')::numeric,
        s.amount
      ),
      'quote_id', s.metadata ->> 'quote_id',
      'volumes', coalesce(s.metadata -> 'volumes', s.metadata #> '{me,volumes}', '[]'::jsonb),
      'volume_count', 1,
      'total_weight_kg', null,
      'frozen_at', now()
    )
  )
where lower(coalesce(s.provider, '')) like 'melhorenvio%'
  and (s.metadata -> 'checkout_quote') is null;
