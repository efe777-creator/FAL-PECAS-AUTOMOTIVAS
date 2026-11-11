# Backup search_products — 2026-11-11

Projeto: `owllmfcpbodqmoerdfxx`

Antes da migration `search_products_year_range_prod_compat`:
- Match de ano: `vv.year = p_year` (sem PVC range)
- Sem wildcard engine/version vazios
- Retorno sem `commercial_ref` / `resolved_amount`
- Filtro `customer_can_see_product`

Corpo completo recuperável via:
```sql
select pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'search_products';
```
(versão pré-patch foi capturada na sessão de auditoria/MARCHA via MCP).

Rollback: reaplicar a definição antiga ou migration anterior do histórico.
