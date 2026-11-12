# VAL — MARCHA Home F1 · Apply migration + Edge + smoke

**Data:** 12/11/2026  
**Auth:** eFe — `MARCHA`  
**Prévia:** [FAL_MARCHA_HOME_F1_P0_GATE_VAL_2026-11-12.md](./FAL_MARCHA_HOME_F1_P0_GATE_VAL_2026-11-12.md)  
**Projeto:** `wtbpwuiayednvlhvuhbh` (produção)

---

## Checklist

| # | Item | Resultado | Evidência |
|---|------|-----------|-----------|
| 1 | Apply SQL `20261112210000_product_promotions_gate.sql` | **PASS** | `supabase db query --remote --yes -f …` |
| 2 | Tabelas `product_promotions` / `product_promotion_events` | **PASS** | `to_regclass` OK |
| 3 | `resolve_product_price` contém gate | **PASS** | `resolve_has_gate = true` |
| 4 | Seed ativações | **PASS (0 rows)** | `active_promotions = 0` — remoto sem itens em lista public não-default |
| 5 | Resolve ainda resolve Base | **PASS** | TDI1006/TDI0800/TDI1002 → `preco-base` |
| 6 | Deploy Edge `create-mp-payment` | **PASS** | `functions deploy … --yes` |
| 7 | Smoke UI admin desativar/reativar promo | **PENDENTE eFe** | precisa SKU na lista promocional + `/admin/home/promocoes` |
| 8 | Smoke 022-E1 card→pedido com promo | **PENDENTE** | após massa promocional |

---

## Notas

- Histórico remoto ≠ local: apply pontual via `db query` (não `db push` full).  
- Produção hoje **não** tem `price_list_items` em listas public não-default → seed 0 é coerente; gate não altera preços Base.  
- Para validar ativação: cadastrar preço na Lista Promocional em `/admin/precos` → ativar em `/admin/home/promocoes` → conferir vitrine.

---

## Comandos usados

```text
npx supabase db query --remote --yes -f supabase/migrations/20261112210000_product_promotions_gate.sql
npx supabase functions deploy create-mp-payment --project-ref wtbpwuiayednvlhvuhbh --yes
```

**Assinatura:** MARCHA Home F1 apply+Edge PASS · smoke UI promo pendente massa · 2026-11-12.
