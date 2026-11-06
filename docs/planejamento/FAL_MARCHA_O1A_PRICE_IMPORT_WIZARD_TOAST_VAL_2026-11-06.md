# VAL — O1-A / O0-C: assistente de importação de preços

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual — `PriceImportWizard` sem toast; jargão `Import id` / `CALCULATED`

## Entrega

| Peça | Mudança |
|------|---------|
| Toast | `pushError` / `pushResult` (resultado no passo 9 + toast) |
| Copy | Sem “Import id”; sem “CALCULATED” no texto ao operador |

## Critérios

- [x] Erros de preview/apply → banner + toast
- [x] Sucesso / simulação → toast + painel de resultado
- [x] `tsc -b` OK

## Gate humano

Nenhum.
