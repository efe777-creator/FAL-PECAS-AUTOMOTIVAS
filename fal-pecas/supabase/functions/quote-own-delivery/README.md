# quote-own-delivery

Cotação frete próprio v2 (POL → veículo → Google Routes ida → tarifa por categoria).

## Secrets

| Nome | Uso |
|------|-----|
| `GOOGLE_MAPS_API_KEY` | Routes API + geocode implícito por endereço |
| `SUPABASE_SERVICE_ROLE_KEY` | Persistência `shipping_quotes` / cache |

Nunca `VITE_*`.

## Respostas `status`

`priced` · `missing_number` · `out_of_coverage` · `ineligible` · `incomplete` · `manual_review` · `routing_error` · `disabled` · `flat_mode`

## Option id

`ownq:<quote_uuid>:<vehicle_code>` — consumido em `place_order`.
