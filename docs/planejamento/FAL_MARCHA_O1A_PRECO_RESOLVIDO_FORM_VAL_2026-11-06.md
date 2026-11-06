# VAL — O1-A preço resolvido no form de produto

**Data:** 2026-11-06  
**Auth:** MARCHA sequencial  
**Item:** Espelho `products.price` → mostrar resolvido

## Entrega

| Peça | Papel |
|------|--------|
| `AdminProductFormPage` | Bloco “Preço na loja (resolvido)” via `resolveProductPrice` |
| Espelho legado | Exibido como nota (`products.price` / promo) |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Fonte = RPC canônica (override / lista / default)
- [x] Inventário atualizado

## Gate humano

Nenhum.
