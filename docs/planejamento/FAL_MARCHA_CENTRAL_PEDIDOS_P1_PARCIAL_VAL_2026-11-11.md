# VAL — P1 parcial Central (CEN-011 · OWN-ME · CAN-POST)

**Data:** 2026-11-11  
**Auth:** eFe — MARCHA pós-P0  
**Projeto:** `wtbpwuiayednvlhvuhbh`

## CP-CEN-011 — Indicadores

| Item | Resultado |
|------|-----------|
| RPC `admin_central_indicators` | **Aplicada** (staff; grant authenticated) |
| Fórmula líquido | capturado − devolvido |
| Hub cards ops + fin | **Implementado** |
| Unit | shipping kind + filtros existentes PASS |

## CP-OWN-ME / OWN-OPS

| Item | Resultado |
|------|-----------|
| ME panel só se `shipment.provider` Melhor Envio | **PASS** (`orderUsesMelhorEnvio`) |
| Own/mock → `OwnShipPanel` (rastreio + ship) | **Implementado** |

## CP-CAN-POST

| Item | Resultado |
|------|-----------|
| UI: hide approve se `enviado`/`entregue` | **Implementado** |
| RPC: approve bloqueado pós-despacho | **Aplicada** `…191000_cp_can_post…` |
| Recusar solicitação | permanece |

## CP-CEN-050

Já coberto por CEN-040 (`cancellationRequest: 'pending'` server-side).

## Ainda P1 (próximo MARCHA)

- CP-EMB-* packing multi-volume (spec+código)  
- CP-EVT-01 ocorrências `occurrence_id`  
- CP-PRT-DOC archive  
- CP-OWN-OPS aprofundar (programação entrega)
