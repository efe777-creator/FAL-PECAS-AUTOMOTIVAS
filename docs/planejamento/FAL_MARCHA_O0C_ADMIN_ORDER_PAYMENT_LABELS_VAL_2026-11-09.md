# VAL — labels de pagamento no pedido admin

**Data:** 2026-11-09  
**Auth:** MARCHA (código local — sem commit/push)  
**Item:** O0-C — `AdminOrderDetailPage` § pagamento + `paymentMethodLabel`

## Entrega

- Status / provedor / meio via `paymentStatusLabel` / `paymentProviderLabel` / `paymentMethodLabel`
- “Código da cobrança” (sem “Ref MP”)
- Copy aguardando pagamento sem “gateway”
- Placeholder de estorno sem sigla MP

## Critérios

- [x] Vitest `paymentLabels.test.ts` PASS
- [x] `tsc --noEmit` OK

## Gate humano

Nenhum. Ship git sob demanda.
