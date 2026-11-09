# VAL — labels de pagamento na conta do cliente

**Data:** 2026-11-09  
**Auth:** MARCHA (código local — sem commit/push)  
**Item:** O0-C — `AccountOrderDetailPage` + `paymentLabels`

## Entrega

- `paymentProviderLabel` + `paymentStatusLabel` no bloco Pagamento (sem `mercadopago · approved`)
- “Endereço de entrega” (sem “snapshot”)
- “Código da cobrança” (sem “Ref:”)
- Extra O0-C admin: hub/settings logística sem jargão “Manual”

## Critérios

- [x] Vitest `paymentLabels.test.ts` PASS
- [x] `tsc --noEmit` OK

## Gate humano

Nenhum. Ship git sob demanda.
