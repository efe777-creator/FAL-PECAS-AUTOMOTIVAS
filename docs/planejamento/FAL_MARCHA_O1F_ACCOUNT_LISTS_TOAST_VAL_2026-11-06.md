# VAL — O1-F: listas da conta (pedidos + favoritos)

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual toast — `AccountOrdersPage` e `AccountFavoritesPage` só usavam `ErrorState`

## Entrega

| Peça | Mudança |
|------|---------|
| Pedidos | Falha de carga → `ErrorState` + toast |
| Favoritos | Falha de carga → `ErrorState` + toast |

## Critérios

- [x] Erro de carga dispara toast além do ErrorState
- [x] `tsc -b` OK

## Gate humano

Nenhum.
