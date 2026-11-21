# FAL — Marcha Revisão no Hub Adaptive (VAL)

**Data:** 2026-11-21  
**Branch:** `dev`  
**Escopo:** UX Central — fila Revisão no Adaptive + largura de guias; sem novo módulo pós-venda.

## Cruzamento Spec / Plano / Jornadas × código

| Fonte | Pedido | Antes desta marcha | Depois |
|-------|--------|--------------------|--------|
| Spec D1–D18 | Camada pedido | Feito F1–F3 | Intactos |
| Plano F2 | Hub Revisão + Abrir guia | Visão `/visao/revisao-logistica` solta | `?tab=logistica&fila=revisao` no Hub |
| Jornadas wireframe | Tipo \| Stage \| Abrir guia | Lista só status comercial | `columnMode=revisao` |
| Jornadas controle | Stages no OrderOps | CTAs no details ocorrência | CTAs sob Ida × devolução |
| Padrão Adaptive | Shell único | Split MAX 640px | MAX 920 + ± + hit area |

## Já feito (domínio) — não reabrir

- F1–F3 + WA D18 + painel Ida × devolução + smoke dry-run
- HOLD: generate ME live (sem `cart_item_id` numérico)

## Checklist aceite

- [x] Hub Logística: chip Revisão com count; subchips D12
- [x] Lista revisao: Tipo / Stage / Modo-código / Abrir guia
- [x] `/visao/revisao-logistica` redireciona ao Hub canônico
- [x] Guia: arrastar ou −/+ muda largura além de 640px; prefs por moduleKey
- [x] OrderOps Logística: Ida × devolução + CTAs do caso (`PostSaleCaseQuickActions`)
- [x] Badge chrome com stage quando caso aberto
- [x] Antiregress FL1 + FL25 + testes URL/chips/labels/clamp MAX ≥ 800
- [x] Ajuste: ± largura em px reais (`WORKSPACE_SPLIT_STEP`); `onOrderChange` via ref (sem reload em re-render do Hub)

## Artefatos principais

- `adminLogisticsQueues.ts` / `adminOrdersUrl.ts` — path canônico
- `AdminOrdersHubPage.tsx` — fila + D12 + badge stage
- `AdminOrdersListPanel.tsx` — `columnMode=revisao`
- `AdminOrdersViewPage.tsx` — Navigate legado
- `OrderOpsSurface.tsx` + `PostSaleCaseQuickActions.tsx`
- `adminWorkspacePrefs.ts` — `WORKSPACE_SPLIT_MAX = 920`
- Migration `20261121200000_revisao_queue_return_mode.sql` — return_mode/tracking na fila

## Smoke uso completo operador + cliente (2026-11-21)

Script: `fal-pecas/scripts/smoke-pos-venda-uso-completo.mjs` · **gate PASS**

| Passo | Evidência |
|-------|-----------|
| Cliente report tipado | `pos_venda_devolucao` · occ `67d34bb6…` |
| Ops fila Revisão | `admin_list_revisao_queue_rows` · `inQueue` + colunas `return_mode` |
| Ops start → authorize ME | `em_analise` → `autorizada`/`me_codigo` |
| Cliente generate dry-run | `DRY-REV-D18580EC` |
| Ops peça → conf → resolve | stages OK; pedido permanece `entregue` |
| Variante WA | `return_mode=wa` permanece na fila |
| Hub canônico | `/admin/pedidos?tab=logistica&fila=revisao` |

Migration `admin_list_revisao_queue_rows` (DROP+CREATE return_mode/tracking) aplicada no **wtbp**.

### Revalidação antiregress + smokes (noite)

- Vitest pós-venda/Adaptive: **80/80 PASS**
- `smoke-pos-venda-uso-completo.mjs`: **PASS** `DRY-REV-71C3C49B`
- `smoke-me-reverse.mjs`: **PASS** `DRY-REV-9F7DAD3E` (`liveReady:false` sintético)

### Rastreio garantido (pós-reforço)

- Smoke exige ida ≠ devolução + fila com `tracking_code` + evento customer
- Antiregress: webhook tracking-only, Ida×devolução UI, `buildTrackingUrl`
- Evidência: `SMOKE-IDA-58565554` ≠ `DRY-REV-58565554` · gate PASS

## Fora de escopo

- Novo `moduleKey` / `/admin/pos-venda`
- ME live generate
- Redesign wizard de venda
- Deploy Netlify / merge MAIN
