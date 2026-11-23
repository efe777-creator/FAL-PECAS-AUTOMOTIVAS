# VAL — Busca inteligente QA (qualquer termo pesquisa · IA auxilia)

**Data:** 2026-11-23 · **Branch:** `dev` · Sem MAIN sem OK  
**Auth:** eFe — MARCHA; I30 = exemplo da matriz

## Direção

- Qualquer termo dispara caminho de busca (PVC e/ou `p_q`)
- IA auxilia YMM/peça; **não** inventa `productQuery`
- Só-veículo: faixa “Peças para …” + pedir peça

## Entrega código

| Item | Status |
|------|--------|
| `clarification: 'product'` no parser só-veículo | PASS |
| Merge anti-alucinação `productQuerySupportedByRaw` | PASS |
| Prompt Edge `interpret-search-nl` (product + anti-invent) | código local PASS · redeploy se MCP/CLI OK |
| Catalog faixa `searchVehicleBrowseLabel` + hint | PASS |
| Vitest search (31) | PASS |

## Matriz (aceite)

| Query | Esperado |
|-------|----------|
| `I30` / `HB20` | model + PVC + UI peça |
| `axial I30` | q∩PVC |
| código `TDI…` | codeHint |
| NL pivo+palio | peça+YMM |

## Aceite eFe

- [ ] Smoke local/prod: I30 não parece “lixo” — faixa + refine
- [ ] Peça+carro coerente
- [ ] MAIN/deploy Hostinger só com OK
