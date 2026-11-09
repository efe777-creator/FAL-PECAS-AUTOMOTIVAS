# VAL — toast nos erros do checkout

**Data:** 2026-11-09  
**Auth:** MARCHA (código local — sem commit/push)  
**Item:** O1-F — `CheckoutPage` `pushError`

## Entrega

- Helper `pushError` (inline + toast) para: etapas, CPF/CNPJ, endereços, frete, entrega indisponível, finalizar
- Inline + scroll/foco no erro mantidos
- Extra: copy “origem Manual” → “preço manual”; home admin sem “gateway”

## Critérios

- [x] `tsc --noEmit` OK
- [x] Sem cutover / D-FRETE / secrets

## Gate humano

Nenhum. Ship git sob demanda.
