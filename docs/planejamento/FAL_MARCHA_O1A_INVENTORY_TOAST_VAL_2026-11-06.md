# VAL — O1-A: toast no estoque admin

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual toast admin — `AdminInventoryPage` usava `<p>` verde/vermelho sem `useToast`

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminInventoryPage` | `pushOk` / `pushError` via `useToast`; sucesso só toast; erro banner + toast |

## Critérios

- [x] Troca de modo → toast sucesso
- [x] Ajuste de saldo → toast sucesso
- [x] Erros de carga/ajuste → banner + toast
- [x] Sem `<p>` verde de `msg`
- [x] `tsc -b` OK

## Gate humano

Nenhum.
