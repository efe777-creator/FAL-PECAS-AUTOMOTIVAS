# VAL — toast no modal de precificação do item

**Data:** 2026-11-09  
**Auth:** MARCHA (código local — sem commit/push nesta rodada)  
**Item:** O1-A — `PriceItemPricingModal`

## Entrega

- Validação (custo adicional, modo fixo, % inválido, preço) via `pushError` + toast
- Inline `error` mantido no modal
- `try/catch` em `onSave` para falha inesperada (pais já toastam sucesso)

## Critérios

- [x] `tsc --noEmit` OK
- [x] Sem alteração D-FRETE / secrets / cutover

## Gate humano

Nenhum. Ship git sob demanda do eFe.
