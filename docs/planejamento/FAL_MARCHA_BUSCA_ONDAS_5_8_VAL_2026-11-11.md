# VAL — Ondas 5–8 (prep, IA stub, homologação, publish)

**Data:** 2026-11-11 (atualizado pós-smoke wtbp)  
**Projeto prod Netlify:** `wtbpwuiayednvlhvuhbh`  
**Nota:** MCP `owllmfcpbodqmoerdfxx` ≠ site publicado.

## Onda 5 — Busca tradicional avançada

| Item | Status |
|------|--------|
| search_synonyms / store_search_prep | **Adiado** — evitar drift amplo sem OK eFe |
| Refs / códigos (TDI2116 via RPC) | **PASS** SQL wtbp |
| terminal + YMM HB20 2015 | **PASS** SQL → TDI2116/TDI2117 (2) |
| HB20 2015 1.0 (engine wildcard) | **PASS** SQL → 3 SKUs |
| pg_trgm | Adiado |

## Onda 6 — IA

| Item | Status |
|------|--------|
| Contrato `interpretNaturalLanguage` | Criado — fallback determinístico |
| Edge LLM | **Não** — gate eFe / orçamento |
| Regra | IA não inventa PVC/preço/estoque |

## Onda 7 — Homologação

| Caso | Resultado |
|------|-----------|
| Seletor HYUNDAI/HB20/2015 | PASS 3 (BRD2109, TDI*, preços) |
| Texto `?q=HB20 2015` | PASS 3 (= seletor) |
| Código TDI2116 | PASS SQL |
| Vitest parser | 8/8 PASS |

## Onda 8 — Publicação

| Item | Status |
|------|--------|
| RPC year-range + commercial_ref + wildcard | **Aplicada em wtbp** (`20261110160000`) |
| Front interpretador + limpeza `q` | Deploy `6af493b6` + tip `e02b01b` |
| URL canônica deep-link `?q=` | SHIP nesta MARCHA (CatalogPage) |
| Monitor zero-result | Pendente ops contínuo |

## STOP / próximo (fora P0)

1. Autorizar search_prep / sinônimos em wtbp.
2. Orçamento IA (P2).
3. Matriz homologação completa (placa/garagem já no mesmo motor — Onda 4).
