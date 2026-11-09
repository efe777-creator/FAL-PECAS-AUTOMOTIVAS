# VAL — PG04 padronização ambientes MP/ME (local)

**Data:** 2026-11-09  
**Auth:** eFe — plano mestre Pagamentos onda atual  
**Deploy/secrets:** **não** executados

---

## Entregas

| Item | Resultado |
|------|-----------|
| `meRuntimeMode()` / `meIsProduction()` em `melhorEnvioCore` | PASS |
| `quote-shipping`: mode + disclaimer por API base | PASS |
| `melhorenvio-label`: sandbox flag + provider insert por modo | PASS |
| `VITE_SHIPPING_ME_ENV` + `resolveShippingMeEnvMode` | PASS |
| Cart/PDP envelopes sem sandbox forçado | PASS |
| Admin etiqueta: copy teste vs produção | PASS |
| `.env.example` matriz TEST/PROD | PASS |
| Vitest carrierRegistry | PASS — 13/13 |

## Docs onda

- PG01 [auditoria](./FAL_AUDITORIA_PAGAMENTOS_PG01_2026-11-09.md)
- PG02 [vars](./FAL_INVENTARIO_VARS_SECRETS_MP_ME_PG02_2026-11-09.md)
- PG03 [handoff](./FAL_MARCHA_OPS_MP_ME_CONTA_NOVA_HANDOFF_2026-11-09.md) + D-FRETE C addendum
- Spec próxima onda [plano mestre](./FAL_PLANO_MESTRE_PAGAMENTOS_INTEGRACOES_2026-11-09.md)

## Próximo (humano)

Conta nova → vars (PG02) → deploy Edges/front → smoke G3/G4.

**Assinatura:** VAL PG04 PASS · sem publish · 2026-11-09.
