# VAL — O1-I aba Produtos do detalhe de preços

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Item:** Extrair aba Produtos (último bloco UI do detalhe)

## Entrega

| Peça | Papel |
|------|--------|
| `PriceListProductsTab` | Filtros, seleção em massa, tabela, OriginBadge |
| `AdminPriceListDetailPage` | ~1.347 → ~1.061 linhas (shell + estado + handlers) |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Estado/filtros/handlers permanecem na página
- [x] Quatro abas agora em componentes dedicados

## Residual O1-I

Arquivos grandes restantes fora deste item (ex.: `AdminCategoriesPage` ~1.4k) — inventário / MARCHAs futuras.
