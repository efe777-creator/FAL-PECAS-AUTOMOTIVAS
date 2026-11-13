# MARCHA — Checklist smoke cartão PAY-01 / 09 / 10

**Data:** 2026-11-13  
**Auth:** eFe  
**Auditoria:** [FAL_AUDITORIA_PAY_CONSOLIDACAO_2026-11-13.md](./FAL_AUDITORIA_PAY_CONSOLIDACAO_2026-11-13.md)

## Pré-requisitos ops (humano)

| Check | OK? |
|-------|-----|
| `VITE_PAYMENT_PROVIDER=mercadopago` | |
| `VITE_MP_PUBLIC_KEY` e `MP_ACCESS_TOKEN` do **mesmo** app/ambiente | |
| Domínios do site cadastrados no app MP | |
| Webhook URL + `MP_WEBHOOK_SECRET` + topics payment | |
| Migration `20261113180000_store_payment_display_commercial` aplicada | |
| Edge `create-mp-payment` redeployada | |
| Home: cartão comercial ON; parcelamento conforme teste | |

## Casos

| ID | Caso | Esperado | Resultado |
|----|------|----------|-----------|
| PAY-01 | Cartão approved (valor baixo / cartão teste) | Pedido `pagamento_aprovado` → `em_analise`; UI confirma | |
| PAY-09 | Cartão rejected | Pedido permanece `aguardando_pagamento`; sem confirm RPC | |
| PAY-10 | Approved atualiza pedido | Status + payment `approved` coerentes | |
| P0 UI | Display/parcelamento off | Só 1x no select; Nx → 422 se forçar | |
| Sync | Pending → sync/webhook | Confirma sem duplicar | |

## Notas

- Pix prod já comprovado em marcha anterior; este checklist foca cartão.
- Sem PK/token alinhados, create falha com `Invalid card_token_id` — não é bug de UI.
