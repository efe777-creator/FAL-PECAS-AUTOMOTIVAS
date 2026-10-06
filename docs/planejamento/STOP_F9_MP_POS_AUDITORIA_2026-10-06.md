# STOP — pós F9-B (antes F9-C)

**Data:** 2026-10-06  
**main:** `06be4e4`

## Feito

F9-B: Edge `create-mp-payment` versionada; amount server-side; `X-Idempotency-Key`; não aprova pedido.

## Proibido até MARCHA F9-C

- Webhook `mercado-pago-webhook`
- Pix QR UI / Card Brick no checkout
- Alterar `CheckoutPage` / `place_order` / ciclo F7
- Produção MP
- Commit de Access Token

## Próximo

`MARCHA F9-C` — Pix (QR/copia-cola) + webhook mínimo → pending/approved.
