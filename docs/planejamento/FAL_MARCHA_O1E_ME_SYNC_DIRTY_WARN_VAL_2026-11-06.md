# VAL — O1-E: Atualizar catálogo ME avisa edições sujas

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** plano O1-E — “Atualizar catálogo” deve avisar antes de descartar edições

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminMelhorEnvioPage` | Banner “Alterações não salvas” quando `dirty` |
| Sync | `ConfirmDialog` se houver edições pendentes |

## Critérios

- [x] Com edições: sync pede confirmação
- [x] Cancelar no dialog não chama sync
- [x] Sem edições: sync direto
- [x] `tsc -b` OK

## Gate humano

Etiqueta M7 / D-FRETE C / API_BASE decisão — inalterados.
