# VAL — copy admin preços / imagens SKU / ME no pedido

**Data:** 2026-11-09  
**Auth:** MARCHA  
**Item:** O0-C (+ Onda 4 polish / O1-E label)

## Entrega

- `PriceListFormacaoTab`: remove jargão `RPC adjust_price_list_items`
- `AdminImageSkuImportPage`: coluna Código; status Pronto/Pular/Erro
- `AdminOrderDetailPage`: serviço ME sem `ME #id`

## Critérios

- [x] `tsc --noEmit` em `fal-pecas`
- [x] Sem cutover D-FRETE C · sem secrets · lógica de ajuste/import intacta

## Gate humano

Nenhum nesta frente.
