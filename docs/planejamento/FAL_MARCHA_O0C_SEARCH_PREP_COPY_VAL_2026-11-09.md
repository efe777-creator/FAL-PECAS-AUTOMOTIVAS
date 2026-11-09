# VAL — copy admin busca/sinônimos

**Data:** 2026-11-09  
**Auth:** MARCHA  
**Item:** O0-C / Onda 2–4 — `AdminSearchPrepPage`

## Entrega

- Título “Busca e sinônimos” (sem “prep IA” / modelo vetorial)
- Copy sem “RPC” / “rebuild” cru no toast
- Checkbox e coluna alinhados à linguagem do operador

## Critérios

- [x] `tsc --noEmit` (fal-pecas)
- [x] Sem cutover / D-FRETE / secrets
- [x] Flag de sinônimos / rebuild intactos (só copy)

## Gate humano

Ligar sinônimos em produção = gate eFe (dados + flag).
