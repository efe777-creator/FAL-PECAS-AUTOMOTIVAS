# VAL — Fase C C6/C5/C7

**Data:** 2026-11-13  
**Projeto:** `wtbpwuiayednvlhvuhbh`  
**Smoke execução:** 2026-11-13 (SQL + vitest + browser admin) — **fechamento C5/C7 live**

## Deploy

| Item | Status |
|------|--------|
| Own decouple ME/gaps | código |
| `own_transport_providers` | SQL remoto (6 seeds) |
| `checkout_quote` freeze + edge quote ops_quotes | SQL + edge label |
| `ship_order` + tracking_url + notify | SQL remoto (1 overload) |
| `order_packing_is_complete` / `structurally_complete` | **hotfix remoto** (marcadas em migração, ausentes no catálogo) |
| `apply_me_tracking_update` / own dispatch / set tracking | **hotfix:** removido `shipments.updated_at` (coluna inexistente) |
| `melhorenvio-webhook` tracking-only | edge |
| Vitest relacionados | **266** pass (`src/lib` + `fase81`) + `smokeFaseC.logic` **4/4** |
| `tsc --noEmit` | limpo |

## Correções na verificação cautelosa

1. Edge: congela `checkout_quote` em **qualquer** ação label (não só quote); preserva no persist.
2. `ship_order` recebe `trackingUrl` do admin (estado no detalhe).
3. Checkout usa `selectableShippingOptions` (mesmos filtros da vitrine).
4. Webhook: remove `.contains` frágil; resolve pedido por `metadata->me->>protocol`.
5. `ownTransportLabel` aceita lista do banco.
6. Import `evaluateFreightDivergence` no edge label (quote 500) + erros legíveis.
7. Packing hydrate/save alocação; payment canônico `approved`.
8. Predicates de packing recriados em prod; UPDATEs de shipment sem `updated_at`.

## Matriz ME auto vs manual

| Evento | Auto | Manual |
|--------|------|--------|
| Tracking code/URL | webhook / pull → `apply_me_tracking_update` + inbox | Salvar rastreio |
| Trânsito | ledger + `me.tracking_events` | — |
| Entregue ME | só metadado | `deliver_order` |
| Despacho | — | `ship_order` |
| Compra etiqueta | — | fluxo label |

## Smoke automatizado (remoto / unitário)

| Check | Resultado |
|-------|-----------|
| C6_providers (≥6 active) | **OK** |
| C6_own_enabled | **OK** |
| C5_checkout_quote / ops_quotes | **OK** — pedido ME com `ops_quotes` (2 opções após recote) |
| C7_ship_order + `p_tracking_url` | **OK** — 1 overload |
| C7_apply_me_tracking + fanout copy | **OK** |
| C7 packing predicates | **OK** (hotfix) |
| A_continue awaits_staff | **OK** |
| `smokeFaseC.logic.test.ts` | **4/4** |
| `tsc --noEmit` | limpo |

## Smoke humano / browser

| # | Cenário | OK | Evidência |
|---|---------|-----|-----------|
| C6-1 | Checkout: own aparece com ME offline / sem dims | [x] | Lógico: `smokeFaseC.logic` C6-1. |
| C6-2 | Admin cadastra prestador → OwnShipPanel | [x] | Prestadores UI + seeds. |
| C5-1 | Recote lista opções; selecionar; frete cliente igual | [x] | `6eb61dd5…`: Cotar → Loggi #31 R$11 / cliente R$11,15; `ops_quotes` len=2. |
| C5-2 | Snapshot original × ops × G8 | [x] | Bloco UI + G8 cobrado imutável. |
| C7-1 | Despacho own + URL; cliente notificado | [x] | `9619a86c…` → `enviado` / `shipped`; URL `https://rastreio.exemplo/smoke-c7-own`; inbox `order_shipped`; UI conta usa `buildTrackingUrl`. |
| C7-2 | apply_me_tracking_update + notify | [x] | SQL em `6eb61dd5…`: code `SMOKE-C7-2-TRACK` + URL; evento `shipment_tracking_updated`; inbox “Rastreio atualizado”. Webhook HTTP live ME **não** exercitado (RPC = caminho do webhook). |

## Bloqueios abertos

1. ~~C5-1 edge quote~~ resolvido.
2. ~~C7 despacho E2E own~~ resolvido (`9619a86c`).
3. Webhook HTTP Melhor Envio com protocolo real (opcional; RPC C7-2 cobre o contrato).
4. ~~Histórico `20261113*`~~ — **repair applied** 2026-11-13 (10 versões) após auditoria de objetos no remoto. Ainda há outras migrações locais antigas sem espelho remoto (fora deste escopo).

## Conclusão smoke

Infra + UI + smokes live C5-1 / C7-1 / C7-2 (RPC) **PASS**. Hotfixes de packing predicates e `updated_at` em shipment UPDATEs aplicados no remoto e refletidos nas migrations fonte. Histórico `20261113*` alinhado via `migration repair --status applied`.
