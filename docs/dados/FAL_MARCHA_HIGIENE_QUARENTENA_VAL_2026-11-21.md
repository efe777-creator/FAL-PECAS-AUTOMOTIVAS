# VAL — Higiene quarentena pós-fechamento

**Branch:** `dev` · **Projeto:** wtbp · **Sem MAIN/deploy app**

## Correções

1. Migration `20261122180000_mestre_quarantine_hygiene`:
   - `Crossfox` quarantined → **superseded** com `canonical_model_id` = Cross Fox verified
   - Quarentenas **fora de escopo** ainda `active` → `inactive` (motos/trailer)
2. Hub: chips **Cascas** e **Vida pontual** sempre visíveis (inclui zero); chip “Fonte B não promove” no lugar de FIPE assist fake-off.

## Pós-apply

- Crossfox: inactive + superseded → Cross Fox
- Fila/admin: fora de escopo não polui contagem de modelos active
- Cascas shell0 permanece 1 (Corolla Cross) — sem thin-seed
