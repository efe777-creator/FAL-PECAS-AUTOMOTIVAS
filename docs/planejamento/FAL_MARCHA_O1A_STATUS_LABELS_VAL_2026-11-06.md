# VAL — O1-A mapas de status de pedido

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial plano  
**Item:** Mapas de status pedido (3) → um canônico admin + um cliente

## Entrega

| Peça | Papel |
|------|--------|
| `orderStatusAdminLabel` / `orderStatusOperatorLabel` | Mesma referência em `orderLifecycle.ts` |
| `adminOrderOps` | Reexporta o alias (sem cópia de Record) |
| `orderStatusLabel` | Mantido distinto (copy comercial conta) |

## Critérios

- [x] Sem segundo Record admin divergente em `adminOrderOps`
- [x] Vitest `orderStatusLabels.test.ts` OK
- [x] Inventário atualizado

## Gate humano

Nenhum.
