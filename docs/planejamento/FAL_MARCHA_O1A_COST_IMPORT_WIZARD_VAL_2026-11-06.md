# VAL — O1-A Import custo unificado no PriceImportWizard

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** Import custo wizard × página fornecedor

## Entrega

| Peça | Mudança |
|------|---------|
| `PriceImportWizard` | Props `initialSheetKind`, `lockSheetKind`, `costOnly` — fluxo só-custo sem lista/venda |
| `AdminSupplierCostImportPage` | Thin shell; reusa o mesmo assistente (rota clássica preservada) |
| Inventário | Item import custo → **MANTER** |

## Critérios

- [x] Rota `/admin/fornecedores/importar-custos` abre wizard já em custo, sem troca de tipo
- [x] `costOnly`: não exige lista; não sincroniza/recalcula venda
- [x] Fluxo listas (custo + lista + opções de venda) intacto
- [x] `tsc --noEmit` OK

## Gate humano

Nenhum.
