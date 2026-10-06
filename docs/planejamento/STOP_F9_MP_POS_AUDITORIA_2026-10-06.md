# STOP — pós F9-D (antes F9-E)

**Data:** 2026-10-06  
**Status:** **F9-D DONE** (Card Payment Brick)  
**Baseline:** pós F9-C `1aef9b6`

## Feito

- `@mercadopago/sdk-react` + Card Payment Brick (sem PAN/CVV na FAL)
- `create-mp-payment` aceita token/paymentMethodId/installments (sem amount do FE)
- Checkout: Pix **ou** cartão quando `VITE_PAYMENT_PROVIDER=mercadopago`
- Approve continua só via webhook F9-C

## Proibido até MARCHA F9-E

- Refinos concurrency webhook / fora de ordem avançado
- Produção MP
- Commit de Access Token / Public Key real no git

## Humano

`VITE_MP_PUBLIC_KEY` (TEST) no `.env` + redeploy `create-mp-payment` se necessário.

## Próximo

`MARCHA F9-E` — webhook concurrency / hardening (ou F9-F/G conforme prioridade).
