# VAL — O1-A consolidação “Retirar não pagos 48 h”

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial plano (inventário UI admin)  
**Item:** “Retirar não pagos 48h” ×3 → helper único

## Entrega

| Peça | Papel |
|------|--------|
| `fal-pecas/src/lib/adminExpireUnpaidFlow.ts` | Copy + diálogo + RPC + mensagem de resultado canônicos |
| Hub / Lista / Área | Passam a usar `confirmExpireUnpaidIntent` + `runExpireUnpaidOrders` + `formatExpireUnpaidMessage` |
| Inventário O1-A | Linha marcada **MANTER** |

## Critérios

- [x] Uma fonte de título/mensagem/`confirmLabel` (Área usa variante curta `detailed: false`)
- [x] Busy só após confirmação (não durante o diálogo)
- [x] Vitest `adminExpireUnpaidFlow.test.ts` OK
- [x] Sem `adminExpireUnpaidOrders` / `confirmDialog` duplicados nas 3 páginas de lista

## Gate humano

Nenhum — consolidação interna admin.
