# VAL — MARCHA O1-C Caixas no wtbp

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Migration:** `20261105180000_shipping_box_templates.sql`  
**Plano:** [FAL_PLANO_MESTRE_SITE_2026-11-05.md](./FAL_PLANO_MESTRE_SITE_2026-11-05.md)

---

## Escopo

Aplicar no runtime canônico o schema de caixas/embalagens e padrões de medida por categoria (O1-C).

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Tabela `shipping_box_templates` | **PASS** — `to_regclass` = `shipping_box_templates` |
| 2 | RLS staff all + anon read active | **PASS** — 2 policies |
| 3 | Colunas `product_categories.default_*` (peso/L/W/H) | **PASS** — 4 colunas |
| 4 | Admin `/admin/logistica/caixas` (código) | **PASS** (já no repo) |
| 5 | `pickSmallestFittingBox` unit | **PASS** (vitest) |
| 6 | Apply SQL wtbp | **PASS** — `db query --remote --yes` 05/11 |
| 7 | Seed P/M/G se vazio | **PASS** (inserção condicional) |

---

## Smoke operador

1. Admin → Logística → Caixas e embalagens  
2. Ver Caixa P / M / G (ou criar uma)  
3. Editar dimensões → Salvar → listar de novo  

---

## STOP

Schema O1-C **no wtbp**. Integração packing na Edge `quote-shipping` e UI de default por categoria = follow-up.  
Próximo sequencial sugerido: smoke E2E `ownq` + M7 etiqueta **ou** wire packing na cotação.

**Assinatura:** VAL O1-C wtbp PASS 2026-11-05.
