# FAL — Auditoria completa e especificação de redesign da PDP

**Projeto:** FAL Peças Automotivas  
**Tela:** Página de Produto (PDP)  
**Rota:** `/produto/:slugOrId`  
**Arquivo principal:** `fal-pecas/src/pages/Product/ProductPage.tsx`  
**Data da auditoria:** 2026-11-20  
**Branch de referência:** `dev`  
**Escopo deste documento:** diagnóstico factual + proposta + matrizes — **sem implementação**  
**Canônico compat:** E.2 em `FAL_PLANO_BUSCA_EQUIVALENCIA_COMPATIBILIDADE_2026.md`  
**Spec consolidada (12/12 fechadas):** `FAL_PDP_REDESIGN_SPEC_CONSOLIDADA_2026-11-20.md` · marchas: `FAL_PDP_REDESIGN_MARCHAS_2026-11-20.md`

---

## Como ler este relatório

| Tipo | Significado |
|------|-------------|
| **FATO** | Observado no código/tokens na data da auditoria |
| **RECOMENDAÇÃO** | Proposta de redesign; não é decisão fechada (exceto § decisões preliminares) |
| **LACUNA** | Canônico ou brief pede; código ainda não entrega |
| **RISCO** | Regressão possível se implementar mal |

**Decisões preliminares já registradas pelo brief (assumidas na proposta B–D):**

1. Galeria **45%** / painel comercial **55%**  
2. Container máx. **1440 px**  
3. Imagem principal **4:3**, miniaturas verticais (desktop) / horizontais (mobile)  
4. `object-fit: contain`  
5. Zoom híbrido: hover desktop + lightbox no clique; mobile toque → lightbox  
6. Prioridade comercial: **compra primeiro**  
7. Compatibilidade **obrigatoriamente antes** dos CTAs (E.2)

---

# A. Diagnóstico atual

## A.1 Como a PDP funciona (FATO)

### Dados e carregamento

1. Lê `slugOrId` da rota.  
2. Busca produto (`getProductBySlugOrId`); carrega equivalentes, relacionados, cadeia de categorias.  
3. Estados de UI: `Loading` → sucesso; `EmptyState` (não encontrado / backend); `ErrorState`.  
4. SEO: `useDocumentTitle`, Open Graph, JSON-LD de produto.  
5. Analytics: `trackViewItem` ao exibir; `trackAddToCart` no add.

### Compatibilidade (domínio)

1. Fit = `garage.activeFilter` (chip do header / sessão guest ou logado).  
2. PVC via `loadPvcEvidenceByProductIds` → `classifyCardCompatibility`.  
3. Form local ano/motor/versão (`verifyApplied`) **só reavalia a PDP**; **não** altera o chip.  
4. Buy-box: `CompatVerdictSummary` (framed).  
5. Detalhes: apps + form **somente** se selo `check` ou `similar`.  
6. Add/buy: `confirmDialog` se `needsCompatPurchaseConfirm` (similar / A verificar). Incompatível **não** exige esse confirm.

### Compra

| Ação | Fluxo |
|------|--------|
| Adicionar ao carrinho | confirm fit se preciso → `addItem(qty)` → toast |
| Comprar agora | confirm → `saveBuyNowIntent` + snapshot veículo → `/checkout` |
| WhatsApp | deep link com nome, ref, qtd, URL (se telefone configurado) |
| Favoritar | exige login; senão `/login` |
| Frete PDP | cotação + `saveShippingQuoteHandoff` para checkout |

## A.2 Estrutura de layout (FATO)

```
Container (max-w 1240px, py-8)
├── Voltar
├── Breadcrumb
├── Grid 1 col → lg: 2 col (gap-8)     ← 50/50, não 45/55
│   ├── ProductGallery
│   └── Buy-box (rounded-fal, border, p-5)
│       ├── Favorito (absolute)
│       ├── Título / ref / fabricante / oferta / preço
│       ├── PaymentConditionHint + StorePaymentMethodsBlock
│       ├── Disponível
│       ├── CompatVerdictSummary          ← E.2 acima dos CTAs
│       ├── Qtd + ProductShippingQuoteBlock + CTAs + WA
├── #pdp-detalhes (mt-8)
│   ├── Compat (veículo+Trocar, form?, apps)
│   ├── Descrição / Specs / ajuda
├── Equivalentes (ProductCard × N)
└── Relacionados (ProductCard × N)
```

