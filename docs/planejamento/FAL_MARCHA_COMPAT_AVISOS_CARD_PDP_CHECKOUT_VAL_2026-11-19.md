# VAL — Marcha avisos compat (card / PDP / carrinho / checkout)

**Data:** 2026-11-19 · **Branch:** `dev`  
**Plano:** Tranche A (E.1 + E.2 parcial + E.3 lite + M7 lite)  
**Canônico:** `FAL_PLANO_BUSCA_EQUIVALENCIA_COMPATIBILIDADE_2026.md`  
**Fora de escopo:** E.4 gate M31 · E.5 decision log · form triplo ano/motor/versão

## Aceite

| Critério | Status |
|----------|--------|
| Card: selo E.1 com fit; apps quando sem selo (`showApps`) | PASS (código) |
| Card: confirm similar **e** A verificar em Adicionar e Comprar agora | PASS (código) |
| PDP: bloco Compatibilidade + copy E.1 (`variant="card"`) + motivo/faltante | PASS (código) |
| PDP: confirm simétrico add/buy | PASS (código) |
| Carrinho: estado + motivo (+ faltante) por item com fit ativo | PASS (código) |
| Checkout: alerta condensado 1× itens não confirmados | PASS (código) |
| Sem gate modal / sem decision log no pedido | PASS (não implementado) |

## Comandos

```bash
npx vitest run src/services/compatibility/compatCopy.test.ts src/services/compatibility/compatibilityEngine.test.ts
```

## Smoke manual

1. Guest sem fit → card com **Aplicação**; zero selo.
2. Fit ativo Compatível → selo; apps ocultas no card.
3. Fit + similar / A verificar → confirm em Adicionar e Comprar agora (card e PDP).
4. Fit + peça incompatível na home → apps voltam; no catálogo some (E.1).
5. Carrinho com fit → linha com badge/motivo.
6. Checkout com item A verificar → banner amarelo no topo + micro no resumo.

**Assinatura:** MARCHA avisos compat card/PDP/cart/checkout · 2026-11-19
