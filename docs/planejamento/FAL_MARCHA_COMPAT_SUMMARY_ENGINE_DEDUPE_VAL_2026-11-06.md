# VAL — Resumo de aplicações: dedupe com motor/versão

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** `+N` do card subcontava apps com mesmo maker/modelo/ano e motores diferentes

## Entrega

| Peça | Mudança |
|------|---------|
| `compatibilitySummary.ts` | Dedupe alinhado ao bloco completo; texto inclui motor/versão |
| `summarizeCompatibilityRows` | Função pura + testes |

## Critérios

- [x] Dois motores no mesmo Gol 2010 → duas linhas no resumo
- [x] `maxEntries: 1` com 3 apps → `+2`
- [x] vitest 5 PASS · `tsc -b` OK

## Gate humano

Nenhum.
