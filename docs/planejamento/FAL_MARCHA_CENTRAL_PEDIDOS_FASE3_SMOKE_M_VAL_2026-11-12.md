# VAL — Fase 3 smoke M (staff browser)

**Data:** 2026-11-12  
**Auth:** eFe — MARCHA  
**Ambiente:** `localhost:5173` · Supabase remoto wtbpwuiayednvlhvuhbh

## Evidências principais

| Caso | Pedido / path | Nota |
|------|---------------|------|
| CEN-01 | `/admin/pedidos` | Indicadores 35 / R$130,12 · áreas coerentes |
| CEN-03 | `/visao/solicitacoes-cancelamento` | Vazio; só `pending` (rejected fora) |
| PAY-01 | `/aguardando-pagamento` | 3 linhas · status pagamento OK |
| SEP-01…03 | `66dd89ff-…` | confirmado → em_separacao → pronto_para_envio |
| PKG-01 / EVT-01 / ME wizard | `6eb61dd5-…` | packing + occurrence_opened · Frete ME |
| OWN-01/02 · TRK-01/02 | `66dd89ff` mock | ship `SMOKE-OWN-20261112` → `enviado` → `entregue` |
| PAY-02 | hub expire 48h | RPC OK · 0 elegíveis (<48h) · fila unpaid permanece 3 |
| ME-04 | `6eb61dd5` | carrinho ME · status ainda `pronto_para_envio` |
| ME-02 | `6eb61dd5` | Cotar → `quoted` R$11,15 → Preparar → `cart` (live) |

## Gate 3

**Ainda não** — bloqueio **H:** PAY-03 · ME-03 (compra).

Smoke **M** + ME-02: **feito**. Matriz: [FAL_MATRIZ_TESTES_CENTRAL_PEDIDOS_FASE3_2026-11-11.md](./FAL_MATRIZ_TESTES_CENTRAL_PEDIDOS_FASE3_2026-11-11.md)