**Breakpoints FAL** (`index.css`): `sm` = **620px**, `lg` = **900px**.  
**Sticky:** nenhum na PDP.

## A.3 Tokens e design system (FATO)

Fonte: `fal-pecas/src/styles/index.css`.

| Token | Light |
|-------|--------|
| `--fal-navy` | `#303846` |
| `--fal-yellow` | `#f2c84b` |
| `--fal-bg` | `#f4f6f7` |
| `--fal-surface` | `#ffffff` |
| `--fal-surface-2` | `#f8f9fa` |
| `--fal-line` | `#dfe4e8` |
| `--fal-success` / `--fal-danger` | `#168a55` / `#c0392b` |
| `--fal-radius` | `14px` → `rounded-fal` |
| `--fal-shadow` | `0 10px 30px rgba(33,42,52,0.1)` |
| `--fal-container` | `1240px` |
| Font | Inter, Arial, sans-serif |

**Inconsistências na PDP:**

- `Container` hardcoda `max-w-[1240px]` (não usa `var(--fal-container)`).  
- Fundos `#f8f9fa` hardcoded na mídia (equivale a surface-2, mas foge do token).  
- Raios mistos: `rounded-fal` (14), `rounded-2xl` (galeria), `rounded-[10px]`, `rounded-[8px]`.  
- Pix em `text-emerald-800` (fora de `fal-success`).  
- WhatsApp em hex `#128C7E` / `#25D366`.

## A.4 Galeria (FATO)

| Item | Implementação |
|------|----------------|
| Layout | Thumbs topo (mobile) / esquerda (`sm+`); principal à direita |
| Thumb | 64×64, border 2px |
| Frame | `min-h-[300px]` / `lg:min-h-[480px]`, `rounded-2xl`, **sem** aspect 4:3 |
| Img | `object-contain` + scale 1.06; hover scale 1.08 (não é loupe) |
| Lightbox | Zoom 1–6, wheel, pan, duplo clique; `z-[280]` |

## A.5 Buy-box e blocos verbosos (FATO)

- Preço: `text-3xl font-black`; oferta com badge + riscado.  
- **Duplicação de pagamento:** linhas Pix/parcelas (`PaymentConditionHint`) **e** cards “Formas de pagamento” (`StorePaymentMethodsBlock` — só surface `pdp`).  
- **Frete:** `ProductShippingQuoteBlock` completo **dentro** do buy-box (CEP, retirada, opções, totais) — maior consumidor de altura vertical antes/entre CTAs.  
- Frete só se `weightKg/height/width/length` todos &gt; 0; senão mensagem de indisponibilidade.  
- Qtd: 1–99, alvos `h-11`.  
- CTAs: primary “Comprar agora”, light “Adicionar”; link `#pdp-detalhes`.

## A.6 Compatibilidade UI (FATO)

| Superfície | Conteúdo |
|------------|----------|
| Buy-box | `CompatVerdictSummary` framed; motivo; **sem** faltante (`showFaltante` default false) |
| Detalhes | Veículo + Trocar `/garagem`; form se check/similar; `CompatibilityAppsBlock` (até 8 linhas) |
| Sem fit | Hint “Confirme um veículo no chip…” — **sem** `VehicleSelector` na PDP |

`VehicleSelector` existe em `GarageActiveSwitcher` (header), não embutido na PDP.

## A.7 Campos `Product` (FATO)

**Usados na PDP:** id, sku, commercialRef, name, slug, brand, images/imageUrl, prices, available, descriptions, category*, compatibility*, manufacturerCode, posicao, lado, references, attrs, dimensões logísticas.

**No tipo, não surfaceados na vitrine PDP:** `stock` (comentário no tipo: loja pública usa `available`), `isIncomplete`, `status`, `supplierId`, `compatibleVehicleCodes`, portes logísticos avançados, etc.

**Não inventar** “estoque limitado” sem decisão explícita.

## A.8 Pontos fortes (FATO)

1. Aviso E.2 acima dos CTAs + dedup (`CompatVerdictSummary`).  
2. Motor PVC alinhado card/PDP; anti-regress `npm run test:compat-antiregress`.  
3. Lightbox funcional; contain sem crop.  
4. Buy-now + handoff de frete; snapshot de veículo.  
5. Tokens FAL + dark mode documentados.  
6. Equivalentes técnicos distintos de relacionados comerciais (E.6).

