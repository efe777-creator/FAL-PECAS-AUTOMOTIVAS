# VAL — copy de frete na loja (PDP + carrinho)

**Data:** 2026-11-09  
**Auth:** MARCHA (código local — sem commit/push)  
**Item:** O0-C / O1-D — `ProductShippingQuoteBlock` + `CartShippingQuoteBlock`

## Entrega

- Produto sem medidas: mensagem para o cliente (sem “complete no cadastro”)
- PDP: intro sem jargão de provedor
- Disclaimer filtrado (`D-FRETE` / `VITE_` / `mock` / `sandbox` / `webhook`)
- Zero opções: copy sem empurrar “medidas” ao cliente

## Critérios

- [x] `tsc --noEmit` OK
- [x] D-FRETE **B** intacto · sem cutover

## Gate humano

Nenhum. Ship git sob demanda.
