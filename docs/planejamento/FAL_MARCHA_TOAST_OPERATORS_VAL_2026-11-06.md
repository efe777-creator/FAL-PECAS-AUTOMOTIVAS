# VAL — toast operadores

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** Toast admin → `AdminOperatorsPage`

## Entrega

| Peça | Mudança |
|------|---------|
| Carga | `loadError` + toast (ErrorState) |
| Alterar papel / desativar | Toast sucesso/erro — **não** usa `error` de carga |
| Bug | Erro de ação deixava de renderizar a tabela; corrigido |
| Banner verde `okMsg` | Removido |

## Critérios

- [x] `tsc --noEmit` OK
- [x] Tabela permanece visível após erro de ação

## Gate humano

Nenhum.
