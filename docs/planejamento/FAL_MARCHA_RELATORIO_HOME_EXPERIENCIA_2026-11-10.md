# Relatório MARCHA — Home e experiência de compra

**Data:** 2026-11-10 (atualizado tarde — UX entrada/menus)  
**AJUSTE:** 029 (+ 028, 009, 021)  
**HEAD tip remoto:** `main` @ `331a1bb` — trabalho Home/placa **ainda no working tree** (sem PR)  
**Spec:** [FAL_SPEC_HOME_EXPERIENCIA_COMPRA_2026-11-09.md](./FAL_SPEC_HOME_EXPERIENCIA_COMPRA_2026-11-09.md)

---

## Veredito (30s)

| Camada | Situação |
|--------|----------|
| **Onda 0** auditoria × código | **FEITA** |
| **Onda 1** Home + vigência/destaques | **CÓDIGO FEITO** (working tree) |
| **UX entrada** (unificar + menus) | **CÓDIGO FEITO** nesta tarde |
| **Ops SQL / Edge placa / publish** | **GATE HUMANO** |
| **Ondas 2–4** | Documentadas — sem autorização |

**STOP:** não misturar Onda 2 / kits / guest checkout / cutover MP-frete neste PR.

---

## Home hoje (ordem viva)

1. Campanhas (`HomeBannerCarousel`)  
2. Entrada unificada `#veiculo` (`HomeQuickEntry`): título + placa + **3 botões**  
3. Vitrine `#home-vitrine` — painel trocado pelos botões (sem scroll, sem abas)  
4. Ofertas (se houver)  
5. Confiança (`HomeTrustSection`)  
6. Footer  

**Removido / não usar na Home:** rail Suspensão/direção; tipografia gráfica no H1; bloco `HomeGarageSection` duplicado; abas Destaques|Categorias.

### Menus da vitrine (3 botões)

| Botão | Comportamento |
|-------|----------------|
| Buscar peça | Navega `/catalogo` |
| Ver categorias | Toggle painel Categorias na vitrine (sem sair da Home) |
| Meus veículos | Toggle painel `HomeVehiclesPanel` (sem sair da Home) |

Toggle de novo no botão ativo → volta aos **Destaques**.

---

## Entregas acumuladas (código)

| Item | Path / nota |
|------|-------------|
| Entrada + menus | `HomeQuickEntry.tsx`, `HomePage.tsx`, `HomeVehiclesPanel.tsx` |
| Confiança | `HomeTrustSection.tsx` |
| Vigência banners + mobile + qtd destaques | migration `20261110140000_store_home_vigencia_featured_limit.sql` + admin |
| Placa Evo1 | `VehiclePlateSearch` + Edge `plate-lookup` + `cached_plates` |
| Spec / ops / pacotes 2–4 | docs `FAL_MARCHA_HOME_*` + spec Home |

---

## Gates humanos (bola agora)

1. Apply SQL: `cached_plates` + `store_home_vigencia_featured_limit`  
2. Deploy Edge `plate-lookup` (`PLATE_PROVIDER=mock`)  
3. Commit/PR + publish Netlify  
4. Smoke: placa; Ver categorias / Meus veículos só trocam vitrine; Buscar peça → catálogo  

Handoff: [FAL_MARCHA_HOME_OPS_PLACA_HANDOFF_2026-11-10.md](./FAL_MARCHA_HOME_OPS_PLACA_HANDOFF_2026-11-10.md)

---

## Próximo pacote (só com autorização)

**Onda 2** — catálogo, PDP compatibilidade, 025, carrinho — [PACOTES](./FAL_MARCHA_HOME_ONDAS_2_4_PACOTES_2026-11-10.md)

---

## Score rápido

| Critério | Status |
|----------|--------|
| Campanhas → placa → vitrine | OK código |
| Sem scroll em Ver categorias / Meus veículos | OK código |
| Sem abas / garagem redundantes | OK código |
| SQL + publish + smoke | **PENDENTE eFe** |
