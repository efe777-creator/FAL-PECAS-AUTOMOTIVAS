# Relatório de marcha — Produto × Aplicação × HF (+ posição/lado)

**Data:** 2026-10-07  
**Status:** STOP — sem commit/push

## Entregue

### Spec
- `docs/planejamento/ESPECIFICACAO_IMPORTACAO_PRODUTO_APLICACAO_2026-10-07.md`

### Frente A
- Contrato `catalog` com `posicao` / `lado` (opcionais).
- Normalização HF → canônicos (`DIANTEIRA`/`TRASEIRA`, `ESQUERDO`/`DIREITO`/`AMBOS`).
- Schema remoto: `products.posicao`, `products.lado` + checks.
- RPC `apply_catalog_products_import` grava posição/lado + search_document.
- UI: formulário admin, prévia import, PDP.

### Frente B (validado)
- SKU inexistente = erro; `create_product` desligado (motor + RPC).

### Frente C
- Layout HF inclui posicao/lado; split 1 produto + N apps; prévia com colunas; apply sequencial.

## Gates

| Gate | Resultado |
|------|-----------|
| vitest `src/services/import` | 66 passed |
| tsc + vite build | OK |
| Colunas/RPC remotas | OK |
| Commit/push | **não feitos** (STOP) |

## Fora desta marcha
- Filtros faceted loja; fabricante peça; preço/estoque; F7–F9; F; MP/G.
