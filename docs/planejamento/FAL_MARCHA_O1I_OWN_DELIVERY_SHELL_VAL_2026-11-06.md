# VAL — O1-I shell frete próprio (minuciosa)

**Data:** 2026-11-06  
**Auth:** MARCHA minuciosa  
**Item:** Quebrar frete próprio — Gerais / Veículos / Tarifas + helpers

## Entrega

| Peça | Papel |
|------|--------|
| `ownDeliveryHelpers` | `ensureOwnRateId`, `normalizeFlatRates`, labels (vitest) |
| `OwnDeliveryGeralTab` | Formulário controlado (estado na página) |
| `OwnDeliveryVehiclesTab` | CRUD veículos; `onCategoriesChange` → Produtos |
| `OwnDeliveryRatesTab` | Tarifas com load próprio |
| `AdminOwnDeliveryPage` | Shell ~799 → ~235 linhas |

## Critérios

- [x] Vitest helpers OK
- [x] `tsc --noEmit` OK
- [x] Sync categorias Veículos → Produtos via callback + ref (sem loop)
- [x] Save gerais ainda normaliza rates flat antes do upsert

## Residual O1-I

Detalhe de preços (~1.578) por arquivo de aba.
