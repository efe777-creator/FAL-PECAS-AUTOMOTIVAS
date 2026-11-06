# VAL — O1-I campos comuns da regra de formação

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** Formação ×3 UIs → `PricingRuleFields`

## Entrega

| Peça | Papel |
|------|--------|
| `PricingRuleFields` | Select método + % + adicional custo % |
| `PriceListFormacaoTab` | Consome o componente |
| `AdminPriceListsPage` | Avançado criar/editar lista |
| `PriceItemPricingModal` | Label % via `pricingPercentInputLabel` |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Inventário atualizado
- [x] Modal item permanece fluxo por produto (não unificado em formulário de lista)

## Gate humano

Nenhum.
