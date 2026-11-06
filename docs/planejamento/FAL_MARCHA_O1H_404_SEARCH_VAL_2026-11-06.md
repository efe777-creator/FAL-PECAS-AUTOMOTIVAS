# VAL — O1-H: 404 da loja com busca

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** plano O1-H — 404 com busca e link ao catálogo (faltava o campo de busca)

## Entrega

| Peça | Mudança |
|------|---------|
| `NotFoundPage` | Form busca → `/catalogo?q=`; botões catálogo + início |

## Critérios

- [x] Buscar com termo abre catálogo filtrado
- [x] Buscar vazio abre `/catalogo`
- [x] Placeholder alinhado ao SearchBar (`searchCopy`)
- [x] `tsc -b` OK

## Gate humano

Nenhum.
