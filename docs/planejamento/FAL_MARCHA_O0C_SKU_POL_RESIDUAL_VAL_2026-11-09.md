# VAL — residual SKU/POL na UI admin

**Data:** 2026-11-09  
**Auth:** MARCHA  
**Item:** O0-C

## Entrega

- Listas de preço / ajuste rápido: `SKU_FAL_LABEL` (Código interno)
- Pedido admin: item sem “SKU”
- Frete próprio: aba Produtos sem “Capacidade POL”
- Badge “Ajuste avulso” (sem Override)

## Critérios

- [x] `tsc --noEmit` em `fal-pecas`
- [x] Lookup por `products.sku` intacto

## Gate humano

Nenhum nesta frente.
