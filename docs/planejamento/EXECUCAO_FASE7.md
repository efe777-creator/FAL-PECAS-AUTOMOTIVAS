# Execução — Fase 7: Operação do pedido

**Data:** 2026-10-04  
**Spec:** [ESPECIFICACAO_FASE7_OPERACAO_PEDIDOS.md](./ESPECIFICACAO_FASE7_OPERACAO_PEDIDOS.md)  
**Auditoria final:** [AUDITORIA_FASE7_FINAL_2026-10-04.md](./AUDITORIA_FASE7_FINAL_2026-10-04.md)

---

## Pré-gate: Ajuste Global de preços

- [x] RPC atômica `adjust_price_list_items`
- [x] Client + preview; Lista Base reparada
- [x] [AUDITORIA_AJUSTE_GLOBAL_PRECOS_2026-10-04.md](./AUDITORIA_AJUSTE_GLOBAL_PRECOS_2026-10-04.md)

---

## Subfases

| Subfase | Status | Migrations / notas |
|---------|--------|---------------------|
| F7A | Concluída | `20261004040000_fase7a_*` |
| F7B | Concluída | `20261004110000_fase7b_*` — admin pedidos, availability, cancel gerente+ |
| F7C | Concluída | `20261004120000_fase7c_*` — `separated` + RPCs |
| F7D | Concluída | `20261004130000_fase7d_*` — `ship_order` |
| F7E | Concluída | `20261004140000_fase7e_*` — `deliver_order` |
| F7F | Concluída | `20261004150000_fase7f_*` — release cancel + fulfill envio |

---

## Frontend

- `AdminOrdersPage` / `AdminOrderDetailPage`
- `adminOrderService.ts`
- Dashboard com contadores reais
- Router: `/admin/pedidos`, `/admin/pedidos/:id`

## Push

Somente com autorização explícita.
