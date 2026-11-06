# VAL — O1-I: detalhe do pedido — seções + painel junto do botão

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** numeração incoerente (“5.” no topo); painel de confirmação longe dos botões; cancel sem motivo obrigatório

## Entrega

| Peça | Mudança |
|------|---------|
| Ordem | 1 Identificação → 2 Pagamento → 3 Produtos → ações → painel confirmação → 4 Timeline → 5 Expedição → 6 Registros |
| Painel `pending` | Logo abaixo dos botões de ação |
| Cancelamento | Motivo obrigatório (UI + `runCancel`) |
| Produtos | Subtítulos claros p/ conferência/separação (sem “3 · 4 · 6” no título) |

## Critérios

- [x] Números 1–6 coerentes na página
- [x] Confirmar ação abre painel junto dos botões
- [x] Cancelar exige motivo
- [x] `tsc -b` OK

## Gate humano

Nenhum nesta fatia.
