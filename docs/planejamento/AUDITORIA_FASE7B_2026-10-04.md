# Auditoria F7B — Recepção e confirmação

**Data:** 2026-10-04 · **Veredito:** APROVADA

## Entregue
- `/admin/pedidos` + `/admin/pedidos/:id` (não placeholder)
- Contadores reais (`admin_order_status_counts`) no dashboard e fila
- Availability por item + RPCs `set_order_item_availability` / `finalize_order_confirmation`
- Cancel só gerente/admin (`staff_can_cancel` na `transition_order_status`)
- Eventos append-only; preços = snapshot
- Build/TS OK

## Fora (etapas seguintes)
Separação checklist UI avançada já coberta em F7C; baixa estoque em F7F.
