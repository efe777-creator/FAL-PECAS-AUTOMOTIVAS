# VAL — O1-I: gate de rota admin por papel

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** URL direta `/admin/...` ainda carregava a página mesmo com menu filtrado

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminLayout` | `canAccessAdminPath` antes do `<Outlet />` |
| `AdminForbiddenPage` | UI “Acesso restrito” + atalhos painel/loja |

## Critérios

- [x] Atendimento em `/admin/operadores` → acesso restrito (não carrega formulário)
- [x] Estoque em `/admin/precos` → acesso restrito
- [x] Dashboard `/admin` permanece acessível a staff
- [x] `tsc -b` OK

## Gate humano

Nenhum. RLS continua a fonte de verdade no backend.
