# VAL — Smoke completo cotação carrinho / checkout / frete

**Data:** 2026-11-13  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Auth:** eFe  
**Specs:**  
[FAL_SPEC_COTACAO_CARRINHO_AGRUPADA_CAIXAS_POL_2026-11-13.md](./FAL_SPEC_COTACAO_CARRINHO_AGRUPADA_CAIXAS_POL_2026-11-13.md) ·  
[FAL_VAL_CARRINHO_CHECKOUT_FRETE_PRESELECT_2026-11-13.md](./FAL_VAL_CARRINHO_CHECKOUT_FRETE_PRESELECT_2026-11-13.md) ·  
[FAL_AUDITORIA_COTACAO_CARRINHO_ASSERTIVA_2026-11-13.md](./FAL_AUDITORIA_COTACAO_CARRINHO_ASSERTIVA_2026-11-13.md)

---

## Veredito

**SMOKE COMPLETO = PASS** (unitário + runtime + Edges live ME/own).

---

## A — Unitário (vitest)

**13 arquivos · 61 testes · PASS**

| Bloco | Arquivos | Resultado |
|-------|----------|-----------|
| Packing ME / paridade Edge | `shippingPacking*` | PASS |
| Smoke agrupada S1–S6 | `cartGroupedQuoteSmoke` | PASS |
| Fingerprint conjunto | `cartQuoteFingerprint` | PASS |
| Handoff + pré-seleção | `shippingQuoteSession` · `preferStorefrontShippingOption` | PASS |
| Storefront filtro | `quoteStorefrontShipping` | PASS |
| POL / veículo | `ownPol` · `ownVehicleSelect` | PASS |
| Frete congelado / Fase C | `opsShippingQuote` · `smokeFaseC.logic` | PASS |
| Admin medidas/POL/herança | `adminMeasureGapFilter` · `adminCategoryService` | PASS |

```
npx vitest run src/lib/cartGroupedQuoteSmoke.test.ts src/lib/shippingPacking.test.ts src/lib/shippingPackingParity.test.ts src/lib/opsShippingQuote.test.ts src/services/shipping/cartQuoteFingerprint.test.ts src/services/shipping/shippingQuoteSession.test.ts src/services/shipping/preferStorefrontShippingOption.test.ts src/services/shipping/own/ownPol.test.ts src/services/shipping/own/ownVehicleSelect.test.ts src/services/shipping/quoteStorefrontShipping.test.ts src/services/shipping/smokeFaseC.logic.test.ts src/services/admin/adminMeasureGapFilter.test.ts src/services/admin/adminCategoryService.test.ts
```

---

## B — Runtime wtbp (config)

| Check | Valor | Status |
|-------|-------|--------|
| Published ME-ready | 100/100 | **PASS** |
| POL null published | 0 | **PASS** |
| Caixas ativas | 3 (P/M/G) | **PASS** |
| ME enabled | 3 (PAC/SEDEX/Jadlog) | **PASS** |
| Own | `distance_vehicle` enabled | **PASS** |
| CEP Guarulhos origem | cobertura true | **PASS** |
| CEP SP capital | cobertura true | **PASS** |
| Trigger `checkout_quote` | presente | **PASS** |

---

## C — Edge live (conjunto 2 itens)

### C1 — `quote-shipping` (ME) · CEP 07124543 · 2 terminais

| Critério | Resultado |
|----------|-----------|
| status | **ok** |
| packingMode | **box_template** · **Caixa P** |
| volumes | 1 caixa 20×15×10 · peso 0,85 (itens 0,7 + empty 0,15) |
| opções | SEDEX R$ 12,68 · Jadlog .Package R$ 15,23 |
| fingerprint | inclui os 2 productIds | **PASS** |

### C2 — `quote-own-delivery` (FAL) · Paulista 01310100 · qty 2+1

| Critério | Resultado |
|----------|-----------|
| status | **priced** |
| POL_TOTAL | **3** (1+1+1) |
| veículo | **motorcycle** |
| distância ida | 28,149 km |
| opção | `ownq:…:motorcycle` · R$ 70,37 | **PASS** |

### C3 — Own mesmo CEP da origem (07124543 nº 424)

| Critério | Resultado |
|----------|-----------|
| status | `routing_error` · “Rota não encontrada” | **RISK** (Google Routes origem≈destino / geocode) |
| Mitigação | Destinos reais na cobertura (ex. SP capital) cotam; retirar na loja cobre quem está no endereço da origem |

---

## D — Matriz funcional (carrinho → checkout)

| # | Cenário | Evidência | Status |
|---|---------|-----------|--------|
| D1 | Conjunto multi-item → 1 caixa | Edge C1 | **PASS** |
| D2 | Fingerprint muda com SKU | unit | **PASS** |
| D3 | Handoff pré-seleciona no checkout | unit prefer/match | **PASS** |
| D4 | FAL POL → moto ≤12 | Edge C2 + unit S4 | **PASS** |
| D5 | Frete cliente congelado | unit S6 / Fase C | **PASS** |
| D6 | checkout_quote no insert | trigger runtime | **PASS** |

---

## E — Smoke humano residual (opcional UI)

1. `/carrinho` 2 itens → CEP 01310-100 + nº → ver ME + FAL + retirada  
2. Escolher Jadlog → Finalizar → checkout etapa Entrega com Jadlog marcado  
3. Trocar SKU no carrinho → voltar checkout → re-cota (fingerprint)

Não bloqueia o **PASS** do smoke completo (Edges + unit cobrem o motor).

---

## STOP

**GO.** Residual: own `routing_error` em endereço idêntico à origem — monitorar; não impede cotação agrupada ME nem FAL para destinos válidos na cobertura.
