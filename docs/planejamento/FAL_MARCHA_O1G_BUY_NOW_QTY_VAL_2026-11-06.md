# VAL — O1-G: Comprar agora aplica a quantidade da PDP

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** com item já no carrinho, “Comprar agora” ignorava o seletor de qtd

## Entrega

`onBuyNow`: se já no carrinho → `updateQty(id, qty)`; senão → `addItem(..., qty)`.

## Critérios

- [x] Qtd 3 na PDP com 1 no carrinho → carrinho fica com 3 após Comprar agora
- [x] `tsc -b` OK

## Gate humano

Nenhum.
