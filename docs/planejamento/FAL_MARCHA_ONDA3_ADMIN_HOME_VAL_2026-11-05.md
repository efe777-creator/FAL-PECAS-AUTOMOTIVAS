# VAL — MARCHA Onda 3 · Admin Home (09/10)

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## Escopo

- Tabelas `store_home_banners` + `store_home_featured_products` (RLS público ativo / staff write)  
- Admin `/admin/home` — Campanhas + Destaques  
- Loja: banners via DB (fallback estático); destaques curados se houver fila  

**Fora:** condições de pagamento 11/12 (**gate eFe**)

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Migration wtbp + seed 3 banners | **PASS** |
| 2 | Página admin Home (nav + dashboard) | **PASS** |
| 3 | `listHomeBanners` / `listFeaturedProducts` curadoria | **PASS** |
| 4 | `tsc --noEmit` | **PASS** |

---

## STOP

Próximo Onda 3 residual: **condições de pagamento (11/12)** — aguarda decisão comercial eFe.  
Onda 4 ou gates humanos (D-FRETE C / ME print) em paralelo sob pedido.

**Assinatura:** VAL Onda 3 admin Home PASS 2026-11-05.
