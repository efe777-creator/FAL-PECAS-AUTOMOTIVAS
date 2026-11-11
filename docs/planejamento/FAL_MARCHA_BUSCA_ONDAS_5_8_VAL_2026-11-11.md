# VAL — Ondas 5–8 (prep, IA stub, homologação, publish)

**Data:** 2026-11-11

## Onda 5 — Busca tradicional avançada

| Item | Status |
|------|--------|
| search_synonyms / store_search_prep | **Não aplicados** — dependem de drift maior (`commercial_ref`, rebuild doc). Evitado para não ampliar risco. |
| Refs / Nakata | Cobertos pela RPC refs LIKE; teste E2E Nakata PVI1032 ainda `nao_executado` |
| pg_trgm | Adiado (49 SKUs) |

## Onda 6 — IA

| Item | Status |
|------|--------|
| Contrato `interpretNaturalLanguage` | Criado — fallback determinístico obrigatório |
| Edge LLM | **Não** — só após Ondas 1–3 em produção + orçamento eFe |
| Regra | IA não inventa PVC/preço/estoque |

## Onda 7 — Homologação

Ver matriz CSV atualizada + VAL Onda 1/2/3/4.  
Vitest parser: 8/8 PASS.

## Onda 8 — Publicação

| Item | Status |
|------|--------|
| RPC search_products (year-range) | **Aplicada** em `owllmfcpbodqmoerdfxx` |
| Front (parser + SearchBar) | Código no repo — **deploy Netlify pendente** (sem commit automático) |
| Rollback RPC | Restaurar def pré-patch (sessão MCP / backup note) |
| Monitor zero-result | Pendente ops pós-deploy |

## Próximos pedidos ao eFe

1. Deploy front.
2. Confirmar BRD2109 + preços TDI*.
3. Autorizar migrations `commercial_ref` + search_prep.
4. Orçamento IA.
