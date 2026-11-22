# VAL — Resolve não anexa VV casca vazia

**Branch:** `dev` · **Projeto:** wtbp · **Sem MAIN**

## Achado

3 VV ativas sem ano/motor/versão (Fiat Idea / Palio / Siena) com PVC. O `resolveVersionId` podia anexar esses IDs como se fossem config tipada → garagem “completa” sem versão real.

## Correções

1. `isUntypedShellVv` + `resolveVersionId` não devolve `versionId` para casca vazia (mantém maker/model).
2. Edge `vehicleResolver` ignora o mesmo padrão.
3. `plate-lookup` redeployado no wtbp.

## Pós

- PVC das 3 VV mantido (não inativar)
- Vitest g1 + e1 + antiregress: **22/22**
- shell0 Cross = 1 (sem thin-seed)
