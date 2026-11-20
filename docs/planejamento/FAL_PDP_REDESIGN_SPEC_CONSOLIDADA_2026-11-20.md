# FAL — Spec consolidada de redesign da PDP

**Status:** decisões **12/12** + override CTA/layout referência · implantação na `dev`  
**Rota:** `/produto/:slugOrId` · **Arquivo:** `fal-pecas/src/pages/Product/ProductPage.tsx`  
**Auditoria base:** `FAL_PDP_REDESIGN_AUDIT_REPORT_2026-11-20.md`  
**Referência visual:** mock PDP (layout vitrine) adaptado a tokens FAL light/dark  
**Data:** 2026-11-20

---

## 1. Visão

PDP = interface de **decisão de compra**: identificar peça → conferir fit → preço/pagamento → frete → comprar com segurança → consultar técnico sem perder contexto.

Direção: **Compacta + Premium + Inteligente** · layout alinhado à referência · identidade **só** `fal-*` (claro + escuro).

## 2. Decisões 12/12 (lei) + override referência

| # | Decisão |
|---|--------|
| 1 | Container **1440px somente na PDP**; demais telas inalteradas |
| 2 | Conteúdo técnico: **acordeões** sob a galeria (col 45); sem abas |
| 3 | Sem veículo: **form integrado** marca/modelo/ano/motor/versão; **não** altera garagem |
| 4 | Similar / A verificar mobile: **bottom sheet** |
| 5 | Barra inferior mobile: preço + **Comprar agora** (`onBuyNow`) |
| 6 | Compartilhar: **copiar link** (sem Web Share) |
| 7 | Só **`available`** — sem stock / últimas unidades |
| 8 | Frete compacto “Calcular frete” + CEP + Consultar; mesmo motor/handoff |
| 9 | Zoom híbrido: hover desktop + lightbox; hint lupa na mídia |
| 10 | Tipografia **Inter** |
| 11 | Radius PDP **14px** (`rounded-fal`) |
| 12 | Equiv incompatíveis: **selo cinza**, neutros, **sem CTA de compra** |

**Override CTA (referência):** painel = **Adicionar** `primary` (amarelo) → **Comprar agora** `dark` (navy). Barra mobile espelha `onBuyNow` (não duplica Add).

**Preliminares:** grid **45/55**; galeria **4:3** contain; thumbs verticais desktop / horizontais mobile; thumb ativa **amarelo**; sticky buy-box.

**Ordem buy-box:** badge marca → nome → ref/fabricante → **compat** → preço → pagamento → qty → frete → disponível → CTAs → Favoritar+WA → copiar/âncora.

## 3. Matriz anti-redundância

| Intenção | Correção |
|----------|----------|
| Voltar/contexto | Voltar + breadcrumb compacto |
| Catálogo | Breadcrumb; filtro apps só em Aplicação |
| Detalhes | **Uma** âncora → `#pdp-detalhes` (acordeões) |
| Veículo | Form local buy-box; Trocar 1× no acordeão apps; form ≠ chip |
| Veredito | **Só** buy-box |
| Pagamento | Linha essencial + `<details>` |
| Frete | Um bloco compacto |
| Comprar | Add amarelo + Comprar navy; barra = `onBuyNow` |
| Equiv incompat | Selo cinza; sem CTA |

## 4. Layout

- Desktop `lg+`: col 45 = galeria + acordeões \| col 55 = buy-box sticky.  
- Mobile: galeria → buy-box → acordeões; barra fixa.  
- Breakpoints: `sm` 620 · `lg` 900.

## 5. Galeria

- 4:3 contain, `fal-surface-2`.  
- Thumb ativa `border-fal-yellow`.  
- Hover zoom fino; clique → lightbox; overlay lupa.

## 6. Compat / frete / CTAs / técnico

- PVC + confirms preservados; form/sheet sem `setActiveFilter`.  
- Frete: casca compacta; opções expandem abaixo.  
- Acordeões: Aplicação e compatibilidade \| Descrição \| Specs \| Embalagem.

## 7. Tokens

Navy / Amarelo / BG / Surface / Line FAL · Inter · Radius 14 · dark via `dark:`.

## 8. Governança

- Sem 2º motor compat/frete; sem main/prod sem OK.  
- Marchas: `FAL_PDP_REDESIGN_MARCHAS_2026-11-20.md`.

**Assinatura:** SPEC consolidada PDP 12/12 + referência visual · 2026-11-20
