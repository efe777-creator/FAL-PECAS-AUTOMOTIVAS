# VAL — O1-A: toast na lista de produtos

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual toast admin — `AdminProductsPage` usava `message`/`error` só em `<p>`

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminProductsPage` | `pushOk` / `pushError` via `useToast`; sucesso só toast; erro banner + toast |

## Critérios

- [x] Arquivar / publicar / lote / disponibilidade / liberar / classificação / medidas → toast
- [x] Validação e falhas → banner + toast
- [x] Sem `<p>` de `message`
- [x] `tsc -b` OK

## Gate humano

Nenhum.