## A.9 Problemas — desperdício, fragmentação, hierarquia (FATO + leitura UX)

| # | Problema | Impacto |
|---|----------|---------|
| 1 | Frete + métodos de pagamento incham o buy-box | CTAs e preço perdem hierarquia; scroll mobile longo |
| 2 | Pagamento em duas camadas | Ruído visual |
| 3 | Quatro+ “cards” empilhados em detalhes | Página parece dashboard, não ficha comercial |
| 4 | Form compat longe do CTA | E.2 “form junto” / sheet mobile: **LACUNA** |
| 5 | Sem mini-seletor na PDP | Abandona contexto para garagem/chip |
| 6 | Galeria sem 4:3; grid 50/50; container 1240 | Fora do brief 45/55, 1440, 4:3 |
| 7 | Sem sticky / barra mobile | Em desktop longo e mobile, compra compete com scroll |
| 8 | ProductCard em carrosséis carrega PVC individual | Perf + selos atrasados |
| 9 | Breakpoint thumbs (`sm` 620) ≠ hero 2-col (`lg` 900) | Zona intermediária assimétrica |

## A.10 Lacunas vs E.2 canônico (FATO)

| Canônico E.2 | Código atual |
|--------------|--------------|
| Compat na coluna compra com motivo/faltante/form | Resumo no buy-box; form em `#pdp-detalhes`; faltante omitido no buy-box |
| Mobile: form em sheet | Form inline |
| Sem veículo: mini-seletor + Verificar | Só copy + link garagem |
| Compat acima do CTA | **Atendido** pelo summary no buy-box |
| Form não altera chip | **Atendido** |

---

# B. Proposta de novo layout (RECOMENDAÇÃO)

## B.1 Conceito

**Compacta + Premium + Inteligente.**  
Ficha comercial: fundo `fal-bg`, superfícies brancas, menos caixas internas, hierarquia compra → fit → auxiliar.

## B.2 Desktop (≥ lg 900px; ideal ≥ 1200)

```
[ Voltar · breadcrumb compacto — sem duplicar chrome do header ]

┌──────────── 45% ────────────┬────────────── 55% ──────────────┐
│ Galeria 4:3                 │ Painel comercial (sticky*)      │
│ thumbs verticais à esquerda │ ID → preço → compat → disp/qtd  │
│ hover-zoom + lightbox       │ → CTAs → pag/frete compactos    │
└─────────────────────────────┴─────────────────────────────────┘

Bloco técnico (híbrido abas) → Equivalentes → Relacionados
```

\\* Sticky apenas enquanto a região principal estiver visível; para ao encontrar o bloco técnico.

**Container:** máx. **1440px** (preliminar).

## B.3 Tablet (620–899)

Uma coluna: galeria (thumbs horizontais) → painel full width. Sem sticky agressivo. Form em sheet se check/similar.

## B.4 Mobile (&lt; 620)

```
Galeria 4:3 + thumbs
Painel: ID · preço · CompatVerdict · disp/qtd · CTAs
Pag/frete: linhas / accordion
Barra inferior: preço curto + CTA primário
  (respeita indisponível e confirms de fit)
Técnico em acordeão
```

Compat continua no painel **antes** dos CTAs (não só na barra).

## B.5 Ordem do painel comercial (compra primeiro)

1. Nome (clamp) + favorito (+ compartilhar se aprovado)  
2. Fabricante · referência  
3. Badge oferta  
4. Preço + riscado/desconto  
5. Uma linha Pix/parcelas (detalhe expansível)  
6. **CompatVerdictSummary** (+ faltante quando check/similar)  
7. Disponível  
8. Quantidade compacta  
9. Comprar agora → Adicionar  
10. WhatsApp  
11. Frete colapsado (CEP + resumo; expandir cotação)

## B.6 Conteúdo abaixo — alternativas

| Opção | Prós | Contras |
|-------|------|---------|
| **Híbrido abas desktop + acordeão mobile (recomendado)** | Consulta rápida; menos scroll | Precisa primitivo de abas |
| Só acordeão | Simples | Mais cliques desktop |
| Empilhado polish (status quo melhorado) | Menos código | Mantém desperdício vertical |

