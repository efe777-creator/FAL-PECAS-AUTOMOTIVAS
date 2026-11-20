# FAL — Spec consolidada de redesign da PDP

**Status:** decisões **12/12** fechadas · implantação em marchas na `dev`  
**Rota:** `/produto/:slugOrId` · **Arquivo:** `fal-pecas/src/pages/Product/ProductPage.tsx`  
**Auditoria base:** `FAL_PDP_REDESIGN_AUDIT_REPORT_2026-11-20.md`  
**Data:** 2026-11-20

---

## 1. Visão

PDP = interface de **decisão de compra**: identificar peça → conferir fit → preço/pagamento → frete → comprar com segurança → consultar técnico sem perder contexto.

Direção: **Compacta + Premium + Inteligente.** Prioridade absoluta: reduzir compra incompatível.

## 2. Decisões 12/12 (lei)

| # | Decisão |
|---|--------|
| 1 | Container **1440px somente na PDP**; demais telas inalteradas |
| 2 | Conteúdo técnico: **acordeões** em todos os devices (sem abas) |
| 3 | Sem veículo: **form integrado** marca/modelo/ano/motor/versão; **não** altera garagem |
| 4 | Similar / A verificar mobile: **bottom sheet** |
| 5 | Barra inferior mobile: preço + Comprar |
| 6 | Compartilhar: **copiar link** (sem Web Share) |
| 7 | Só **`available`** — sem stock / últimas unidades |
| 8 | Frete compacto na buy-box; reusar `ProductShippingQuoteBlock` + handoff |
| 9 | Zoom híbrido: hover desktop + lightbox clique/toque |
| 10 | Tipografia **Inter** |
| 11 | Radius PDP **14px** (`--fal-radius` / `rounded-fal`) |
| 12 | Equiv incompatíveis: **selo cinza**, neutros, **sem CTA de compra** |

**Preliminares mantidas:** grid **45/55**; galeria **4:3** `object-contain`; thumbs verticais desktop / horizontais mobile (abaixo no mobile); compat **antes** dos CTAs; sticky buy-box só na região principal.

**Ordem buy-box:** nome → marca/código/ref → **compat** → preço → pagamento → disponibilidade → frete → CTAs → secundárias.

## 3. Matriz anti-redundância

| Intenção | Correção |
|----------|----------|
| Voltar/contexto | Voltar + breadcrumb compacto; não competir com header |
| Catálogo | Breadcrumb; filtro apps só em Aplicação; Ver mais só Relacionados |
| Detalhes | **Uma** âncora → acordeões |
| Veículo | Form local buy-box; Trocar garagem **uma** vez (acordeão); form ≠ chip |
| Veredito | **Só** buy-box; acordeão sem eco do status |
| Pagamento | Uma linha essencial + expand — sem hint+cards abertos |
| Frete | Um bloco compacto na buy-box |
| Comprar | Primário buy-box; barra mobile **espelha** `onBuyNow` |
| Equiv incompat | Selo cinza; sem CTA compra |

## 4. Layout

- Container PDP: max **1440px**, centralizado, padding lateral responsivo.  
- Desktop `lg+`: galeria 45% \| buy-box 55%; sticky limitado à região principal.  
- Mobile: 1 coluna; galeria → buy-box → acordeões; barra fixa inferior.  
- Breakpoints FAL: `sm` 620 · `lg` 900.

## 5. Galeria

- Principal 4:3, contain, fundo `fal-surface-2`.  
- Thumbs: desktop laterais verticais; mobile horizontais **abaixo**.  
- Hover zoom desktop; clique/toque → lightbox (nav, contador, fechar, teclado).

## 6. Compat / frete / CTAs / técnico

- Motor PVC + `classifyCardCompatibility` + confirms similar/check **preservados**.  
- Form local e sheet **não** alteram `garage.activeFilter`.  
- Frete: CEP vazio vs conhecido; reusar bloco + handoff.  
- CTAs: Comprar agora, Add, WA, Favoritar, Copiar link — fluxos atuais.  
- Acordeões: Aplicação e compatibilidade \| Descrição \| Specs \| Embalagem.

## 7. Tokens

Navy `#303846` · Amarelo `#f2c84b` · BG `#f4f6f7` · Surface branco · Line `#dfe4e8` · Inter · Radius 14px.

## 8. Governança

- Não 2º motor compat / 2º frete / container global / alterar garagem por efeito colateral.  
- Sem main/prod sem autorização.  
- Marchas: ver `FAL_PDP_REDESIGN_MARCHAS_2026-11-20.md`.

**Assinatura:** SPEC consolidada PDP 12/12 · 2026-11-20
