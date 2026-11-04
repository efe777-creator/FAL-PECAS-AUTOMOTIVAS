# Edge `quote-shipping`

Cotação server-side. Secrets nunca no Vite.

## Providers

| `provider` body | Comportamento |
|-----------------|---------------|
| `melhorenvio` | `POST …/shipment/calculate` sandbox + insert `shipping_quotes` → opções `meq:<uuid>:<serviceId>` |
| `correios` | Esqueleto 501 até HTTP Correios |
| `frenet` / `carrier` | Reservado 501 |

## Secrets Melhor Envio

```
MELHOR_ENVIO_TOKEN=
MELHOR_ENVIO_USER_AGENT=FAL Pecas (email@dominio)
```

Base: `https://sandbox.melhorenvio.com.br`  
Origem: `store_shipping_origin.postal_code`

## Deploy

```bash
npx supabase functions deploy quote-shipping --linked
```

Requer migration `20261104192000_me_hybrid_shipping_quotes_place_order.sql` aplicada para persistir quotes.
