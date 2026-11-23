# VAL — FAL PAY híbrido: configs garantidas + smoke Hostinger

**Data:** 2026-11-23 · **Branch:** `dev` · Sem MAIN / G8  
**Auth:** eFe — MARCHA garantir configs  
**SoT regra:** PRD §6.2 · [`FAL_PAY_ARQUITETURA_HIBRIDA_ASAAS_MERCADO_PAGO.md`](./FAL_PAY_ARQUITETURA_HIBRIDA_ASAAS_MERCADO_PAGO.md)

## Decisão

| Regra | Valor |
|-------|--------|
| Pix ≤ R$ 201,00 (inclusive) | Mercado Pago |
| Pix > R$ 201,00 | Asaas |
| Cartão crédito/débito | Sempre Asaas |
| Pix R$ 30 no MP | **Correto** (não bug) |

## P0 — Configs garantidas (`payment_routing_config`)

Carimbo UPSERT 2026-11-23 15:23Z UTC:

| Campo | Valor | Status |
|-------|--------|--------|
| `pix_mp_max_amount_cents` | `20100` | **PASS** |
| `pix_below_limit_provider` | `mercadopago` | **PASS** |
| `pix_above_limit_provider` | `asaas` | **PASS** |
| `card_provider` | `asaas` | **PASS** |
| `boleto_provider` | `asaas` | **PASS** |
| `mercadopago_enabled` | `true` | **PASS** |
| `asaas_enabled` | `true` | **PASS** |
| `rule_version` | `fal-pay-hybrid-v1` | **PASS** |

`store_payment_display`: enabled + pix/credit/debit/card **true**.

## Secrets Edge (nomes)

`MP_ACCESS_TOKEN` · `MP_ENV` · `MP_WEBHOOK_SECRET` · `ASAAS_API_KEY` · `ASAAS_ENV` · `ASAAS_WEBHOOK_TOKEN` — **PASS** (presentes).

Webhook Asaas responde `401 invalid_webhook_token` sem token — Edge viva.

## Gates

| Gate | Resultado |
|------|-----------|
| `paymentRouter` + `falPayContract` + `paymentAntiregress` | **16/16 PASS** |
| Bundle Hostinger | `create-fal-payment` no chunk `engine-*` · `VITE_PAYMENT_PROVIDER=mercadopago` |

## Smoke create (sem settle)

| Caso | Resultado |
|------|-----------|
| Pix R$ 30 → `create-fal-payment` | **PASS** `provider=mercadopago` · QR Pix · `provider_payment_id` MP · depois `cancelled` |
| Pix R$ 250 → `create-fal-payment` | **PASS** `provider=asaas` · `provider_payment_id=pay_*` · `paymentUrl` · depois `cancelled` |
| Pix R$ 250 via `create-mp-payment` (bypass) | **PASS** `409 payment_route_mismatch` · `routedProvider=asaas` |
| Cartão | Histórico live Asaas + router força Asaas · UI `AsaasCardPanel` |

## Código / admin

- Antiregress: matriz `DEFAULT_PAYMENT_ROUTING_CONFIG` travada.
- Admin métodos: copy canônico (Pix 201 / cartão Asaas).

## Aceite eFe

- [x] Configs = canônicas  
- [x] R$ 30 no MP explicado e reconfirmado  
- [x] Pix > 201 Asaas create live (gap G3 fechado nesta MARCHA)  
- [x] Anti-bypass MP 409  
- [x] Cartão sempre Asaas (código + evidência histórica)

## Fora

G8 · boleto checkout · MAIN · mudar limite.
