# VAL — toast frete próprio

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** Toast admin → `AdminOwnDeliveryPage`

## Entrega

| Peça | Mudança |
|------|---------|
| `reportOk` / `reportError` | Também disparam `useToast` |
| Gerais (salvar/load) | Toast sucesso/erro |
| Abas veículos/tarifas/produtos | Já usavam callbacks → passam a toastar |
| Manual / Histórico | `onError` → toast + banner |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Inventário atualizado

## Gate humano

Nenhum.
