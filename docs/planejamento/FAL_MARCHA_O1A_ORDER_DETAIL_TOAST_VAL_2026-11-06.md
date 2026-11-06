# VAL — O1-A: toast no detalhe do pedido

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual toast admin — `AdminOrderDetailPage` ainda usava só `<p>` verde/vermelho

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminOrderDetailPage` | `pushOk` / `pushError` via `useToast`; banner de erro permanece; sucesso só toast |
| Painel ME | `onMessage` / `onError` encaminham para toast |

## Critérios

- [x] Ações (salvar item, finalizar, cancelar, separar, expedir, entregar, estorno) disparam toast
- [x] Sem `<p>` verde de `msg`
- [x] Erro de validação/ação: banner + toast
- [x] `tsc -b` OK

## Gate humano

Nenhum.
