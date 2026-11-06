# VAL — O1-F: detalhe do pedido (conta)

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual toast — `AccountOrderDetailPage` usava `actionMsg`/`rebuyMsg` em `<p>`

## Entrega

| Peça | Mudança |
|------|---------|
| Ações | Cancelar / decidir / solicitar cancelamento / comprar de novo → `useToast` |
| Carga | Erro de load → `ErrorState` + toast |

## Critérios

- [x] Sucesso/erro de ação via toast (sem `<p>` de action/rebuy)
- [x] Falha de ação **não** substitui a página por ErrorState
- [x] `tsc -b` OK

## Gate humano

Nenhum.
