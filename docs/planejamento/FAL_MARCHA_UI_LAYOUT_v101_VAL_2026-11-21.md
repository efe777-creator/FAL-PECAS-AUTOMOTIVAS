# MARCHA VAL — FAL-UI-LAYOUT v1.0.1 (ajustes + smoke inteligente)

Data: 2026-11-21 · branch **`dev`**  
Padrão: [FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1_2026-11-21.md](./FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1_2026-11-21.md) **v1.0.1**  
Origem: gaps P1/P2 do [uso real catálogo](./FAL_MARCHA_CATALOGO_ADAPTIVE_USO_REAL_2026-11-21.md)

## Gates automáticos

| Camada | Resultado |
|--------|-----------|
| `tsc --noEmit` | **PASS** |
| `pnpm test:ui-layout-antiregress` | **PASS** · 3 files · **18** tests (FL1–FL10 + FL4b) |

## Ajustes entregues (v1.0.1)

| ID | Fix |
|----|-----|
| P1.1 | Compact Produtos/Kits: cards no primary (`*-list-mobile` / `*-list-desktop`) |
| P1.2 | BOM: `loadingBom` → “Carregando composição…” (sem flash empty) |
| P2 | Hint compact Enter; title `Listas de preço`; remove `data-workspace-primary` hardcoded em Produtos |

## Smoke inteligente (staff · `127.0.0.1:5173`)

| Jornada | Checks | Resultado |
|---------|--------|-----------|
| **Kits** Novo kit → Abrir guia | `cardsForced` mobile=block/desktop=none; guia abriu (Na guia); BOM **3 itens**; hint Enter; emptyFlash=false | **PASS** |
| **Produtos** Abrir guia | compact + cards; hardcodedGone; Aberto na guia / Liberar | **PASS** |
| **Preços** | title `Listas de preço \| Admin FAL`; Abrir guia Base; kits-manual sem Abrir guia | **PASS** |
| **Painel KPI** | grid 2×2 (`twoByTwo`) | **PASS** |

## Garantias (locks)

- FL4 agora exige CSS catálogo compact + hubs `admin-products-hub` / `admin-kits-hub`
- FL4b: `loadingBom` + “Carregando composição” + “Enter no destaque”
- Script: `pnpm test:ui-layout-antiregress`

## Ainda aberto (não bloqueia v1.0.1)

| Item | Notas |
|------|-------|
| Novo produto guia curta | Candidato **v1.1** |
| Save 1 preço na guia Base E2E | VAL fino |
| Multi-guia 2 SKUs smoke | VAL fino |
| PDP kit preço | Regressão loja |

## Veredito

**v1.0.1 FECHADA** — ajustes P1/P2 + antiregress + smoke hubs/Painel **PASS**.  
Sucessora antiregress: [FAL_MARCHA_UI_LAYOUT_v102_VAL_2026-11-21.md](./FAL_MARCHA_UI_LAYOUT_v102_VAL_2026-11-21.md) (FL11–FL13).  
Sem main/prod. Commit só sob pedido eFe.

**Assinatura:** marcha testes/ajustes/validação · 2026-11-21
