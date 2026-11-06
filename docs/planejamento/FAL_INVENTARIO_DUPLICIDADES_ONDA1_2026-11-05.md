# Inventário de duplicidades — Onda 1 (item 19)

**Data:** 2026-11-05  
**Auth:** MARCHA O1-A  
**Regra:** nenhuma remoção sem teste / VAL.

## Legenda

| Rótulo | Ação |
|--------|------|
| **MANTER** | Fonte canônica atual |
| **CONSOLIDAR** | Unificar em MARCHA futura |
| **NÃO TOCAR** | Paralelo intencional ou legado seguro por enquanto |

## Frete / carriers

| Item | Estado | Ação |
|------|--------|------|
| `quoteShippingEnvelope` + `carrierRegistry` | Único envelope loja | **MANTER** |
| `melhorEnvioEdgeProvider` merge own+ME | Canônico híbrido | **MANTER** |
| `mockShippingProvider` | Default D-FRETE B | **MANTER** até cutover |
| Volumes ME = max eixos + peso | Sem caixas ainda | **CONSOLIDAR** com O1-C templates |

## Preço

| Item | Estado | Ação |
|------|--------|------|
| Resolução SQL / `priceResolutionService` | Canônico | **MANTER** |
| Espelho `products.price` | Form mostra resolvido + legado | **MANTER** (VAL 2026-11-06) |
| Formação editável em 3 UIs de preço | Campos comuns em `PricingRuleFields` | **MANTER** (VAL 2026-11-06; modal item = fluxo distinto) |

## Busca

| Item | Estado | Ação |
|------|--------|------|
| RPC `search_products` | Canônico loja | **MANTER** |
| `mockSearch` | Fallback offline | **NÃO TOCAR** (dev) |
| SearchBar vs busca do catálogo | Duas UIs | **CONSOLIDAR** copy (Onda 2) |

## Veículos

| Item | Estado | Ação |
|------|--------|------|
| PVC `year_start`/`year_end` | Canônico apps | **MANTER** |
| `vehicle_versions.year` | Legado escalar | **NÃO TOCAR** até migração dedicada |
| `own_vehicle_*` (frete) ≠ catálogo veículos | Domínios distintos | **MANTER** separados |

## UI admin duplicada

| Item | Estado | Ação |
|------|--------|------|
| Tabela pedidos Hub/Lista/Área | 2–3 implementações | **CONSOLIDAR** via `AdminOrdersListPanel` |
| “Retirar não pagos 48h” ×3 | Unificado em `adminExpireUnpaidFlow` | **MANTER** (VAL 2026-11-06) |
| Cascata categoria no form vs `CategoryCascadeSelects` | Form já usa o componente | **MANTER** |
| Import custo wizard × página fornecedor | 2 fluxos | **CONSOLIDAR** depois |
| CRUD Fabricantes / Montadoras / Fornecedores | Quase iguais | **CONSOLIDAR** genérico depois |
| Máscaras em `AdminShippingOriginPage` | Usa `lib/phone` + `formatCpfOrCnpjMask` | **MANTER** (VAL 2026-11-06) |
| Mapas de status pedido (3) | Cliente ≠ admin; admin≡operador em `orderLifecycle` | **MANTER** (VAL 2026-11-06) |
| Toast admin | Pedidos + classificação + preços + frete próprio; residual ainda `<p>` | **CONSOLIDAR** gradualmente |

## Gate

- [x] Inventário publicado
- [ ] Remoções só com VAL por item

**Assinatura:** O1-A 2026-11-05.
