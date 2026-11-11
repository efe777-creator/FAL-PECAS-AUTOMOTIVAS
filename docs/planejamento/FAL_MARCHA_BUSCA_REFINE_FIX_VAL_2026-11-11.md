# VAL — MARCHA testar e corrigir busca (refine)

**Data:** 2026-11-11  
**Auth:** eFe — `MARCHA TESTAR E CORRIGIR METICULOSAMENTE`  
**Push/deploy:** **NÃO** — aguardar aval explícito.

## Bugs encontrados (causa raiz)

| Sintoma | Causa | Correção |
|---------|-------|----------|
| `ponteira HB20 2015` → URL `version=ponteira` + 3 produtos (não filtra peça) | Heurística antiga tratava leftover como **versão** | Allowlist `VERSION_WORDS`; `ponteira` em `PRODUCT_WORDS` |
| Sinônimos no wtbp inúteis | `synonym_expansion_enabled=false` | Flag **true** + seed pivo/pivô/oleo |
| Label `12/...` ilegível | `formatVehicleAppYear` YY/... | `2012–atual` / `YYYY–YYYY` / `até YYYY` |
| IA órfã | `interpretNaturalLanguage` não era chamado | Front passa pelo contrato NL (LLM off) |

## Testes

| Camada | Resultado |
|--------|-----------|
| Vitest search + vehicleAppYear | **26/26 PASS** |
| SQL axial+YMM | BRD2109 |
| SQL ano 1999 | 0 (esperado) |
| Site ponteira (antes do deploy front) | ainda bug antigo no bundle publicado |

## IA básica grátis

- Edge stub `interpret-search-nl` (mode `deterministic_required`)
- Front: `VITE_SEARCH_NL_LLM=1` para ligar depois
- Fallback permanente: `interpretSearchQuery`

## Pedido ao eFe

**Autoriza push + deploy Netlify agora?** (código do fix ponteira + label só entra no site após deploy)
