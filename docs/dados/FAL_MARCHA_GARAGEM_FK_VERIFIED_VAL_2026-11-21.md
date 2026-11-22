# VAL — Garagem só FK verified

**Branch:** `dev` · **Projeto:** wtbp · **Sem MAIN**

## Correções

1. Migration `20261122190000`: inativa 3 VV active sob modelos quarentenados; RPC `create_customer_vehicle_with_identity` sanitiza FKs (verified + superseded→canonical).
2. `customerVehicleService`: resolve só `models.quality_status=verified`; `assertVerifiedGarageFks` antes de salvar.
3. `plateIdentityAssert`: zera `manufacturerId`/`modelId`/`versionId` se status ≠ `found` ou par fora da árvore verified.

## Pós

- `vv_active_on_nonverified` = **0**
- Vitest: antiregress + plateIdentityAssert + customerVehicleService.g1 → 28/28
