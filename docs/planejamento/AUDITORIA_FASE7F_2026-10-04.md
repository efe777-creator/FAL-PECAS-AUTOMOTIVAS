# Auditoria F7F — Estoque operacional

**Data:** 2026-10-04 · **Veredito:** APROVADA

- Cancel via `transition_order_status` chama `release_order_reservations` (lacuna F7A corrigida)
- Envio chama `fulfill_order_reservations` (baixa `out` + reduz reserved/on_hand) **antes** de mudar status
- Sem estoque negativo (UPDATE condicionado)
- `place_order` reserva preservada
