# VAL — document.title sem restore no cleanup (SPA)

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** ao trocar rotas irmãs, cleanup restaurava o título antigo e a aba ficava errada

## Entrega

`useDocumentTitle` só aplica o título; **não** restaura `prev` no unmount.

## Critérios

- [x] Navegação `/conta` → `/conta/pedidos` mantém título da página atual
- [x] `tsc -b` OK

## Gate humano

Nenhum.
