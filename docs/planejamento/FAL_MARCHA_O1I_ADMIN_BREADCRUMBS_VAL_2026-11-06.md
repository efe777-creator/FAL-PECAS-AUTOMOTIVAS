# VAL — O1-I: breadcrumbs admin padronizados

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** plano pedia migalhas padronizadas; páginas usavam “← Voltar” ad hoc

## Entrega

| Peça | Mudança |
|------|---------|
| `adminBreadcrumbs.ts` | `buildAdminBreadcrumbs(pathname)` — Painel → hub → …; IDs → “Detalhe” |
| `AdminBreadcrumbs` | `<nav aria-label="Breadcrumb">` |
| `AdminLayout` | Render acima do Outlet (exceto `/admin` e acesso negado) |
| Testes | 5 PASS |

## Critérios

- [x] `/admin` sem migalha
- [x] `/admin/pedidos/{uuid}` → Painel / Pedidos / Detalhe
- [x] `/admin/logistica/melhor-envio` → Painel / Logística / Melhor Envio
- [x] `vitest` + `tsc -b` OK

## Gate humano

Nenhum. Links “← Voltar” locais podem ser limpos em fatia futura.
