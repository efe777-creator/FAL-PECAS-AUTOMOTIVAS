# VAL — Autorização cliente (opt-in operador) · 2026-11-12

## Pedido 6246e97b

| Campo | Valor |
|-------|--------|
| id | `6246e97b-8d7b-449a-9669-593b920d3b62` |
| Antes | `aguardando_decisao` + `customer_decision=pending` (auto por prazo `com_ressalva`) |
| Item | TDI0303 — depois já `disponivel` |
| Depois unstick | `em_analise` + `customer_decision=null` |

Hipótese **H1** confirmada: finalize antigo forçava auth por prazo.

## SQL aplicado (remoto wtbpwuiayednvlhvuhbh)

- `20261112195000_staff_customer_decision_opt_in.sql` (via `db query`)
- Unstick maintenance SQL

## Aceite

| Caso | Esperado | Status |
|------|----------|--------|
| Prazo sem solicitar → Finalizar | `confirmado` | código + RPC |
| Solicitar com motivo prazo/obs | `aguardando_decisao` | CTA admin |
| Retirar solicitação | `em_analise` | CTA + RPC |
| 6246e97b | fora do limbo | **PASS** em_analise |

## Front

- Admin: Solicitar confirmação / Retirar solicitação
- Cliente: motivo da loja no painel
- Copy orderLifecycle alinhada
