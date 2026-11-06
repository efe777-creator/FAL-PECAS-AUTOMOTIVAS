# VAL — O1-H/I: 404 do admin

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** `/admin/rota-inventada` deixava o Outlet vazio (sem 404)

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminNotFoundPage` | 404 no shell admin (CTAs painel + pedidos) |
| `router.tsx` | `path: '*'` como último filho de `/admin` |

`logistica/:slug` (placeholder) permanece para slugs de logística não implementados.

## Critérios

- [x] `/admin/xyz-inexistente` mostra 404 admin (não tela em branco)
- [x] Links para `/admin` e `/admin/pedidos`
- [x] `tsc -b` OK

## Gate humano

Nenhum nesta fatia.
