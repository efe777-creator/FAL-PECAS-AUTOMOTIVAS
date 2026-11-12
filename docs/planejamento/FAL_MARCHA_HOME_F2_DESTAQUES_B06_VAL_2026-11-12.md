# VAL — MARCHA Frente 2 · B-06 + HOME-02 (fatia Destaques)

**Data:** 12/11/2026  
**Auth:** eFe — `MARCHA`  
**Projeto:** `wtbpwuiayednvlhvuhbh`  
**Refs:** [FAL_ANALISE_POS_F1_HOME_COMERCIAL_2026-11-12.md](./FAL_ANALISE_POS_F1_HOME_COMERCIAL_2026-11-12.md) · [FAL_HOME_BACKLOG_01_08.md](./FAL_HOME_BACKLOG_01_08.md)

---

## Escopo desta fatia

| ID | Item | Entrega |
|----|------|---------|
| B-06 | Aviso lista promocional `inactive` + atalho Preços | `AdminPromotionsPage` + `adminListInactivePromotionalLists` |
| B-01 | Destaques admin: imagem, preço normal/promo, selo | `adminListFeaturedProducts` enrich + UI lista/cards |
| B-02 | Prévia desktop/tablet/mobile com dados reais | Faixa prévia na aba Destaques |

**Fora desta fatia:** HOME-05 · HOME-07 · B-07 · Frente 3 smoke UI jornada.

---

## Cenários

| # | Cenário | Esperado | Obtido | Resultado |
|---|---------|----------|--------|-----------|
| 1 | Enrich featured: `storage_path` → URL pública | Sem coluna `url` inexistente; thumb via Storage | `getPublicUrl(storage_path)` em `adminHomeContentService` | **PASS** |
| 2 | Preços admin = Base + `resolve_product_prices` | listPrice + resolvedPrice por produto | RPC + `price_list_items` Base | **PASS** (código) |
| 3 | Selo Oferta informativo | `promoActive` (vigente) ou resolved &lt; list | Badge + strike na lista/prévia | **PASS** (código) |
| 4 | Prévia respeita limite Home | Só `active`, slice até `featuredDisplayLimit` | `featuredPreview` + viewports | **PASS** (código) |
| 5 | Promo **não** muda curadoria | Add/ordem/toggle independente de promo | Sem write em featured a partir de promo | **PASS** |
| 6 | B-06 lista inactive | Banner amber + link `/admin/precos` | `adminListInactivePromotionalLists` + UI | **PASS** (código) |
| 7 | Lint/TS páginas tocadas | Sem erros | ReadLints limpo | **PASS** |

---

## Evidência operacional (remoto)

Estado conhecido pós HOME-04: **Lista Promocional** costuma estar `inactive` em prod. Abrir `/admin/home/promocoes` deve exibir o aviso B-06 até reativar em Preços.

Smoke UI visual (thumbs/preços na aba Destaques + banner inactive): **pendente eFe** no browser autenticado admin.

---

## Conclusão

Fatia **B-06 + HOME-02 (B-01/B-02)** implementada no código. Aceite estrutural PASS. Homologação visual admin = próximo passo operacional antes de HOME-05.

**Assinatura:** MARCHA F2 B-06/HOME-02 código PASS · 12/11/2026.
