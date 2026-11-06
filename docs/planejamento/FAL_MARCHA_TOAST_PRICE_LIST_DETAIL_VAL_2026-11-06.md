# VAL — toast no detalhe da lista de preços

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** Toast admin → `AdminPriceListDetailPage`

## Entrega

- Erros (load, item, bulk, formação, ajuste, config) via `pushError` + toast
- Sucessos (item, precificação, remoção, bulk, regra, margem, ajuste, config) via `pushOk`
- Relatórios inline (`ruleReport` / `adjustReport` / `cfgReport`) mantidos

## Critérios

- [x] `tsc --noEmit` OK
- [x] Inventário atualizado

## Gate humano

Nenhum.
