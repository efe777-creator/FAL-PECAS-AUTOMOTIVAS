# VAL — Marcha 11: comparação meticulosa vs referência

**Data:** 2026-11-20 · **Branch:** `dev`  
**URL validação:** `http://localhost:5173/produto/tdi1002` (light)

## Diff referência → correção

| Item referência | Antes | Depois | Status |
|-----------------|-------|--------|--------|
| Galeria mais larga (~55%) | 48/52 | **55/45** (medido 55%) | PASS |
| Buy-box sem “card” pesado | border+padding | flat transparente | PASS |
| Badge Marca azulada | cinza | `fal-navy/5` | PASS* |
| Ref \| Fabricante 1 linha | 2 linhas | 1 linha com `\|` | PASS |
| Compat faixa + Alterar à direita | stack + Trocar | faixa + **Alterar veículo** | PASS |
| Preço bem grande | 1.75rem | **2–2.25rem** | PASS |
| Chips Pix/Cartão/Boleto | só details | `PdpPaymentIcons` | PASS |
| Frete com ícone caminhão | texto só | SVG + título | PASS |
| Disponível ✓ + qty compacta | qty grande acima | row Disponível\|qty | PASS |
| Add amarelo → Comprar navy altos | ok | `h-12` | PASS |
| Favoritar \| WhatsApp 2 colunas | ok | grid-cols-2 | PASS |
| Acordeões com ícone | texto só | ícone letra + chevron | PASS |

\*Badge só aparece se o produto tiver `brand` (TDI1002 sem marca no dado).

## Fora (header mock)

Topbar “Entrega para todo o Brasil…” e menu “Todas as Categorias” do PNG — chrome global, não escopo PDP.

**Assinatura:** MARCHA 11 compare referência · 2026-11-20
