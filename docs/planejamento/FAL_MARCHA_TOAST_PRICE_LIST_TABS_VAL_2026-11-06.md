# VAL — toast abas Formação/Config (sem banner verde duplo)

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** Toast admin residual → detalhe lista de preços

## Entrega

| Peça | Mudança |
|------|---------|
| `PriceListFormacaoTab` | Remove `ruleReport` / `adjustReport` (`<p>` verde) |
| `PriceListConfigTab` | Remove `cfgReport` |
| `AdminPriceListDetailPage` | Só `pushOk`/`pushError` (já existiam) |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Inventário toast residual atualizado

## Gate humano

Nenhum.