**Aplicação detalhada:** não repetir veredito do buy-box; veículo+Trocar + form + apps.

## B.7 Equivalentes / relacionados

Cards compactos com selo se fit ativo.  
**Não** apresentar incompatível como recomendação positiva (selo hide / tratamento visual distinto — ver decisões abertas).

---

# C. Especificação visual (RECOMENDAÇÃO sobre tokens existentes)

| Uso | Valor |
|-----|--------|
| Fundo página | `fal-bg` |
| Painel / galeria | `fal-surface` |
| Fundo mídia | `fal-surface-2` (eliminar hex solto) |
| Bordas | `fal-line` 1px; sombra só lightbox / elevação sticky leve |
| CTA primário | `fal-yellow` / hover `fal-yellow-hover`; texto `fal-navy-dark` |
| Título | navy, ~26–32px extrabold |
| Preço | ~28–36px black |
| Compat estados | success / yellow / line / danger (já no badge) |
| Raio PDP | **unificar** (ver decisão: 14 vs 10) |
| Galeria | aspect **4:3**, `object-contain` |
| Container | **1440** (preliminar) vs 1240 atual |

**Não criar** tokens de cor novos na v1, salvo atualizar `--fal-container` se 1440 for aprovado globalmente.

---

# D. Especificação de UX (RECOMENDAÇÃO)

## D.1 Galeria

- Desktop: zoom hover (loupe ou região ampliada) na área 4:3; clique → lightbox atual.  
- Mobile: toque → lightbox; contador `i / n`; fechar X / scrim / Escape.  
- Thumb ativa: borda navy 2px.

## D.2 Estados de compatibilidade (preservar política)

| Estado | UI proposta | Regras intactas |
|--------|-------------|-----------------|
| Sem veículo | muted + CTA informar veículo | Nunca = compatível |
| Compatível | framed success | — |
| Similar | yellow + faltante + form/sheet | confirm na compra |
| A verificar | neutro + faltante + form/sheet | confirm na compra |
| Incompatível | danger + motivo | não suavizar; CTAs seguem código atual |

Form local **não** altera chip. Motor PVC **não** muda nesta onda visual.

## D.3 Sticky e barra mobile

- Sticky desktop: `top` abaixo do header; scroll interno do painel se conteúdo &gt; viewport.  
- Barra mobile: preço + primário; oculta se indisponível ou sheet/teclado aberto.

## D.4 Fluxos a preservar

add cart, buy-now, handoff frete, WhatsApp, favoritos→login, `verifyApplied`, analytics, anti-regress compat.

---

# E. Matriz de componentes

| Componente | Preservar | Reorganizar | Redesenhar | Criar |
|------------|-----------|-------------|------------|-------|
| `ProductPage` | orquestração domínio | layout/grid | — | — |
| `ProductGallery` / `ProductMediaFrame` | contain, lightbox wire | — | 4:3, thumbs, hover zoom | — |
| `ProductImageLightbox` | zoom/pan | contador UX | — | — |
| `CompatVerdictSummary` | API/estados | `showFaltante` buy-box | polish framed | — |
| `CompatibilityAppsBlock` | lógica slice | só aba Aplicação | — | — |
| `CompatibilityStateBadge` | E.1 | — | — | — |
| `PaymentConditionHint` | linha essencial | — | — | — |
| `StorePaymentMethodsBlock` | dados | collapsible PDP | — | — |
| `ProductShippingQuoteBlock` | cotação/handoff | compacto buy-box | — | — |
| `ProductCard` | — | densidade + batch PVC | — | — |
| `Container` | — | max-width / CSS var | — | — |
| `VehicleSelector` (reuso) | lógica | — | — | wrapper PDP |
| — | — | — | — | `PdpPurchaseBar` mobile |
| — | — | — | — | Abas/acordeão técnico |
| Motor compat / cart / checkout | **regras** | — | — | — |

**Preferência:** evolução controlada, não rewrite.

---

# F. Matriz de riscos

