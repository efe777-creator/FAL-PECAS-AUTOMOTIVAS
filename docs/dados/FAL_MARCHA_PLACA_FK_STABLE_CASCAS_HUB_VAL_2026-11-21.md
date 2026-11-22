# VAL — Assert placa FKs estáveis + cascas no hub

**Branch:** `dev` · **Projeto:** wtbp · **Sem MAIN**

## Achados (higiene)

| Métrica | n |
|---|---|
| vv/cv/vi bad / órfãos | 0 |
| maker mismatch / maker-only | 0 |
| shell0 verified | 1 (Corolla Cross — sem thin-seed) |
| quarentena | 4 |

## Correções

1. `assertPlateAgainstCatalog`: FKs só com `namesStable` (nome realinhado ≠ IDs da edge).
2. `versionId` só se a versão tipada existe em `versionsByModel`; casca (0 VV) zera `versionId`.
3. Hub lista cascas verified (`listVerifiedThinShells`) — Corolla Cross visível, sem inventar VV/PVC.

## Pós

- Vitest plate assert + antiregress: **28/28**
