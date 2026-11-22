# VAL — QQ→CAOA Chery + cascas no stats do hub

**Branch:** `dev` · **Projeto:** wtbp · **Sem MAIN**

## Achados

1. `QQ` (quarentenado) estava sob **Audi** — lixo de import.
2. Hub fazia 2 queries de cascas (contador + lista).

## Correções

1. Migration `20261122230000`: `QQ` → maker **CAOA Chery** (continua quarantined/inactive).
2. `adminFetchVehicleMasterStats` devolve `verifiedThinShellItems`; hub usa a mesma fonte.

## Pós

- QQ maker = CAOA Chery
- Vitest antiregress: **17/17**
