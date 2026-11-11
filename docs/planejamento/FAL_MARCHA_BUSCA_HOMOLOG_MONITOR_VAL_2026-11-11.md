# VAL — Homologação residual + monitor + IA hook

**Data:** 2026-11-11  
**Auth:** eFe — `MARCHA` (pós-fechamento P0)

## Homologação SQL / lógica

| # | Caso | Resultado |
|---|------|-----------|
| T07 | pivo (sem veículo) | PASS ≥5 PVI* |
| T08 | pivo Palio 2010 | PASS PVI1032 |
| T09 | TDI2116 | PASS (sessão anterior) |
| T10 | Nakata PVI1032 | **BUG** (q perdia SKU) → **FIX** parser prioriza código |
| T11 | produtos published sem PVC | **0** (ok) |
| T14/T15 | placa/garagem | Código já aplica `VehicleFilter` no mesmo catálogo; smoke API placa depende de token |

## Monitor zero-result

- Tabela `search_zero_results` aplicada no **wtbp**
- `searchCatalog` grava fire-and-forget quando `total===0` (page 1)

## IA

- `interpretNaturalLanguage` invoca Edge se `VITE_SEARCH_NL_LLM=1`
- Fallback determinístico obrigatório; high confidence / código não chama LLM
- Edge stub `interpret-search-nl` no repo (deploy função = próximo se eFe quiser)

## Assinatura

Homolog + monitor · tip a publicar com este commit
