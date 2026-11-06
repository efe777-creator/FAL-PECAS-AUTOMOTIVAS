# VAL — O0-B: bloqueio SPA Home admin (campanha + pagamento)

**Data:** 2026-11-06  
**Auth:** MARCHA SOBERANA  
**Item:** residual O0-B — formulários de campanha e condições de pagamento podiam se perder ao navegar

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminHomeContentPage` | `dirtyBanner` / `dirtyPayment`; `useUnsavedChangesBlocker` + `beforeunload`; banner âmbar |

## Critérios

- [x] Editar campanha ou pagamento → bloqueio SPA + aviso
- [x] Salvar / limpar / editar outra limpa o dirty correspondente
- [x] `tsc -b` OK

## Gate humano

Nenhum (Publish fernando = ops separado — ver soberana).
