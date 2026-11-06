# VAL — O1-I: menu admin filtrado por papel

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** sidebar/dashboard mostravam todos os hubs; papéis limitados viam links inúteis (RLS já bloqueava)

## Entrega

| Peça | Mudança |
|------|---------|
| `adminNavAccess.ts` | Matriz path→papéis (`STAFF`/`MGMT`/`CATALOG_OPS`/`STOCK`/`SALES`); `canAccessAdminPath` + `filterAdminNavLinks` |
| `AdminLayout` | Filtra Catálogo/Vendas/Operação; seção vazia some |
| `AdminDashboardPage` | Cards do hub só para paths permitidos |
| Testes | `adminNavAccess.test.ts` — 6 PASS |

## Critérios

- [x] Atendimento: pedidos/clientes; sem operadores/preços
- [x] Estoque: estoque/produtos; sem preços
- [x] Só administrador vê Operadores
- [x] Prefixo de rota herda hub (`/admin/pedidos/...`)
- [x] `vitest` + `tsc -b` OK

## Gate humano

Nenhum nesta fatia. RLS continua a fonte de verdade; UI só esconde.
