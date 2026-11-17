# MARCHA VAL — UI cores / dark admin / Painel

**Data:** 2026-11-16/17  
**Plano:** tático V2 (Cursor) + auditoria/spec  
**Figma:** https://www.figma.com/design/ZrVkWnp1krjj6c8uboRlYT

## Entregue

| Gate | Status |
|------|--------|
| 1 Figma contrato | PASS — tokens light/dark + estados |
| 2 Tokens + tema + toggle | PASS — `index.css`, `adminTheme`, `AdminThemeToggle`, `AdminLayout` |
| 3 AdminTabs + nav | PASS — Home, Payment, Notificações, OwnDelivery, PriceList; Busca na sidebar; breadcrumb prazos |
| 4 Painel + Relatórios | PASS — H1 Painel; KPIs tonais; sem sitemap; reports alinhados |
| 5 Dark admin superfícies | PASS — migração massiva `bg-white` → `bg-fal-surface` (79 arquivos); navy não invertido |
| 6 Loja polish | PASS — favorito vermelho; MobileNav accent + label Catálogo; empties Ver catálogo |
| 7 Copy Logística | PASS — linguagem de benefício |
| 8 Validação | PASS parcial — `adminTheme` 3/3; `tsc -b` OK; oxlint OK; suite full 771 pass / 5 fail pré-existentes (timeouts fase81/shipping) |

## Smoke manual sugerido (eFe)

1. `/admin` — dark default; toggle claro/escuro; F5 persiste  
2. Menu ativo azul; botão primary amarelo  
3. Sidebar navy em ambos os temas  
4. Card/PDP — favoritar → coração vermelho  
5. Loja `/catalogo` sem classe `.dark` no shell  
