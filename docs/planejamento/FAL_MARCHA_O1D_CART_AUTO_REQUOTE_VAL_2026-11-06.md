# VAL — O1-D residual: recotar frete no carrinho ao mudar qty

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Item:** plano mestre O1-D — invalidava cotação ao mudar itens, mas não recotava com CEP válido

## Entrega

| Peça | Mudança |
|------|---------|
| `CartShippingQuoteBlock` | Ao mudar `cartKey` (itens/qty/subtotal), se CEP tem 8 dígitos, recota automaticamente |
| Opções vazias | Mensagem explícita quando `status === 'ok'` e `options.length === 0` |
| Concorrência | `quoteGen` descarta respostas antigas |

## Critérios

- [x] `tsc --noEmit` OK

## Gate humano

Tarifas reais e cutover D-FRETE C permanecem gates eFe.
