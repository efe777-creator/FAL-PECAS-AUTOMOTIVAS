# VAL — O1-A: ajuste rápido de preços

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual toast — `PriceListQuickAdjustPanel` usava `info`/`error` só em `<p>`

## Entrega

| Peça | Mudança |
|------|---------|
| Painel | `pushOk` / `pushError` via `useToast`; sucesso só toast |

## Critérios

- [x] Salvar precificação / adicionar item → toast
- [x] Validação e falhas → banner + toast
- [x] Sem `<p>` verde de `info`
- [x] `tsc -b` OK

## Gate humano

Nenhum.
