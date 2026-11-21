# FAL — VAL pós-venda (camada pedido)

**Data:** 2026-11-21  
**Branch:** `dev`  
**Commits:** `1c28e45` (F1) → `ccc92a4` (F2) → `0334ea2` (F3) → `3959967` (fechamento)

## Escopo

Validação da Spec D1–D18 sem deploy Netlify produção.  
E2E Melhor Envio com código real de devolução exige pedido ME + secrets produção — **ainda pendente humano**.

## Evidência automatizada (2026-11-21)

| Check | Resultado |
|-------|-----------|
| Vitest pós-venda (window, motives, chips, occurrences, eligibility, lifecycle, antiregress) | PASS |
| RPCs remotas: `customer_report_delivery_issue`, `admin_list_revisao_queue_rows`, `admin_post_sale_case_action`, `attach_me_return_code` | PRESENT (`wtbpwuiayednvlhvuhbh`) |
| Edge `melhorenvio-reverse` | ACTIVE v1 |
| Sem `orders.status = 'devolucao'` em migrations | PASS (grep) |
| Sem rota `/admin/pos-venda` | PASS |
| Webhook ME tracking-only (sem `deliver_order`) | PASS |
| Ida ME com `reverse: false`; reversa em Edge separada | PASS |
| Legal `/trocas-devolucoes` via `returnPolicyCopy` (versão `2026-11-21-f3`) | PASS |

## Checklist anti-erro (plano)

- [x] Confirm receipt ≠ T0 da janela (T0 = `delivered_at` FAL)
- [x] Caso aberto não expira só por calendário (`hasOpenPostSaleCase`)
- [x] Sem auto-`deliver_order`
- [x] Sem gerar código ME na abertura do caso (só após `autorizada` + CTA)
- [x] Sem `/admin/pos-venda` ou módulo isolado
- [x] Visão `problemas` ≠ RMA (`revisao-logistica` + chips)
- [x] Copy legal via `returnPolicyCopy`
- [x] Edge reversa separada da ida

## VAL manual restante

1. Pedido ME ida → entregue → report tipado → ops autoriza `me_codigo` → cliente **Gerar código** → `me_reverse` no evento + metadata shipment.  
2. Pedido frete próprio → autorizar só oferece `wa`/`loja`.  
3. Override SEDEX no authorize + generate.  
4. Conferência ok → Repor estoque + Marcar estorno (`approved` → `refunded`).

## Gate F3 → done (código)

**PASS** no código/`dev` + RPCs/Edge.  
**HOLD** no E2E ME real até item 1 da VAL manual.
