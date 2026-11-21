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
| 4 | Arquivar/inativar: sumir da lista; filtro ativos/inativos (2 checkboxes) | PENDING |
| 5 | Ajustar e melhorar favoritos | PENDING |
| 6 | Placa consultada errada — assertividade do lookup | PENDING |
| 7 | Cards poluídos / grandes no mobile | PENDING |
| 8 | Header mobile muito cheio | PENDING |
| 9 | Auditoria jornada real: caminhos errados, PDP relacionados, “ver no catálogo” filtrar certo | PENDING |
| 10 | Textos/instruções do site — copy e coerência | PENDING |
| 11 | Corrigir tela de favoritos | PENDING |
| 12 | Seção destaques: configs não respeitadas | PENDING |
| 13 | Ofertas/promoções: nome, itens + kits, textos e CTAs | PENDING (registry widgets criado) |
| 14 | LGPD, segurança, políticas garantia/devolução | PENDING |
| 15 | Meta Ads / Google Ads / Merchant (loja Google) | PENDING |
| 16 | Portal B2B | PENDING |
| 17 | Funil WhatsApp e sistema | PENDING |
| 18 | Home/campanhas: linkar produtos, categorias, grupos, veículos → página filtrada | PENDING |

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

### #10 Copy
Analisar textos/informações/instruções pelo site e estudar o melhor a se dizer.

### #11 Favoritos (tela)
Ajustar e corrigir tela de favoritos.

### #12 Destaques
Configurações da seção de destaque não estão sendo respeitadas / refletidas.

### #13 Ofertas / promoções
Melhorar seção e apresentação das ofertas; colocar o nome de promoções; itens promocionais ativos + kits; textos e CTAs.

### #14 LGPD / normas
Estruturar e garantir segurança de dados (LGPD), políticas de garantia e devolução e demais normas.

### #15 Ads / Merchant
Integração Meta Ads e Google Ads; produtos na loja do Google (Merchant) — campanhas depois.

### #16 Portal B2B
Fazer portal B2B no site.

### #17 Funil WhatsApp
Fazer funil WhatsApp e sistema.

### #18 Home / campanhas
Melhorar home da loja; tela campanhas poder linkar produtos (1+), categorias, grupos ou veículos — botão mostra página de produtos selecionados.

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

Registry `productWidgets` + loader stub (`bestsellers`/`new_arrivals`/`campaign` planned).  
Doc: [FAL_ESTRUTURA_PRODUCT_WIDGETS_HOME_2026-11-21.md](./FAL_ESTRUTURA_PRODUCT_WIDGETS_HOME_2026-11-21.md).