| Área | Risco | Mitigação |
|------|-------|-----------|
| Compat | Aviso sumir de cima do CTA | Aceite E.2 + `test:compat-antiregress` |
| Compat | Mini-seletor alterar chip indevido | Só APIs já usadas pelo switcher |
| Carrinho / checkout | Quebrar buy-now / handoff | Smoke add + buy-now + CEP |
| Preço | Esconder Pix/parcelas | Linha essencial sempre visível |
| Estoque | Inventar “limitado” | Não usar `stock` até decisão |
| Frete | Compactar demais | Expand se erro / sem dimensões |
| Sticky | Sobrepor footer / barra | Intersection fim da região principal |
| A11y | Zoom só hover | Lightbox permanece teclado/toque |
| Perf | N× PVC nos cards | `loadPvcEvidenceByProductIds` batch |
| Visual | Dark mode quebrado | Usar só tokens `fal-*` |

---

# G. Plano de evolução (futuro — NÃO executar nesta marcha)

1. Revisão humana das **decisões abertas** (§ final).  
2. Commit deste relatório (já feito nesta marcha).  
3. **Após aprovação**, marchas de implementação na `dev` (sugeridas):  
   - Fundação: container + grid 45/55 + raios  
   - Galeria 4:3 + hover zoom  
   - Buy-box compacto (pag/frete)  
   - Bloco técnico abas/acordeão + form sheet  
   - Sticky + barra mobile  
   - Mini-seletor (se aprovado)  
   - Equiv/relacionados + batch PVC  
4. Aceite: 3 viewports × estados compat × compra × `npm run test:compat-antiregress`.  
5. Sem merge/push `main` / prod sem autorização.

### Critérios de aceite (quando implementar)

- [ ] Compat visível antes dos CTAs (mobile e desktop)  
- [ ] Galeria 4:3 contain; lightbox ok  
- [ ] CTAs amarelo / light; fluxos cart/checkout intactos  
- [ ] Sem status incompat duplicado (buy-box vs detalhes)  
- [ ] Anti-regress compat PASS  

---

# Inventário de arquivos auditados

| Path | Papel |
|------|--------|
| `fal-pecas/src/pages/Product/ProductPage.tsx` | Orquestração PDP |
| `fal-pecas/src/components/product/ProductGallery.tsx` | Galeria |
| `fal-pecas/src/components/product/ProductMediaFrame.tsx` | Shell mídia |
| `fal-pecas/src/components/product/ProductImageLightbox.tsx` | Lightbox |
| `fal-pecas/src/components/product/CompatVerdictSummary.tsx` | Veredito E.1 |
| `fal-pecas/src/components/product/CompatibilityAppsBlock.tsx` | Apps PVC |
| `fal-pecas/src/components/product/CompatibilityStateBadge.tsx` | Selos |
| `fal-pecas/src/components/product/PaymentConditionHint.tsx` | Pix/parcelas |
| `fal-pecas/src/components/product/StorePaymentMethodsBlock.tsx` | Métodos |
| `fal-pecas/src/components/product/ProductShippingQuoteBlock.tsx` | Frete PDP |
| `fal-pecas/src/components/product/ProductCard.tsx` | Equiv/relacionados |
| `fal-pecas/src/components/layout/Container.tsx` | Largura |
| `fal-pecas/src/styles/index.css` | Tokens |
| `fal-pecas/src/types/index.ts` | `Product` |
| `fal-pecas/src/components/garage/GarageActiveSwitcher.tsx` | Selector existente |
| Docs E.2 / VALs compat 2026-11-19..20 | Canônico e marchas |

---

# Decisões que ainda precisamos tomar juntos

1. Container **1440 global** vs **só PDP**.  
2. Conteúdo abaixo: **híbrido abas+acordeão** (recomendado) vs só acordeão vs empilhado polish.  
3. Mini-seletor na PDP sem veículo: **nesta onda** ou só chip/garagem.  
4. Form mobile em **sheet** nesta onda?  
5. Barra inferior mobile: sim/não; conteúdo mínimo.  
6. Compartilhar: Web Share / copiar link / fora de escopo.  
7. Exibir **`stock`** / “últimas unidades”?  
8. Frete no buy-box: **colapsado** por padrão ou aberto se CEP já conhecido.  
9. Hover zoom: **loupe** vs scale aprimorado.  
10. Tipografia: manter **Inter** ou display só no H1.  
11. Raio unificado **14** vs **10**.  
12. Equivalentes incompatíveis: **ocultar** / selo vermelho / cinza sem CTA.

---

## Assinatura

**Auditoria PDP completa + especificação de redesign — somente documentação · 2026-11-20**  
**Implementação: FORA desta marcha.**
