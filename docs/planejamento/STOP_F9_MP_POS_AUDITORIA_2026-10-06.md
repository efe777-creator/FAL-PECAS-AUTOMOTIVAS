# STOP — pós F9-B conformidade (antes F9-C)

**Data:** 2026-10-06  
**Status:** **F9-B DONE** (core PR #6 + gap-close Prompt Mestre)

## Feito

- Edge `create-mp-payment` versionada
- Body FE só `orderId` (rejeita `amount`/`method`)
- Amount = `orders.total`; método server-side `pix`
- `X-Idempotency-Key` = `fal-pay-{paymentId}`
- Casos A–I com fetch mock (sem MP real no CI)
- Security scan documentado
- Checklist + relatório final (§23/§30)
- Pedido **não** aprovado automaticamente

## Proibido até MARCHA F9-C

- Webhook `mercado-pago-webhook`
- Pix QR UI / Card Brick no checkout
- Alterar `CheckoutPage` / `place_order` / ciclo F7
- Produção MP
- Commit de Access Token
- SDK `@mercadopago/sdk-react`

## Próximo

`MARCHA F9-C` — Pix (QR/copia-cola) + webhook mínimo → pending/approved.
