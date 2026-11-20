# VAL — Marcha: dedup UI compat (PDP / carrinho / Modal)

**Data:** 2026-11-20 · **Branch:** `dev`  
**Motivo:** status E.1 repetido no buy-box e em `#pdp-detalhes`; CTAs do sheet duplicados; mesma árvore selo/motivo no carrinho.

## Entrega

| Item | Status |
|------|--------|
| `CompatVerdictSummary` — estado único (selo / incompat / motivo / faltante) | PASS |
| PDP buy-box usa o summary; detalhes só Trocar + form + apps | PASS |
| Removido 2º link “Ver aplicação…” (fica “Ver mais informações”) | PASS |
| `ModalActions` compartilhado por ConfirmDialog + ReplaceCartItemModal | PASS |
| Carrinho consome `CompatVerdictSummary` | PASS |

## Aceite smoke

1. PVI1038 + HB20 → **1×** “Incompatível com o veículo ativo” e **1×** motivo na página.  
2. Buy-box aviso visível sem scroll; `#pdp-detalhes` **sem** status duplicado.  
3. Vitest `src/services/compatibility/` — 18 PASS.

## Fora

- E.8 Figma  
- Refator ampla de Checkout/analytics

**Assinatura:** MARCHA dedup UI compat · 2026-11-20
