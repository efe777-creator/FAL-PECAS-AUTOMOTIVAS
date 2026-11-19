# MARCHA VAL — OrderOpsSurface Adaptive (onda 1)

Data: 2026-11-19 · branch **`dev`**  
Plano: OrderOpsSurface no Adaptive (onda 1) · invariantes I1–I5 · compact split  
Runtime smoke: `http://localhost:5173` · staff `efe.comercioltda@gmail.com`

## Onda 1 FECHADA — 2026-11-19

Código + **suite vitest completa** + tsc + **smoke autenticado** (compact/split) **PASS**.  
Onda 2 = registry fino `packing` / `ownShip` / `meFreight` (slot expedição já antecipado no surface).

## Resultado MARCHA (rodada testes + validação + correção)

| Camada | Resultado | Evidência |
|--------|-----------|-----------|
| `tsc --noEmit` | **PASS** | exit 0 (revalidado pós-fix) |
| Vitest suite completa | **PASS** | **218** files · **1015** tests |
| Timeout flaky `carrierRegistry` mock quote | **FIX** | `it(..., 15_000)` — suite estável |
| Compact split (bp/mins/attr/CSS) | **PASS** | código + unit + smoke DOM |
| **Bug `+ Guia` sob painel** | **FIX + smoke PASS** | ver correção abaixo |
| Smoke browser autenticado | **PASS** | localhost:5173 sessão staff |

**Veredito:** **Onda 1 FECHADA** — testes completos + validação + correção do clique sob o split.

### Correção validada (2026-11-19 tarde)

| Problema | Causa raiz | Correção |
|----------|------------|----------|
| `+ Guia` / Ações inacessíveis com split | Tabela desktop (`md:block`) mais larga que o primary compacto; coluna Ações no overflow sob o `aside` fixed `z-30` | CSS: em `[data-workspace-primary=compact]` forçar cards (`.admin-orders-list-mobile`) e esconder tabela; `overflow-x-hidden` no primary; spacer `calc(splitWidth + 0.75rem)` |

Re-smoke: `mobile=block` · `desktop=none` · botões `inPrimary` · `Guias abertas (2)` via `+ Guia` clicável.

---

## Smoke autenticado — evidências 2026-11-19

| Item | Resultado | Nota |
|------|-----------|------|
| `/admin` — pedido → surface; Expandir/fechar | **PASS** | `#333668dd` abriu painel; tabs Geral/Itens/Pagamento/Logística |
| Sem badge status duplicado no casco | **PASS** | chrome + surface coerentes no painel |
| `/admin/pedidos` — em análise + surface | **PASS** | filtro Em análise; resolução no surface; `hasConf` |
| Guias empilhadas (2 abertas) | **PASS** | `Guias abertas (2)` · `#4933d150` + `#333668dd` · `+ Guia` em cards compactos |
| Lista clicável no compact | **PASS** (pós-fix) | cards no primary; sem Ações sob o painel |
| Aba Logística no surface | **PASS** | selected; frete/retirada (ações pós-separação no pedido unpaid) |
| CTA lista “Autorizar retirada na loja” | **PASS** | hub + pedidos em análise |
| **Compact Pedidos** | **PASS** | `data-workspace-primary=compact` · `primaryW≈548` · `listMaxH≈453px` (≤480) |
| **Compact Painel** | **PASS** | `compact` · `primaryW≈608` → bp **md** (não sm) · RGL 5 items side-by-side (larguras 608/376/220) · `vw=1265` |
| Fechar painel → `full` | **PASS** | attr `full` · `primaryW≈982` · lista max-h ≈60dvh |
| Separação print/concluir só rail | **N/A massa** | fila Em separação = **0** neste smoke |
| `aguardando_decisao` Confirmar/withdraw | **N/A massa** | sem pedido nesse estado na sessão |
| `/:id` CommandBar / double-click mute | **PARCIAL** | não exercitado E2E nesta rodada (UUID truncado na UI); unit policy I2/I3 **PASS** |

---

## Compact split (fechamento densidade)

| Item | Entrega |
|------|---------|
| `data-workspace-primary=compact\|full` | Wrapper do primary em `AdaptiveWorkspace` |
| Breakpoints RGL | `lg`≥1024 · `md`≥**520** · `sm`&lt;520; `sm` sem inflate agressivo de `h` |
| Mins widgets | exec 4×2 · pipeline 4×3 · attention 3×2 · logistics 2×2 · charts 4×2 |
| Hub Pedidos | CSS sob `[data-workspace-primary=compact]` |

## Checklist I1–I5

- [x] **I1** Surface único + presentation parity
- [x] **I2** Cancel revalida `staffCanCancel`
- [x] **I3** `runExclusive` anti-duplo
- [x] **I4** Close não reseta hub query / RGL
- [x] **I5** Registry + placeholder / slot expedição

## Correções desta rodada (redundâncias / análise)

| Problema | Correção |
|----------|----------|
| CTAs duplicados: Faça agora × `OrderAnalysisResolutionPanel` | Em `em_analise` / `aguardando_disponibilidade`: `pendenciaActionsDeferred` — rail só texto (+ cancel); CTAs só no painel |
| Print duplicado na separação | Removido `analysisPanel` de `confirmado`/`em_separacao`; print só no rail |
| Withdraw duplicado em `aguardando_decisao` | Withdraw só no painel; finalize no rail |
| Badge status 2× (PanelChrome + surface) | `hideStatusHeader` no hub/Painel |
| Double-fetch em `/:id` | Surface é fonte; `onOrderChange` alimenta CommandBar |
| Faça agora 2× no full (CommandBar + surface) | CommandBar com `nextStep={null}` |
| Itens de conferência escondidos na aba Itens | Bloco `itemsInlineOps` na aba Ops durante análise/separação |
| Vitest flaky timeout mock quote | Timeout 15s em `carrierRegistry.test.ts` |
| Retirada rail + StorePickupPanel | Rail sem primary pickup; CTAs só no painel via `orderOpsActions` + runner |
| Print/romaneio lista+CommandBar | `utilitiesOnly` na lista com guia aberta e no CommandBar full |
| Abrir full ⋯ + footer | Removido `onOpenFull` do chrome; fica “Página completa” no footer |
| Surface duplo no DashboardContextualPanel | Ramo `kind===order` sem montar segundo `OrderOpsSurface` |

## Onda 2 (próxima)

Registry fino packing / ownShip / meFreight como blocos nomeados no surface (slot já existe na aba Logística).

**Assinatura:** MARCHA smoke+testes completos PASS · Onda 1 FECHADA · 2026-11-19.
