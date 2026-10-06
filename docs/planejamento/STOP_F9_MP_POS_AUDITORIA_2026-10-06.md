# STOP — pós F9-C (antes F9-D)

**Data:** 2026-10-06  
**Status:** **F9-C DONE** (Pix UI + webhook mínimo)  
**Baseline main pré-PR:** `d851617`

## Feito

- Edge `mercado-pago-webhook` (x-signature HMAC, payment_events, amount check)
- RPC `confirm_mercadopago_payment` (service_role) → ciclo F7
- Checkout Pix quando `VITE_PAYMENT_PROVIDER=mercadopago` (QR + copia-e-cola + poll)
- Rejected/expired **não** cancelam pedido
- FE **não** marca pago

## Proibido até MARCHA F9-D

- Card Payment Brick / crédito / débito
- SDK `@mercadopago/sdk-react`
- Produção MP
- Commit de Access Token / webhook secret

## Humano (live)

1. Apply migration `20261006210000` (se não via MCP)
2. Secrets: `MP_ACCESS_TOKEN` + `MP_WEBHOOK_SECRET`
3. Deploy: `create-mp-payment` + `mercado-pago-webhook`
4. Webhook URL no DevPanel → `…/functions/v1/mercado-pago-webhook`
5. `.env`: `VITE_PAYMENT_PROVIDER=mercadopago`

## Próximo

`MARCHA F9-D` — Cartões (Brick).
