# MARCHA VAL — Conta, home, dark loja, admin polish

**Data:** 2026-11-16/17  
**Figma:** https://www.figma.com/design/ZrVkWnp1krjj6c8uboRlYT  
**Kit:** `LOGOTIPO/` (navy/carvão + mola dourada)

## Entregue

| Gate | Status |
|------|--------|
| Figma swatch / header / conta / admin chrome | PASS |
| `storeTheme` + toggle Header + `.dark` no `MainLayout` | PASS |
| Logo placa clara no dark (header + footer) | PASS |
| Bell dourado (sem caixa opaca) | PASS |
| AccountLayout accent + hub sem 6 cards | PASS |
| Pedidos/conta tokens; Home sand→yellow/10; QuickEntry accent | PASS |
| Admin hubs (notificações/home payment/promo pills) → tokens | PASS parcial (detalhe de pedido admin ainda tem ad hoc) |

## Critérios

- CTA amarelo ≠ sininho chrome  
- Wrappers admin/loja separados  
- Navy de marca não invertido  
- Conta e home legíveis em light e dark  

## Smoke

1. `/` — toggle Escuro/Claro; logo com placa; sininho dourado  
2. `/conta` — nav accent; Resumo sem grid de cards  
3. `/admin` — dark independente da loja  
