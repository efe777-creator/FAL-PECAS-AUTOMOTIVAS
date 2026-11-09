# VAL — audit estático place_order ownq (ship_provider)

**Data:** 2026-11-09  
**Auth:** MARCHA  
**Item:** O1-D (sem cutover / sem E2E live)

## Entrega

- Teste vitest da migration `20261105140000_fix_place_order_ownq_ship_provider`
- Garante `v_ship_provider` + ramo ownq + insert sem `v_ship.provider` no CASE
- Extra O0-C: Melhor Envio lista sem “ID” inglês

## Critérios

- [x] `tsc --noEmit` em `fal-pecas`
- [x] vitest placeOrderOwnqShipProviderAudit

## Gate humano

Tarifas / smoke E2E live / D-FRETE C intactos.
