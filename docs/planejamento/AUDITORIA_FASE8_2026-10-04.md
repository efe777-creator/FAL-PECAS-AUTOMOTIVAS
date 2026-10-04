# Auditoria rápida — Fase 8 Fatia A

**Data:** 2026-10-04  
**Branch:** `plan`  
**Gate documental:** APROVADO  
**Status implementação:** concluída (fatia A)

## Escopo verificado

| Item | Resultado |
|------|-----------|
| `store_settings.inventory_mode` (3 modos) | OK — default `com_estoque` |
| `orders.inventory_mode_at_order` + backfill | OK (pedidos existentes = `com_estoque`) |
| `place_order` grava snapshot; reserva só se `com_estoque` | OK (remoto) |
| `release` / `fulfill` usam snapshot | OK (no-op se ≠ `com_estoque`) |
| Equivalência `com_estoque` ≈ F7 | OK por desenho (mesmo caminho de reserva/baixa quando modo/snapshot = `com_estoque`) |
| `adjust_inventory` + revoke UPDATE inventory | OK (`authenticated` sem UPDATE) |
| UI `/admin/estoque` | OK (smoke browser) |
| UI `/admin/clientes` | OK (smoke browser) |
| UI `/admin/relatorios` | OK (smoke browser) |
| Role `atendimento` sem permissões F8 novas | OK (helpers `staff_can_view_*_f8` / `staff_can_adjust_inventory`) |
| Import catálogo | Fora (F8.1) |
| Build | OK (`npm run build`) |

## Smoke UI (staff)

- `/admin/estoque` — modo “Com estoque (real)” + tabela de saldos  
- `/admin/clientes` — listagem (ex.: Fernando Felicio)  
- `/admin/relatorios` — totais + pedidos por status  

## Regressões

Não foram encontradas regressões evidentes no caminho `com_estoque` durante a auditoria rápida. Pedidos legados permanecem com snapshot `com_estoque`.

## Pendências / próximos

- Smoke de pedido completo em `estoque_ficticio` / `sem_estoque` (criar pedido e confirmar zero movimentos reserve/out) — recomendado em UAT  
- Commit/push da Fatia A quando autorizado  
- F8.1 import catálogo — futura  
