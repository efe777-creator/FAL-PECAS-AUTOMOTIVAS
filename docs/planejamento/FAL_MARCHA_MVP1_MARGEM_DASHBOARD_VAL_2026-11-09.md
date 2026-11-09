# VAL — MARCHA Pacote MVP-1 · Margem / dashboard (033/034)

**Data:** 2026-11-09  
**Auth:** eFe — `MARCHA` (fatia G5–G7 indicadores)  
**AJUSTE:** 033 · 034  
**Plano:** [FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md](./FAL_PLANO_MVP_PRONTIDAO_2026-11-09.md)  
**Deploy:** só no **fim do dia**

---

## Contexto

Custo base (`product_base_costs`) e margem em listas de preço já existiam. Pedido admin não mostrava rentabilidade; dashboard não consolidava KPIs de relatórios.

## Entregas

| Item | Resultado |
|------|-----------|
| Bloco rentabilidade no detalhe do pedido (CMV est. + margem) | PASS |
| Custo/margem por linha de item | PASS |
| Faixa KPIs no dashboard (pagamento, filas, abertos, receita) | PASS |
| Helper puro + testes | PASS — 2 orderMargin + 8 pricing |

## Arquivos

- `fal-pecas/src/lib/orderMarginSummary.ts` (+ test)
- `fal-pecas/src/pages/admin/orders/AdminOrderDetailPage.tsx`
- `fal-pecas/src/pages/admin/AdminDashboardPage.tsx`

## Limitações aceitas (MVP)

- Custo = **atual** do cadastro (não snapshot na venda)
- Frete/taxas fora do CMV
- Receita entregue no dashboard só se `staff_can_view_reports_f8`

## STOP / próximo

Pacote MVP-1 código **quase fechado**. Restam sobretudo gates humanos: **014** frete homolog, smoke **017**/redeploy Edge, dados, deploy fim do dia.

**Assinatura:** VAL MVP-1 033/034 código PASS · 2026-11-09.
