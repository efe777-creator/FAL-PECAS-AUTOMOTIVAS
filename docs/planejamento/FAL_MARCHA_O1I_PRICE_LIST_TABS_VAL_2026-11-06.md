# VAL — O1-I abas do detalhe de preços

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** Quebrar detalhe de preços (~1.578) por aba

## Entrega

| Peça | Papel |
|------|--------|
| `PriceListFormacaoTab` | Regra + ajuste global |
| `PriceListImportsTab` | Histórico / detalhe de import |
| `PriceListConfigTab` | Metadados da lista |
| `AdminPriceListDetailPage` | ~1.578 → ~1.347 (aba Produtos ainda na página) |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Estado e handlers permanecem na página (sem mudança de comportamento)

## Residual O1-I

Extrair aba Produtos (maior bloco restante).
