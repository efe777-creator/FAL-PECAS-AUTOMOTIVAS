# VAL — O1-D / O0-B: bloqueio SPA frete próprio com Gerais não salvos

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** residual O0-B no hub frete próprio — edições de Gerais podiam se perder ao navegar no admin

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminOwnDeliveryPage` | `dirty` nas edições persistidas de Gerais; `useUnsavedChangesBlocker` + `beforeunload`; banner âmbar; limpa ao salvar |

## Critérios

- [x] Editar cobertura/prazo/tarifa → banner + bloqueio de navegação SPA
- [x] Toggle só de UI técnica (`showTech`) não marca dirty
- [x] Salvar limpa dirty e libera navegação
- [x] Fechar aba com dirty → aviso nativo
- [x] `tsc -b` OK

## Gate humano

Tarifas reais / D-FRETE C — inalterados.
