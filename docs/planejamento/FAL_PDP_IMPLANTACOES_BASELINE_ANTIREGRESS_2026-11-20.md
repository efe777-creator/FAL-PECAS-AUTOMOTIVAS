# FAL — Inventário de implantações + baseline + gate antiregress

**Data:** 2026-11-20  
**Branch canônica:** `dev` (nunca main/prod sem OK)  
**Spec:** `FAL_PDP_REDESIGN_SPEC_CONSOLIDADA_2026-11-20.md`  
**Marchas:** `FAL_PDP_REDESIGN_MARCHAS_2026-11-20.md`  
**Gate npm:** `npm run test:compat-antiregress` (em `fal-pecas/`)

Este documento **fecha o estado aceito** da PDP redesign + selo do card. Mudanças futuras que quebrem o gate = regressão não intencional até revisão explícita.

---

## 1. Como garantir “daqui pra frente”

| Regra | Como |
|-------|------|
| Antes de commit na `dev` que toque PDP/card/compat/frete | Rodar `npm run test:compat-antiregress` — deve passar 100% |
| Contratos são fonte (sem browser flaky) | `compatUiAntiregress.test.ts` + motor/copy |
| Baseline visual (medidas) | §3 deste doc; revalidar se mudar layout |
| Fluxo git | feature → `dev`; **nunca** main/prod sem autorização |

**Comando de verificação:**

```bash
cd fal-pecas
npm run test:compat-antiregress
```

---

## 2. Inventário das implantações (M1–M15)

| # | Tema | O que ficou | Arquivos-chave | Contrato AR |
|---|------|-------------|----------------|-------------|
| M1 | Estrutura | Container PDP 1440; grid **55/45**; sticky buy; 4:3 | `ProductPage`, `Container`, `ProductMediaFrame` | PDP M1 |
| M2 | Galeria | Zoom hover fino; lightbox a11y | `ProductGallery`, `ProductImageLightbox` | PDP M2 |
| M3 | Buy-box | Compat antes do preço; copiar link; 1 âncora | `ProductPage`, `StorePaymentMethodsBlock` | PDP M3 |
| M4 | Compat | Form local sem chip; sheet; equiv cinza | `ProductPage`, `ProductCard`, badge | PDP M4 |
| M5 | Frete | “Calcular frete” CEP+Consultar; handoff | `ProductShippingQuoteBlock` | PDP M5 |
| M6 | Acordeões | 4 seções sob galeria; order 1/2/3 | `ProductPage`, `PdpAccordion` | PDP M6 |
| M7 | CTAs ref | Add primary → Comprar dark; Favoritar/WA; barra mobile | `ProductPage`, `PdpPurchaseBar` | PDP M7 |
| M8 | Acabamento | Thumb amarela; lupa; veredito framed | Gallery, `CompatVerdictSummary` | PDP M8 |
| M9 | Mobile | Galeria → buy → acordeões | `ProductPage` orders | PDP M6/M9 |
| M10–11 | Proporções/ref | Densidade e alinhamento visual | buy-box / frete | — |
| M12 | Densidade | CTAs na dobra ≥900px; ícones pag. se h≥820 | `ProductPage`, `PdpPaymentIcons` | PDP M14 |
| M13 | Ordem | disponível+qty → frete → CTAs; SPEC 55/45 | `ProductPage`, SPEC | PDP M13 |
| M14 | Medidas+AR | Tokens FAL + densidade no gate | `index.css`, antiregress | PDP M14 |
| **M15** | **Selo card** | Compat **após título** (não overlay); Oferta na foto | `ProductCard` | **Card M15** |

### Domínio preservado (não duplicar)

- Um motor PVC/compat (E.1–E.7)
- Um frete + `saveShippingQuoteHandoff`
- Cart/checkout/`onBuyNow` existentes
- Chip do header **não** alterado pelo form local da PDP

---

## 3. Baseline de medidas (2026-11-20)

### 3.1 PDP `/produto/tdi1002`

| Viewport | Grid | fold Add | fold Comprar | Observação |
|----------|------|----------|--------------|------------|
| 1440×900 | **55/45** | OK | OK | Alvo desktop |
| 1366×768 | **55/45** | OK | OK | Ícones pag. ocultos (h&lt;820) |
| 390×844 | empilhado 1→2→3 | barra mobile | — | Sem overflow-X |

**Cores CTA (medidas):** Add `rgb(242,200,75)` = `#f2c84b`; Comprar `rgb(48,56,70)` = `#303846`.

**Tokens (CSS):** light bg `#f4f6f7`; dark bg `#0e1116`; yellow `#f2c84b`; navy `#303846`.

**Ordem buy-box:** compat → preço → pagamento → disponível+qty → frete → Add → Comprar → Favoritar/WA.

### 3.2 Card (home/catálogo) — selo

| Critério | Baseline aceito |
|----------|-----------------|
| Selo vs foto | **Abaixo da foto** (`belowPhoto=true`) |
| Overlay | **Sem overlap** (`overlapsPhoto=false`) |
| Oferta | Continua `absolute top-3.5 left-3.5` na mídia |
| Posição no DOM | Título → **selo** → referência |

Medido em home com veículo ativo (ex.: HB20): 6/6 cards Incompatível abaixo da foto, zero overlap.

---

## 4. Mapa do gate antiregress → risco

| Teste | Se falhar, significa |
|-------|----------------------|
| Card M15 | Selo voltou a tapar foto/Oferta |
| PDP M1 / M13 | Grid ou proporção 55/45 quebrada |
| PDP M7 / M14 | CTAs / densidade / tokens alterados |
| PDP M3 | Compat deixou de vir antes do preço |
| PDP M4 | Form local passou a mutar chip |
| PDP M5 | Frete/handoff regrediu |
| Motor/copy | Selo Incompatível ou confirm de compra errado |

VALs pontuais: `FAL_PDP_REDESIGN_VAL_RESPONSIVO_*`, `VAL_M13_*`, `VAL_M14_*`.

---

## 5. Residual consciente (não é regressão)

1. Visual “Compatível” (selo verde) — validar com veículo PVC cruzado (baseline atual usou incompat).
2. Header mock da referência — fora de escopo PDP.
3. Push remoto / main / prod — só com OK explícito.

---

## 6. Commits de referência (dev)

Inclui série `feat/fix/test(pdp): Marcha 1…14` + M15 (selo card + este inventário). Ver `git log --oneline` na `dev`.
