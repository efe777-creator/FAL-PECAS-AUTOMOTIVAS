# VAL — MARCHA correções e refinamentos checkout — 2026-11-12

## Escopo

| Item | Status |
| --- | --- |
| Pills 2 momentos — clique morto com cobrança aberta | **PASS** — lock + copy; `checkoutMoments.ts` |
| Voltar momento 0 ↔ pagamento (sem awaiting) | **PASS** — `targetStepForMoment` + testes |
| Public Key cartão (`isUsableMpPublicKey`) | **PASS** (marcha anterior) |
| Confirmação pedido com resumo (itens/total/status) | **PASS** — `OrderConfirmationPage` + `getMyOrderDetail` |
| Unit | **PASS** — `checkoutMoments` 4 + `mpAdminStatus` 4 |
| Build | **PASS** — `npm run build` |
| Netlify eFe | **deploy** `6af5ef702c137644c8d47ae7` |

## CHECKOUT-04

Fechado no plano AJUSTE-035: 2 momentos efetivos; steps 0–4 internos; sem pills 1–5 na UI.

## Residual (não desta onda)

- CP-PAY-021 webhook live secret  
- Smoke mid-Pix refresh em produção  
- Cobrança cartão `approved` com cartão real / TEST alinhado  
