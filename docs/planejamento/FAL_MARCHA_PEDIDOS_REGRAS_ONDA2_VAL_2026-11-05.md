# VAL — M8 REGRAS-PEDIDOS-ONDA2

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA CORRIGIR E MARCHA SEQUENCIAL`  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Migration:** `20261105150000_order_cancellation_request_onda2.sql`

---

## Política provisória (estorno)

| Item | Decisão M8 |
|------|------------|
| Solicitação pós-pago | Cliente → `cancellation_request=pending` |
| Análise | Staff aprova (cancela) ou recusa |
| Estorno MP | **MANUAL** pelo operador no painel MP |
| Registro na FAL | `admin_mark_payment_refunded` após o refund |
| Auto-refund API | **Fora** desta marcha (pode virar auto depois) |

eFe pode trocar para estorno automático numa marcha futura sem mudar o fluxo de solicitação.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Colunas `cancellation_*` + RPCs `request_order_cancellation`, `admin_resolve_order_cancellation`, `admin_mark_payment_refunded` | **PASS** (SQL no repo) |
| 2 | UI cliente: Solicitar cancelamento (pago, pré-envio) | **PASS** (código) |
| 3 | UI admin: visão Solicitações + aprovar/recusar + marcar estorno | **PASS** (código) |
| 4 | `tsc -b` + teste visão cancelamento | **PASS** |
| 5 | Apply SQL wtbp | **PASS** — `db query --remote` wtbp 05/11 |

---

## Smoke (pós-deploy + SQL)

1. Pedido com payment `approved` (não enviado) → cliente Solicitar cancelamento.  
2. Admin → Pedidos → Solicitações de cancelamento → abrir → Aprovar.  
3. Status `cancelado`; payment ainda `approved`.  
4. Refund no MP → Marcar estorno feito → payment `refunded`.  
5. Alternativa: Recusar → pedido permanece no status anterior.

---

## STOP

Onda 2 **código fechado** com estorno manual.  
Próximo sequencial: apply SQL wtbp · Netlify · smoke · M10 (cartão) ou P1-LOG-HIST.

**Assinatura agente:** VAL M8 Onda2 2026-11-05.
