# MARCHA — Auditoria pós-V2 UI / dark admin (incoerências e ajustes)

**Data:** 2026-11-16/17  
**Escopo:** revisão do plano tático V2 após implementação  
**Figma:** https://www.figma.com/design/ZrVkWnp1krjj6c8uboRlYT

## Veredito

A fundação (tokens, toggle, Painel, AdminTabs, favorito, empties) está coerente com o contrato. O buraco real era **texto `text-fal-navy` no admin**: navy não inverte no dark → contraste quase nulo sobre `fal-surface`. Isso foi corrigido nesta MARCHA. Restam dívidas de cores ad hoc (emerald/amber/sky) em painéis operacionais de pedido.

## Achados

| ID | Severidade | Achado | Ação |
|----|------------|--------|------|
| A1 | **P0** | Centenas de `text-fal-navy` em páginas/componentes admin usados como texto de corpo/título. No dark, navy permanece `#303846` sobre superfície `#242b33` → ilegível. | **Corrigido:** bulk `text-fal-navy` → `text-fal-fg` em 81 arquivos; preservado em chips/CTAs com `fal-yellow`; resto pontual em Operators. |
| A2 | P1 | Cores Tailwind ad hoc (`emerald`/`amber`/`sky`/`green`) em pedidos/logística/preços (~100+ usos). Quebram o sistema semântico e estouram no dark. | Dívida: migrar por onda para `fal-success` / `fal-warning` / `fal-accent` / `fal-danger`. Exceção documentada: wizard `OrderOpsWizardNav`. |
| A3 | P2 | `AdminTabs` ativo dependia sobretudo de cor (accent + bold). | **Ajustado:** indicador inset (bar) + ring (card) além da cor. |
| A4 | P2 | Painel usa emojis nos KPIs (`💳`, `⚡`). Funciona, mas compete com a identidade tipográfica. | Backlog: trocar por ícones SVG/lucide alinhados. |
| A5 | OK | `bg-white` residual no admin só em overlays da sidebar (`hover:bg-white/10` sobre navy) — correto. | Nenhuma |
| A6 | OK | Loja: favorito `fal-favorite`, MobileNav accent, empties “Ver catálogo”, sem `.dark` no shell. | Nenhuma |
| A7 | OK | Tokens `@theme` → `var(--fal-*)`; navy/yellow não invertidos; alias `fal-ink`; tema no wrapper `AdminLayout`. | Nenhuma |
| A8 | OK | Breadcrumb `prazos: "Prazos de entrega"`; H1 Painel; Busca na nav. | Nenhuma |
| A9 | Info | Suite full ainda tem 5 fails pré-existentes (timeouts). `adminTheme` unitários OK. | Fora desta onda |
| A10 | Info | PCI/secure fields: sem iframe admin óbvio no grep; superfícies MP na loja/checkout fora do dark wrapper. | Manter exceção se surgir Brick branco no admin |

## Critérios do plano (rechecagem)

| Critério | Status |
|----------|--------|
| CTA primário amarelo | PASS (`Button` primary) |
| Nav/aba ativos sem amarelo | PASS (accent) |
| Sidebar navy light/dark | PASS |
| Favorito ativo vermelho | PASS |
| Sem superfície branca acidental no dark | PASS pós-A1 (texto); superfícies já `fal-surface` |
| Painel sem sitemap / sem métricas fictícias | PASS |
| Loja sem dark | PASS |

## Próxima onda sugerida (não bloqueia aceite V2)

1. Substituir badges emerald/amber/sky em `orders/*`, `OwnDelivery*`, `PriceListProductsTab`, `PaymentAdjustPercentControl`.
2. Trocar emojis do Painel por ícones.
3. Smoke visual manual light/dark em Pedidos detalhe + Home admin + Notificações (onde A2 ainda aparece).
4. Capturar screenshots Figma × implementação (Painel + coração) se ainda faltarem no pacote de evidências.

## Arquivos tocados nesta auditoria

- Bulk admin: `text-fal-navy` → `text-fal-fg` (81 arquivos)
- `AdminOperatorsPage.tsx` (resto)
- `AdminTabs.tsx` (indicador não só-cor)
