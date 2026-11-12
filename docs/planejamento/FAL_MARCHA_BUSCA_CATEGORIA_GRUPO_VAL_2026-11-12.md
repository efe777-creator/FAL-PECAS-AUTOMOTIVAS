# VAL — Busca por categoria / grupo / subgrupo

**Data:** 2026-11-12  
**Auth:** eFe — `GARANTIR BUSCA POR CATEGORIA GRUPO OU SUBGRUPO`  
**Projeto:** wtbp

## Causa

Produtos (99) estavam todos em `direcao` (raiz). Folhas Terminal/Axial/Pivô/etc. tinham 0 → filtro de grupo/subgrupo zerava. A RPC já estava correta.

## Correção de dados

Migration local: `fal-pecas/supabase/migrations/20261112150000_remap_products_category_leaves.sql`  
Aplicada em produção via SQL (histórico remoto divergente — `db push` não usado).

| Slug | Published após remap |
|------|----------------------|
| terminal-de-direcao | 35 |
| axial-de-direcao | 16 |
| completo | 15 |
| pivo | 13 |
| c-rolamento | 7 |
| bieleta | 7 |
| bucha-bandeja | 2 |
| suporte-da-barra-tensora | 2 |
| coxim-amortecedor | 1 (+ filhos) |
| batente-e-loclizador | 1 |
| par-parcial | 1 |
| direcao (raiz direta) | **0** (produtos só nas folhas) |

## Smoke RPC

| p_category | count | Status |
|------------|-------|--------|
| direcao (ancestral) | 51 | PASS (filhos Terminal+Axial) |
| terminal-de-direcao | 35 | PASS |
| axial-de-direcao | 16 | PASS |
| suspensao | 49 | PASS |
| pivo | 13 | PASS |
| kit-amortecedor | 17 | PASS |
| completo | 15 | PASS |
| c-rolamento | 7 | PASS |
| bieleta | 7 | PASS |
| coxim-amortecedor | 8 | PASS (grupo+filhos) |
| terminal + q=terminal | 35 | PASS |
| terminal + HB20 2015 | 2 | PASS (intersect) |

## UI

Empty state do catálogo: se grupo/subgrupo vazio, CTA **Ver classificação superior**.

## Assinatura

MARCHA categoria/grupo/subgrupo · remap dados · RPC PASS · 2026-11-12
