# VAL — toast no formulário de endereço

**Data:** 2026-11-09  
**Auth:** MARCHA (código local — sem commit/push)  
**Item:** O1-F — `AddressForm` (checkout + conta)

## Entrega

- Validação e falha de save via `pushError` + toast (inline mantido)
- `AccountAddressesPage`: remove toast duplicado no catch do save (form é a fonte)

## Critérios

- [x] `tsc --noEmit` OK
- [x] Sem cutover / D-FRETE / secrets

## Gate humano

Nenhum. Ship git sob demanda.
