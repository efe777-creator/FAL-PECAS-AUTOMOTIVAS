# VAL — toast origem de expedição

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** Toast admin → `AdminShippingOriginPage`

## Entrega

| Peça | Mudança |
|------|---------|
| Load / save erro | Banner + `useToast` error |
| Save sucesso | `useToast` success (remove `<p>` verde) |
| CEP inline | Mantido no campo (não toast) |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Inventário atualizado (toast residual segue gradual)

## Gate humano

Nenhum.
