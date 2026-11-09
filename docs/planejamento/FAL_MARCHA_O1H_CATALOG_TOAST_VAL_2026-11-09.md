# VAL — toast no catálogo

**Data:** 2026-11-09  
**Auth:** MARCHA (código local — sem commit/push)  
**Item:** O1-H / O0-A — `CatalogPage`

## Entrega

- Falha no load inicial → toast + `ErrorState` (lista não some em “carregar mais”)
- Falha em “Carregar mais” → toast + mensagem ao lado do botão (lista preservada)

## Critérios

- [x] `tsc --noEmit` OK
- [x] Sem cutover / D-FRETE / secrets

## Gate humano

Nenhum. Ship git sob demanda.
