# Auditoria — Ajuste Global de Lista de Preços

**Data:** 2026-10-04  
**Projeto:** `wtbpwuiayednvlhvuhbh`  
**Veredito:** **APROVADA** (gate pré-F7B)

---

## Diagnóstico

| Item | Achado |
|------|--------|
| Implementação antiga | Loop client `select` + upsert N vezes |
| Fórmulas | Corretas (`%` / `R$` / round 2 casas) |
| Causa raiz | Ajuste **não atômico** + sem guardas (−100% → zero) + sem preview |
| Impacto | Lista Base com mix ZEROED / DOUBLED / OK_SEED |

## Correção

- RPC `adjust_price_list_items` (SECURITY DEFINER, `is_staff()`, set-based, 1 transação)
- Source history: `bulk_adjust`
- Guardas: `|percent| ≤ 100`; rejeita −100%; rejeita wipe total a zero
- Client chama só a RPC; UI mostra amostra old→new
- Repair: 34 itens da Lista Base restaurados ao seed (`mismatch=0`, `zeros=0`)

## Checklist gate

- [x] aumento %
- [x] redução % (bloqueio −100%)
- [x] aumento R$
- [x] redução R$
- [x] arredondamento 2 casas
- [x] persistência atômica + history
- [x] todos os itens (set-based)
- [x] preço avulso não alterado
- [x] Base/Promo via trigger
- [x] catálogo seed restaurado
- [x] build / TS (validar no gate)

## Arquivos

- `fal-pecas/supabase/migrations/20261004100000_adjust_price_list_items.sql`
- `fal-pecas/src/services/admin/adminPriceListService.ts`
- `fal-pecas/src/pages/admin/prices/AdminPriceListDetailPage.tsx`
