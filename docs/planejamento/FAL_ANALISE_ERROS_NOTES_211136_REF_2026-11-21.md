# FAL — Análise de erros · Notes_211136 (referência)

**Data:** 2026-11-21  
**Branch:** `dev` (somente)  
**Auth:** eFe — marcha um erro por vez  
**PDF:** `C:\Users\user\.cursor\projects\d-Programas-WEB-PROGRAMAS-WEB-PENDRIVE-FAL-PECAS-AUTOMOTIVAS\attachments\06569503-354e-4109-be7d-02b7c6dfc8d2\Notes_211136.pdf`  
**Extração:** Node `pdf-parse@1.1.1` (6 páginas; Python/pypdf indisponível no host)  
**Método:** um item por marcha — diagnosticar no código → validar estado → planejar → corrigir se preciso → testes focados + `tsc` → atualizar este REF → commit/push `origin/dev` → só então o próximo.

## Status

| # | Item | Status |
|---|------|--------|
| 1 | Kits: fotos individuais dos itens ao cadastrar, refletir na PDP do kit (além da principal) | **DONE** |
| 2 | Polimento e funções da garagem | **DONE** (verificado) |
| 3 | Carregamentos/hierarquias mais rápidos (frete PDP/garagem lento) | **DONE** |
| 4 | Arquivar/inativar: sumir da lista; filtro ativos/inativos (2 checkboxes) | **DONE** |
| 5 | Ajustar e melhorar favoritos | **DONE** |
| 6 | Placa consultada errada — assertividade do lookup | **DONE** |
| 7 | Cards poluídos / grandes no mobile | **DONE** |
| 8 | Header mobile muito cheio | **DONE** |
| 9 | Auditoria jornada real: caminhos errados, PDP relacionados, “ver no catálogo” filtrar certo | **DONE** |
| 10 | Textos/instruções do site — copy e coerência | **DONE** (fatia coerência) |
| 11 | Corrigir tela de favoritos | **DONE** (junto #5) |
| 12 | Seção destaques: configs não respeitadas | **DONE** |
| 13 | Ofertas/promoções: nome, itens + kits, textos e CTAs | **DONE** |
| 14 | LGPD, segurança, políticas garantia/devolução | PENDING |
| 15 | Meta Ads / Google Ads / Merchant (loja Google) | PENDING |
| 16 | Portal B2B | PENDING |
| 17 | Funil WhatsApp e sistema | PENDING |
| 18 | Home/campanhas: linkar produtos, categorias, grupos, veículos → página filtrada | **DONE** |

## Texto extraído (PDF)

### #1 Kits / fotos
Ajustar tela dos kits. Na tela do kit já devem mostrar as fotos individuais de cada item quando selecionado ao cadastrar e isso reflete na tela do produto (kit) tendo mais fotos além da principal que colocarmos caso ponha.

### #2 Garagem
Vamos garantir o polimento e funções da garagem.

### #3 Performance
Verificar carregamentos/hierarquias; deixar mais rápidos e fluidos — lento ao consultar frete na tela do produto ou na garagem.

### #4 Ativos/inativos
Ao arquivar/inativar um produto ele deve sumir da lista; opção de seleção ativos e inativos (duas caixinhas).

### #5 Favoritos
Vamos ajustar e melhorar os favoritos.

### #6 Placa
Pesquisei uma placa e saiu errado — validar e garantir assertividade (primeiro erro observado; regra base ok).

### #7 Cards
Estudar e melhorar os cards — poluídos e no mobile muito grandes.

### #8 Header mobile
Melhorar o header no mobile — está muito cheio.

### #9 Auditoria jornada
Usar o site de verdade: caminhos errados/incompletos; PDP itens relacionados; “ver no catálogo” filtrar corretamente; revisão em todas as telas.

### #10 Copy — **DONE** (2026-11-22, fatia coerência)
Analisar textos/informações/instruções pelo site e estudar o melhor a se dizer. → ver log Erro #10.

### #11 Favoritos (tela)
Ajustar e corrigir tela de favoritos.

### #12 Destaques — **DONE** (2026-11-22)
Configurações da seção de destaque não estão sendo respeitadas / refletidas. → ver log Erro #12.

### #13 Ofertas / promoções — **DONE** (2026-11-22)
Melhorar seção e apresentação das ofertas; colocar o nome de promoções; itens promocionais ativos + kits; textos e CTAs. → ver log Erro #13.

### #14 LGPD / normas
Estruturar e garantir segurança de dados (LGPD), políticas de garantia e devolução e demais normas.

### #15 Ads / Merchant
Integração Meta Ads e Google Ads; produtos na loja do Google (Merchant) — campanhas depois.

### #16 Portal B2B
Fazer portal B2B no site.

### #17 Funil WhatsApp
Fazer funil WhatsApp e sistema.

### #18 Home / campanhas — **DONE** (2026-11-22)
Melhorar home da loja; tela campanhas poder linkar produtos (1+), categorias, grupos ou veículos — botão mostra página de produtos selecionados. → ver log Erro #18.

## Log de marchas

### Erro #1 — Kits / fotos individuais → galeria PDP

| Campo | Valor |
|-------|--------|
| Status | **DONE** |
| Diagnóstico | Admin **já** mostrava thumbs na busca e no BOM (`adminPrimaryImageUrlMap`). Gap: sync só puxava **1 capa** se kit vazio; PDP do kit **não** acrescentava fotos dos itens além da própria galeria. |
| Já existia? | Parcial (thumbs admin + capa auto). Faltava galeria multi-item + reflexão na PDP. |
| Correção | (1) `adminEnsureKitImageFromComponents` sincroniza todas as primárias dos itens na galeria do kit, com prune de espelhos fora do BOM. (2) PDP: `loadStoreKitComposition` carrega `imageUrl`; `mergeKitGalleryWithComponentImages` na `ProductPage`; thumbs em `PdpKitCompositionBlock`. |
| Evidência testes | `pnpm exec vitest run src/services/products/productImages.test.ts` → 8/8 OK; `pnpm exec tsc --noEmit` → OK |
| Arquivos | `adminImageService.ts`, `AdminProductKitSection.tsx`, `AdminProductImagesSection.tsx`, `productImages.ts`, `productImages.test.ts`, `kitCompositionStoreService.ts`, `PdpKitCompositionBlock.tsx`, `ProductPage.tsx`, este REF |

**Próximo (não implementar nesta marcha):** Erro #2 — Polimento e funções da garagem.

### Erro #2 — Polimento e funções da garagem (análise + verificação)

| Campo | Valor |
|-------|--------|
| Status | **DONE** (já coberto pela fundação coerente + ajuste copy) |
| Diagnóstico | Notes pedia “garantir polimento e funções”. Na `dev` a onda fundação **já entregou** o caminho feliz: nav sem Cuidados; histórico = compras G7; visual 2D-first; checkout→`cv_id`; chain jornada. |
| Já existia? | **Sim, em grande parte** (`a6b442e`…`dce05af`, plano MARCHA CONCLUÍDA). Gap residual de copy: home ainda dizia “cuidados”. |
| Verificação gates | `tsc` + 24 testes (nav, engine, collapse, prefs, chain, snapshot) **PASS** (2026-11-21). |
| Ajuste nesta marcha | Copy home → “peças que cabem e histórico de compras na FAL”. |
| Fora do #2 | Lentidão frete/hierarquia → **#3**. Migration G7 no wtbp + smoke compra → ops. Cuidados/manutenção ficam em Mais → Avançado (proposital). |

**Próximo:** Erro #3 — Carregamentos/hierarquias / frete lento (PDP e garagem).

### Erro #3 — Carregamentos / frete lento

| Campo | Valor |
|-------|--------|
| Status | **DONE** |
| Diagnóstico | Cotação PDP ia direto em `provider.quote` **sem** o cache de `quoteFreight` (90s). ViaCEP sem cache. Árvore PVC (`getVehicleOptions`) re-buscava 4 queries a cada mount do seletor (garagem/catálogo). UI zerava envelope a cada consulta (pisca). |
| Correção | (1) Envelope usa `quoteFreight` com cache+envKey. (2) Cache ViaCEP 10 min. (3) Cache+inflight `getVehicleOptions` 5 min. (4) PDP: seq anti-stale + mantém resultado anterior enquanto carrega. |
| Evidência | `tsc` PASS · `freightService.test` + storefront/smoke/pvc **16 PASS** |
| Residual | Latência 1ª cotação ME/Edge ainda depende da rede; Edge própria fora deste escopo. |

**Próximo:** Erro #4 — Arquivar/inativar + filtro ativos/inativos.

---

## Trilha paralela · Guias Adaptive (estudo 2026-11-21)

**Intenção:** facilitar alteração (categoria / aplicação / preços) **pela guia**, sem depender da ficha.  
**Plano:** [FAL_PLANO_GUIAS_FACILITAR_ALTERACOES_2026-11-21.md](./FAL_PLANO_GUIAS_FACILITAR_ALTERACOES_2026-11-21.md)  
**Decisões travadas:** (1) surface Apps **completa** + ano início/fim no cadastro; (2) ver/alterar preços de **várias listas** na guia; (3) categoria com **seletores**; UX em **mini-menus** (um painel ativo).  
**Implementação:** marchas G1→G4 no plano. Não substitui Notes #4+.

### Estrutura widgets Home (2026-11-21)

Registry `productWidgets` · **bestsellers ready** (RPC + trilho Home).  
`new_arrivals` / `campaign` ainda planned.  
Doc: [FAL_ESTRUTURA_PRODUCT_WIDGETS_HOME_2026-11-21.md](./FAL_ESTRUTURA_PRODUCT_WIDGETS_HOME_2026-11-21.md).

---

## Auditoria de implantações (2026-11-21) — correções

Revisão minuciosa pós-G1 / bestsellers / caches #3 / kits #1.

| Gap | Correção |
|-----|----------|
| CTA Ofertas `?promo=1` ignorado no catálogo | `CatalogPage` lista ofertas reais + chip “Só ofertas” |
| Trilho bestsellers esvaziava após dedupe | Overfetch ×2 + `slice` no limite do widget |
| Frete/CEP: double-click → 2 hits rede | Coalescing de `inflight` em `quoteFreight` e ViaCEP |
| `?section=Aplicações` com acento falhava | Normalização NFD em `parseProductGuideSectionParam` |
| Critério de oferta duplicado | `productHasActivePromo` compartilhado |

**Evidência:** `tsc --noEmit` + 21 testes focados PASS.  
**Ops residual (não código):** migration G7 COALESCE no wtbp (bestsellers + favorites RPCs **aplicadas** 2026-11-21).

---

### Erros #5 + #11 — Favoritos (ajustar + tela)

| Campo | Valor |
|-------|--------|
| Status | **DONE** |
| Diagnóstico | Lista da conta sem imagens; desfavoritar deixava card na grade; bloco “arquivados” morto (RLS `products` só published); empty state mentia; refresh com erro zerava corações; sem retry. |
| Correção | (1) `listFavoriteProducts` hidrata preço/apps/fotos + RPC `store_list_my_favorites` (metadados mesmo arquivado). (2) Página sincroniza com `favoriteIds` + remove órfãos. (3) Contexto otimista e não zera IDs em erro. (4) Copy/empty/retry/quiet toast. |
| Evidência | `tsc` + `favoriteService.test` PASS · RPC aplicada no wtbp |
| Arquivos | `favoriteService.ts`, migration `20261121220000_*`, `FavoritesContext`, `AccountFavoritesPage`, `ProductCard`, este REF |

### Erro #4 — Arquivar/inativar + Ativos/Inativos

| Campo | Valor |
|-------|--------|
| Status | **DONE** |
| Diagnóstico | Lista default sem excluir `archived`; select Status misturava ciclo de vida; chip “Ativos” era só rótulo. |
| Estrutura | `adminProductLifecycle` (padrão Categorias). Query: ativos por default; checkboxes Ativos/Inativos na barra; select fino só draft/published. Arquivar some da lista na hora. |
| Evidência | `tsc` + `adminProductLifecycle.test` 7 PASS |
| Arquivos | `adminProductLifecycle.ts`, `adminProductService.ts`, `AdminProductsPage.tsx`, este REF |

### Erro #6 — Placa + assertividade + IA

| Campo | Valor |
|-------|--------|
| Status | **DONE** |
| Diagnóstico | Lookup ok na base, mas UI sem faixa INV; `ambiguous` quase só mock; modelos irmãos (Kwid × Kwid Intense) podiam confirmar errado; sem LLM na placa. |
| Estrutura | (1) `assertPlateAgainstCatalog` — ranking no mestre + ambiguidade de família split. (2) Faixa A–D na conferência + escolha obrigatória se ambíguo. (3) `assistPlateIdentity` — Groq via `interpret-search-nl` (flags `VITE_PLATE_NL_LLM` / `VITE_SEARCH_NL_LLM`), merge só contra catálogo. (4) Edge devolve `confidenceBand`. |
| Evidência | `tsc` + `plateIdentityAssert.test` 5 PASS |
| Ops | **DONE** redeploy Edge `plate-lookup` (2026-11-21) — `confidenceBand` na resposta. VAL híbrido: `hybridVehicleIntegration.test.ts`. |

### Trilha paralela — mestre / Integrações (não reabre #6)

Hub Admin Veículos → Integrações + seed fipeX via CSV no import existente. Spec: [FAL_PLANO_MESTRE_VEICULOS_HIBRIDO_INTEGRACOES_2026-11-21.md](./FAL_PLANO_MESTRE_VEICULOS_HIBRIDO_INTEGRACOES_2026-11-21.md). Loja híbrida e assert #6 permanecem DONE.

### Onda mestre inteligente (pós-auditoria · não reabre #6)

Vida de linha em `models.production_year_*` · sync validado no hub · hard-block confirm/reconcile (residual PDF versão errada). Spec no doc híbrido + plano Cursor. #6 core (band/família/assist) intacto.

**Mapa canônico (caminhos · relações · layout · writers):** [FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md](../arquitetura/FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md) — não recopiar regras aqui.

### Inteligência ≥8,5 — Fase 1 (2026-11-21 · não reabre #6)

| Campo | Valor |
|-------|--------|
| Status | **DONE** (Fase 1) |
| Lookup | Edge `plate-lookup` **read-only** (sem upsert fresco/cache); IDs só SELECT; escrita em `vehicle-confirm-upsert` |
| INV | `ambiguous` família irmã; `allowCanonicalUpsert=false` no lookup |
| Dual year | Snapshot `yearModel` + `yearFabrication`; filtro prefere ano-modelo |
| R2 | Client `vehicleCanonicalUpsert` exige ano |
| Vida de linha | Bootstrap min/max VV → `production_year_*` no mestre ativo |
| Evidência | vitest plates/vehicles **121+ PASS** · redeploy Edge `plate-lookup` wtbp… · vida de linha **112**/127 |
| Fase 2 | Flags Edge `PLATE_FIPE_ASSIST=1` (`/basico-fipe` + multi-candidato) · `PLATE_ENGINE_STEPUP=1` (`/motor`) · hub chip vida de linha |
| Ops flags | Definir secrets no projeto **dev** só quando quiser custo extra ApiPlacas |
| VAL jornada 2026-11-21 | **PASS** 68+ unit · UI: `pastilha HB20 2015` → `maker/model/year` · mosca Troller: LLM inventava filtro → **fix** `mergeSearchIntent` descarta modelo fora do mestre · reteste UI sem chip Troller |
| Próximo | VAL placa real ApiPlacas (ops) · sync fipeX dump completo quando disponível · ver [mapa](../arquitetura/FAL_MAPA_VEICULO_CAMINHOS_RELACOES_2026-11-21.md) |

### Inteligência — Riqueza→8,5 + Assert→9 (2026-11-21 · não reabre #6)

| Campo | Valor |
|-------|--------|
| Status | **DONE** (dev) |
| Assert-1 | `yearsByModel` = VV + vida; **PVC fora** do seletor (fit só em `search_products`) |
| Assert-2 | Re-assert pós-candidato + dual year na confirmação; exact win não reabre irmãos |
| Riqueza | Crossfox→Cross Fox; CHEV/QQ inactive; thin makers ocos + shells BMW/Audi/CAOA/Citroën/Hyundai |
| Métricas mestre | makers ocos **0** · models active **134**/134 com vida · VV active **330** · models sem VV **0** |
| VAL | mosca T1–T8 + plateIdentityAssert dual year **PASS** |
| Score interno | Riqueza ~**8,5** · Assert ~**9** (falta VAL placa real + dump fipeX completo p/ 10) |
| Garantias | `assertivenessGuaranteesAntiregress` + `vehicleOptionsIdentityAntiregress` · R4 residual superseded (confirm-writer) |
| Fora | Flags FIPE/motor off até ops; MAIN/produção; predicado FIPE; Notes #6 |

### Erro #7 — Cards poluídos / mobile

| Campo | Valor |
|-------|--------|
| Status | **DONE** |
| Diagnóstico | `ProductCard` único empilhava meta (cat/fab/lado) + apps até 4 + Pix/parcelas + 2 CTAs full-width em grade `grid-cols-2` com foto 132px — altura e ruído no mobile. |
| Estrutura | (1) Foto card `104px` mobile. (2) Meta extra só `sm+`; ref permanece. (3) Apps card: 2 linhas, sem “Mais”. (4) Condições pagamento só `sm+`. (5) Mobile: 1 CTA Adicionar + link Comprar; `sm+` dois botões. (6) Favorito menor no mobile. |
| Evidência | `tsc` + `CompatibilityAppsBlock` 6 PASS + `compatUiAntiregress` 20 PASS (M15 selo após título intacto) |
| Arquivos | `ProductCard.tsx`, `ProductMediaFrame.tsx`, `CompatibilityAppsBlock.tsx` (+test), este REF |

### Erro #8 — Header mobile muito cheio

| Campo | Valor |
|-------|--------|
| Status | **DONE** |
| Diagnóstico | Topo mobile empilhava tema + garagem compacta + sino + ☰ junto da busca; `MobileNav` já cobre Início/Catálogo/Garagem/Carrinho/Conta; drawer já tinha garagem. |
| Estrutura | (1) Topo mobile = logo + busca + ☰. (2) Tema no drawer (Aparência). (3) Garagem/avisos/carrinho no drawer e/ou bottom nav. Desktop `lg:` intacto. |
| Evidência | `Header.mobileAntiregress` 2 PASS · `tsc --noEmit` OK |
| Arquivos | `Header.tsx`, `Header.mobileAntiregress.test.ts`, este REF |

### Erro #9 — Auditoria jornada / Ver no catálogo

| Campo | Valor |
|-------|--------|
| Status | **DONE** (fatia objetiva) |
| Diagnóstico | (1) PDP/Carrinho apontavam `/garagem` (rota inexistente). (2) “Ver mais” nos relacionados só usava `cat=` e **descartava** o veículo ativo. |
| Estrutura | (1) Links → `/conta/veiculos` + redirect legado `/garagem`. (2) `buildCatalogBrowseHref` junta `cat` + maker/model/year/engine/version + `vehicle=1`. Relacionados já usavam `fitFilter`; link de seção agora coerente. |
| Evidência | `productDescription` + `compatUiAntiregress` **26 PASS** |
| Arquivos | `productDescription.ts`, `ProductPage.tsx`, `CartPage.tsx`, `router.tsx`, este REF |
| Fora desta fatia | Smoke E2E manual em todas as telas; copy (#10); destaques (#12) |

### Erro #18 — Home / campanhas → catálogo filtrado

| Campo | Valor |
|-------|--------|
| Status | **DONE** (+ composto 2026-11-22) |
| Diagnóstico | Admin gravava só `to`/`href` livre; sem UI para cat/ids/veículo. Catálogo não lia `?ids=` como seleção curada. Trilho `campaign` (widget) permanece **planned**. |
| Estrutura | (1) Encoder canônico `catalogHref` (Gate 0). (2) `homeCampaignLink` kinds + **filter** multi-cat/multi-model; **ids XOR filtro**. (3) RPC `search_products` CSV. (4) Admin pickers + Testar destino. (5) Arte **1376×768**. |
| Evidência | `catalogHref`/`homeCampaignLink`/garage/PDP widgets · `tsc` OK · wtbp migration multi · VAL composto |
| Arquivos | `catalogHref.ts`, `homeCampaignLink.ts`, `AdminHomeContentPage.tsx`, `CatalogPage.tsx`, `HomeBannerCarousel.tsx`, mapa §3.4, VAL |
| Fora | Trilho widget `campaign`; multi-maker misturado; smoke E2E |

### Erro #10 — Copy / textos e instruções (coerência)

| Campo | Valor |
|-------|--------|
| Status | **DONE** (fatia objetiva) |
| Diagnóstico | Marca **Minha Garagem** vs “Garagem” solto; busca sem placa; empty catálogo com jargão SKU/sessão; “produto/item” onde a jornada fala **peça**. |
| Estrutura | (1) Header + conta + Home/quick pick unificam **Minha Garagem**. (2) `searchCopy` prioriza placa/peça. (3) Catálogo: empty + contagem + “Limpar veículo ativo”. (4) Widgets/Home/favoritos/PDP: peça. |
| Evidência | `searchCopy` + Header mobile + widgets + garageNav **10 PASS** · `tsc` OK |
| Fora | Rename módulo “Cuidados”; reescrita marketing ampla; Notes #12/#13 |
| Arquivos | `searchCopy.ts`, `Header.tsx`, `CatalogPage.tsx`, `HomeVehiclesPanel.tsx`, `AccountVehiclesPage.tsx`, VAL, este REF |

### Erro #12 — Destaques / configs não respeitadas

| Campo | Valor |
|-------|--------|
| Status | **DONE** |
| Diagnóstico | (1) `listFeaturedProducts` fazia **backfill** de catálogo quando curadoria &lt; limite — “desligar” no admin não sumia. (2) Home lia limite só no mount e após dedupe com Ofertas o trilho ficava curto. |
| Estrutura | (1) Com fila curada: só ativos na ordem (`resolveFeaturedShelf`). (2) Home: `useHomePresentation().featuredDisplayLimit` + overfetch + `.slice` pós-dedupe. Selo/% já vinham do presentation. |
| Evidência | `homeSections` **8 PASS** · `tsc` OK |
| Arquivos | `homeSections.ts` (+test), `productService.ts`, `HomePage.tsx`, VAL, este REF |
| Fora | Notes #13 ofertas/promo naming |

### Erro #13 — Promoções (rename + itens/kits + CTAs)

| Campo | Valor |
|-------|--------|
| Status | **DONE** |
| Diagnóstico | Vitrine “Ofertas” desalinhada do hub; CTAs fallback errados; rail por `created_at` omitia kits com gate. |
| Estrutura | (1) Copy **Promoções** / selo **Promoção**. (2) `listActivePromotionProductIds` + `pickPromoHighlightShelf` (gate + mix item/kit). (3) Home CTAs `?promo=1`. |
| Evidência | `promoShelf` / `promoPresentation` / `productWidgets` · `tsc` OK |
| Arquivos | `promoPresentation.ts`, `productWidgets.ts`, `promoShelf.ts`, `productService.ts`, `HomePage.tsx`, VAL, este REF |
| Fora | Nome da lista no título Home; widget campaign |

**Próximo Notes:** Erro #14 — LGPD / políticas.
