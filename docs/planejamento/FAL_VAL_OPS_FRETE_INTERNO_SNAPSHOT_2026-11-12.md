# VAL — Frete interno vs cobrado cliente · 2026-11-12

## UI

- `ContractedFreightSnapshotPanel`: contratado na compra × packing atual
- `FreightFinancePanel`: copy “cobrado imutável”
- ME: após Gerar etiqueta, pergunta se despacha agora

## Regra

Atualizar medidas/cotação/custo G8 **não** altera `orders.shipping_amount`.
