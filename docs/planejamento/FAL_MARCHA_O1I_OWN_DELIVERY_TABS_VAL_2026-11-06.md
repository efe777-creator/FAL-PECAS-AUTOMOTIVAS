# VAL — O1-I abas do frete próprio

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** Quebrar frete próprio (1.076 linhas) por aba

## Entrega

| Peça | Papel |
|------|--------|
| `OwnDeliveryProductsTab` | Capacidade POL + filtros |
| `OwnDeliveryManualTab` | Análise manual (load próprio) |
| `OwnDeliveryAuditTab` | Histórico (load próprio) |
| `AdminOwnDeliveryPage` | ~1.076 → ~799 linhas |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Abas Gerais / Veículos / Tarifas permanecem na página (próxima MARCHA)

## Residual O1-I

Extrair Gerais+Veículos+Tarifas; detalhe de preços (1.578) por arquivo de aba.
