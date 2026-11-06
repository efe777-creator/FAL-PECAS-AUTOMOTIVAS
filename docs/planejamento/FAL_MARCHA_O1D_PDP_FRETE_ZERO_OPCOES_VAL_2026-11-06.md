# VAL — O1-D: PDP frete com 0 opções

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** cotação `ok` sem opções na PDP sumia em silêncio (carrinho já tratava)

## Entrega

| Peça | Mudança |
|------|---------|
| `ProductShippingQuoteBlock` | `status === 'ok' && options.length === 0` → mensagem `role="status"` (alinhada ao carrinho) |

## Critérios

- [x] Consulta OK sem opções mostra texto claro (não some)
- [x] Mensagem de erro (`status !== 'ok'`) inalterada
- [x] Lista de opções quando houver

## Gate humano

Nenhum nesta fatia (tarifas/cutover continuam gate eFe).
