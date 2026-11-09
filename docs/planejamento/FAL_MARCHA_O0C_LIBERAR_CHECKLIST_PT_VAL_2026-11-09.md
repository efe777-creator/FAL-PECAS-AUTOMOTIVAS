# VAL — Liberar na loja: checklist PT sem jargão

**Data:** 2026-11-09  
**Auth:** MARCHA  
**Item:** O0-C

## Entrega

- `evaluateReleaseChecklist`: copy PT (código interno, preço na loja, publicado, aplicação em veículo)
- Lista de produtos: hint arquivar/publicação sem “banco” / “Status ≠”

## Critérios

- [x] `vitest` `releaseChecklist.test.ts`
- [x] `tsc --noEmit` em `fal-pecas`
- [x] Sem `SKU` / `published` / `PVC` / `override` no texto do checklist

## Gate humano

Nenhum nesta frente.
