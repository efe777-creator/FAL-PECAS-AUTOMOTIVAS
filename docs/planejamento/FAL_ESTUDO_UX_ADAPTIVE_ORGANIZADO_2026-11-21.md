# FAL Estudo UX — Adaptive organizado / fluido / intuitivo / fácil

**Data:** 2026-11-21 · Branch: **`dev`**  
**Padrão:** FAL-UI-LAYOUT **v1.2.0** (baseline) → polish PATCH + Promoções MINOR  
**Objetivo:** hubs admin excelentes no zin — não só “ter Adaptive”.

## Critérios

| Critério | Contrato |
|----------|----------|
| Organizado | 1º viewport = título + CTA grupo + lista; form/criar na **guia** |
| Fluido | Primary clicável com guia; lista `max-h` + cards no compact |
| Intuitivo | Abrir guia / Na guia / Fechar guia; Mais filtros / Recolher |
| Fácil | Seleção → barra → guia (nunca hijack); dirty confirm ao trocar |

Normativo: [FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1_2026-11-21.md](./FAL_PADRAO_TELAS_LAYOUT_DESIGN_v1_2026-11-21.md) §5–8.

## Já no zin

Central · Painel · Produtos · Kits · Preços · Aplicações · Classificação.

**Melhor molde:** Aplicações (filtros expansíveis + lista rolável + multi-guia + barra seleção).

## Achados Adaptive (atrito)

| Hub | P0 | P1 |
|-----|----|----|
| Produtos | Checkbox abre lote sozinho (hijack) | Header com muitos imports |
| Classificação | Primary alto; browse sem max-h; dirty só no Fechar | Árvore densa; CTA só link |
| Aplicações | — | Chip sem Editar; desktop sem Abrir cadastro |

## Promoções (clássico → Adaptive)

- Form mid-page “Incluir/ativar” + lista abaixo
- Filtros sempre abertos; Ativar linha sem endsAt
- To-be: primary = abas + banner + lista; guia = `PromotionWorkSurface`

## Mapa fora do zin

| Hub | Prioridade |
|-----|------------|
| Promoções | Alta (próximo MINOR) |
| Estoque | Alta (backlog após Promo) |
| Clientes | Média |
| Home / Veículos / Avisos | Maybe |
| Hubs só cards / CRUD nomeados | Baixa / Não |

## Sequência de marcha

1. **Este estudo** (doc)
2. **Polish P0** (PATCH) — lote Produtos; CTAs; chips Apps; Classificação dens/scroll/dirty
3. **Promoções Adaptive** (MINOR) — `moduleKey=promotions` + WorkSurface + FL + VAL
4. **Estoque Adaptive** — backlog

## Assinatura

Estudo UX Adaptive · organizado/fluido/intuitivo/fácil · 2026-11-21 · eFe / Cursor
