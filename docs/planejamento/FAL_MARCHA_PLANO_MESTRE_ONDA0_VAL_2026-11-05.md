# VAL — Plano mestre Onda 0 + início Onda 1

**Data:** 2026-11-05  
**Plano:** [FAL_PLANO_MESTRE_SITE_2026-11-05.md](./FAL_PLANO_MESTRE_SITE_2026-11-05.md)

## Entregas

| MARCHA | Status |
|--------|--------|
| Doc matriz | FEITO — `FAL_PLANO_MESTRE_SITE_2026-11-05.md` + backlog aponta |
| O0-D Fundação UI | FEITO — Button outline/outlineDark, ButtonLink, Toast+Link, ConfirmDialog, Modal trap, contraste muted, toUserMessage |
| O0-A Bugs cliente | FEITO — redefinir senha, cartão recusado retry, ScrollToTop pathname, loadMore error, frete×endereço, Pix copy, refreshUser |
| O0-B Bugs admin | FEITO parcial+ — reload silencioso pedido, romaneio Blob, toast/dirty produto, avisos 200, Base/Promo bloqueadas, reports→lista, operador sem auto-rebaixar |
| O0-C Copy | FEITO parcial+ — checkout/login/home/card MP sem VITE_/D-FRETE ao cliente |
| O1-A Inventário | FEITO — `FAL_INVENTARIO_DUPLICIDADES_ONDA1_2026-11-05.md` |
| O1-B Classificação | FEITO — merge + relatório integridade + cascata sem arquivadas |
| O1-C Caixas | **FEITO wtbp** — [VAL](./FAL_MARCHA_O1C_CAIXAS_WTBP_VAL_2026-11-05.md) · packing HTTP · [defaults categoria](./FAL_MARCHA_O1C_CATEGORY_DEFAULTS_VAL_2026-11-05.md) |
| O1-D/E Frete | **PARCIAL+** — ownq place_order + M7 entregue PASS; packing HTTP PASS; etiqueta ME purchase/print ainda gate · [VAL](./FAL_MARCHA_OWNQ_M7_SMOKE_VAL_2026-11-05.md) |
| O1-F Funil | FEITO — CPF skip, from no cadastro, confirmação `/pedido/:id/confirmacao`, Voltar na revisão |
| O1-G CTAs | FEITO — Comprar agora + Adicionar |
| O1-H Mobile | FEITO — MobileNav `lg:hidden`, padding main, 404 |
| O1-I Admin UX | PARCIAL — dashboard loading, reports link, merge classif, hub logística |

## Testes

- vitest: toUserMessage, productLabels, pickSmallestFittingBox — PASS

## Pendências explícitas (gate humano / runtime)

- ~~Aplicar migration caixas no wtbp~~ **FEITO** 05/11
- ~~Smoke ownq + packing HTTP~~ **FEITO** — [VAL](./FAL_MARCHA_OWNQ_M7_SMOKE_VAL_2026-11-05.md)
- ~~Wire packing na Edge cotação~~ **FEITO** — [VAL packing](./FAL_MARCHA_O1C_PACKING_QUOTE_VAL_2026-11-05.md)
- ~~ME-C3 preparação~~ **FEITO** — pedido smoke `f6c08149-…` · [VAL](./FAL_MARCHA_ME_C3_ETIQUETA_VAL_2026-11-05.md) · purchase→print ainda **gate humano**
- ~~Onda 2 pacote 1~~ **FEITO** — [VAL](./FAL_MARCHA_ONDA2_BUSCA_SEO_P1_VAL_2026-11-05.md) · SearchBar + title + JSON-LD + robots + cache categorias
- ~~Onda 2 facetas~~ **FEITO** — [VAL](./FAL_MARCHA_ONDA2_FACETAS_CLASSIF_VAL_2026-11-05.md) · Categoria→Grupo→Subgrupo no catálogo
- ~~Onda 2 favoritos batch~~ **FEITO** — [VAL](./FAL_MARCHA_ONDA2_FAVORITOS_BATCH_VAL_2026-11-05.md)
- ~~Categorias sync CRUD↔loja~~ **FEITO** — [VAL](./FAL_MARCHA_CATEGORIAS_SYNC_VAL_2026-11-05.md)
- ~~Onda 2 PDP slug~~ **FEITO** — [VAL](./FAL_MARCHA_ONDA2_PDP_SLUG_VAL_2026-11-05.md)
- ~~Onda 2 PDP path classificação~~ **FEITO** — [VAL](./FAL_MARCHA_ONDA2_PDP_PATH_VAL_2026-11-05.md)
- ~~Onda 2 RPC sugestões~~ **FEITO** — [VAL](./FAL_MARCHA_ONDA2_SUGESTOES_RPC_VAL_2026-11-05.md)
- ~~Onda 2 sitemap dinâmico~~ **FEITO** — [VAL](./FAL_MARCHA_ONDA2_SITEMAP_DINAMICO_VAL_2026-11-05.md) · **Onda 2 SEO fechada**
- ~~Onda 3 Home P1~~ **FEITO** — [VAL](./FAL_MARCHA_ONDA3_HOME_P1_VAL_2026-11-05.md) · veículo no topo · dedupe · rodapé/legal
- ~~Onda 3 carrosséis 07/08~~ **FEITO** — [VAL](./FAL_MARCHA_ONDA3_CARROSSEIS_VAL_2026-11-05.md)
- ~~Onda 3 admin Home 09/10~~ **FEITO** — [VAL](./FAL_MARCHA_ONDA3_ADMIN_HOME_VAL_2026-11-05.md)
- ~~Onda 3 Home layout + controle~~ **FEITO** — [VAL](./FAL_MARCHA_ONDA3_HOME_CONTROLE_VAL_2026-11-05.md) · veículo abaixo destaques · admin ↑↓
- ~~Onda 3 admin listas~~ **FEITO** — [VAL](./FAL_MARCHA_ONDA3_ADMIN_LISTAS_VAL_2026-11-05.md) · destaques tabela · produtos filtros compactos
- Cutover frete live (D-FRETE C / opt-in) — **não** feito

**Assinatura:** VAL parcial plano mestre 2026-11-05 · Onda 3 admin listas PASS.
