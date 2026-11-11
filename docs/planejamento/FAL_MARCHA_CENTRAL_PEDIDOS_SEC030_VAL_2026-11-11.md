# VAL — CP-SEC-030 (revoke INSERT JWT em `orders`)

**Data:** 2026-11-11  
**Projeto:** `wtbpwuiayednvlhvuhbh`  
**Inventário:** [FAL_MARCHA_CENTRAL_PEDIDOS_SEC030_INVENTARIO_2026-11-11.md](./FAL_MARCHA_CENTRAL_PEDIDOS_SEC030_INVENTARIO_2026-11-11.md)  
**SQL:** `fal-pecas/supabase/migrations/20261111183000_cp_sec030_revoke_orders_insert.sql`  
**Apply:** `supabase db query --remote` (db push bloqueado por drift histórico remoto ≠ local)

## Critério

INSERT JWT falha · `place_order` continua executável · admin SELECT OK · sem path FE/Edge quebrado.

## Resultado

| # | Caso | Resultado |
|---|------|-----------|
| 1 | Inventário FE/Edge/RPC/grants | **PASS** — GO revoke |
| 2 | SQL remoto: revoke INSERT + drop `orders_insert_own` | **PASS** |
| 3 | `role_table_grants` INSERT em `orders`/`order_items` | **PASS** = vazio |
| 4 | Policies em `orders` | **PASS** só `orders_select_own` |
| 5 | PostgREST anon INSERT `orders` | **PASS** `42501 permission denied for table orders` |
| 6 | PostgREST anon INSERT `order_items` | **PASS** idem |
| 7 | `has_function_privilege(authenticated, place_order, execute)` | **PASS** true |
| 8 | Anon `place_order` | **PASS** 401 Não autenticado (não “function missing”) |
| 9 | `place_order` autenticado E2E checkout | **PENDENTE eFe** (sessão customer) — baixo risco: DEFINER + grant execute intactos |
| 10 | Admin list/detail SELECT | **OK esperado** (SELECT grant + policy intactos; sem mudança de read path) |

## Veredito

**CP-SEC-030 = CORRIGIDO** (revoke aplicado em produção wtbp).  
Pendência residual: smoke `place_order` com JWT customer (confirmação humana rápida no checkout).

## Não coberto aqui

**CP-SEC-035** — write JWT em `shipments` (staff ALL) permanece; inventário rápido no doc de inventário §5.

## Próximo

P0-3 **CP-CEN-040** — filas server-side (`adminListOrders` / status in / paginação).
