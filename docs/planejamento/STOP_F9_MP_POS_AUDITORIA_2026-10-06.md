# STOP — pós F9-A impl (antes F9-B)

**Data:** 2026-10-06  
**main:** `c03afd4`

## Feito

F9-A fundação: schema `payments` estendido, `payment_events`, RLS, secrets layout, apply linked.

## Proibido até MARCHA F9-B

- Edge `create-mp-payment` / `mercado-pago-webhook`
- `@mercadopago/sdk-react`
- Access Token em qualquer `VITE_*` ou commit
- Alterar `place_order` / ciclo F7 sem evidência
- Produção MP (F9-I)

## Próximo

`MARCHA F9-B` — cliente MP sandbox + create payment + idempotência.
