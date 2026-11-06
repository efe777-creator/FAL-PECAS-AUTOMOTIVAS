# VAL — O1-I: sidebar admin mobile (Escape, inert, título)

**Data:** 2026-11-06  
**Auth:** MARCHA  
**Item:** menu mobile sem Escape/`inert`; header só dizia “Menu”

## Entrega

| Peça | Mudança |
|------|---------|
| `AdminLayout` | Escape fecha o drawer |
| `inert` | Aside fechado (mobile) e conteúdo quando drawer aberto |
| Header mobile | Título da página a partir de `document.title` |

## Critérios

- [x] Escape fecha o menu
- [x] Título no header (ex.: Produtos, Dashboard)
- [x] `tsc -b` OK

## Gate humano

Nenhum nesta fatia.
