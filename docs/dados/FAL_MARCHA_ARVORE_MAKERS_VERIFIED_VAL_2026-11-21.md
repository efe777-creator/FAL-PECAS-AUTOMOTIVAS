# VAL — Árvore pública só montadoras com modelo verified

**Branch:** `dev` · **Projeto:** wtbp · **Sem MAIN**

## Achado

`loadVehicleOptions` listava **todas** as montadoras `active`, inclusive **SR** e **Yamaha** (só modelos quarantined/inactive) — seletor com maker vazio de modelos.

## Correções

1. `makers` da árvore = `Object.keys(modelsByMaker)` (só quem tem ≥1 modelo verified).
2. Hub: após Verificar (A1), avisa se o modelo ficou casca (0 VV) — sem thin-seed.

## Pós

- Higiene: bad/órfãos = 0 · shell0 = 1 (Cross) · quar = 4
- Vitest antiregress + plate assert: **28/28**
