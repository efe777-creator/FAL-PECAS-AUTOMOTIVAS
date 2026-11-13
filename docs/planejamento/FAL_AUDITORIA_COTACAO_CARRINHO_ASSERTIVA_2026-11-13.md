# Auditoria completa — Cotação carrinho assertiva (Opção 1)

**Data:** 2026-11-13  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Spec:** [FAL_SPEC_COTACAO_CARRINHO_AGRUPADA_CAIXAS_POL_2026-11-13.md](./FAL_SPEC_COTACAO_CARRINHO_AGRUPADA_CAIXAS_POL_2026-11-13.md)  
**VALs:** inventário · calibração · smoke · [config/correções](./FAL_VAL_COTACAO_CARRINHO_CONFIG_CORRECOES_2026-11-13.md)  

---

## Veredito

**Implantação apta para uso** na loja (ME + FAL) com calibração de dados ok.  
Um GAP de snapshot (`checkout_quote` só na label) foi **corrigido nesta auditoria** (trigger no insert do shipment). Residual aceitável: packing v1 volume-sum, POL comercial ≈1 (seed), categorias vazias sem ancestral (FILTROS/FREIOS) sem default.

---

## 1. Runtime (wtbp) — PASS

| Item | Valor | Status |
|------|-------|--------|
| Published | 100 | OK |
| ME quote-ready (peso+L/A/P) | 100/100 | **PASS** |
| POL null / own sem POL | 0 / 0 | **PASS** |
| Caixas ativas P/M/G | 3 | **PASS** |
| ME serviços loja | PAC, SEDEX, Jadlog .Package | **PASS** |
| Own enabled + `distance_vehicle` | true · max 80 km | **PASS** |
| CEP cobertura | SP 010–059 · Guarulhos 070–073 · ZL 080–084 | **PASS** (Guarulhos corrigido) |
| Origem Guarulhos 07124543 | completa | **PASS** |
| Defaults classificação | 19 nós | **PASS** |
| `VITE_SHIPPING_PROVIDER` | melhorenvio | **PASS** |

---

## 2. Código — matriz funcional

| # | Fluxo | Status | Notas |
|---|-------|--------|-------|
| 1 | Carrinho conjunto + `loadCartLogistics` | **PASS** | Sem inventar dims |
| 2 | Packing loja ↔ Edge paridade | **PASS** | vitest parity |
| 3 | ME: 1 caixa / `packing_failed` / volumes | **PASS** | D6 |
| 4 | FAL: POL_TOTAL · moto ≤12 · fórmula | **PASS** | Sem caixas |
| 5 | Fingerprint `meq`/`ownq` no `place_order` | **PASS** | SEC |
| 6 | `shipping_amount` imutável | **PASS** | ops só `ops_quotes` |
| 7 | `checkout_quote` no shipment na compra | **PASS*** | *corrigido: trigger `trg_shipments_ensure_checkout_quote` + migration `20261113170000_…` |
| 8 | Apply medidas + herança pai | **PASS** | `resolveCategoryDefaultMeasures` |
| 9 | Filtro gap POL (elegíveis FAL) | **PASS** | `pol_unit` null + `own_delivery_allowed` |

\*Antes da auditoria: GAP (só backfill ME / 1ª label). Agora congela no INSERT/UPDATE do shipment.

---

## 3. Testes automatizados

```
npx vitest run src/lib/cartGroupedQuoteSmoke.test.ts
  src/lib/shippingPacking*.ts src/lib/opsShippingQuote.test.ts
  src/services/shipping/own/*.test.ts
  src/services/admin/adminMeasureGapFilter.test.ts
  src/services/admin/adminCategoryService.test.ts
  src/services/shipping/smokeFaseC.logic.test.ts
```

**Resultado:** 9 arquivos · **42 testes PASS** (2026-11-13).

Smoke S1–S6 (caixa P/M, packing_failed, moto/carro, frete congelado): **PASS**.

---

## 4. Correções feitas nesta marcha / auditoria

| Correção | Onde |
|----------|------|
| Defaults folha ← médias published | SQL wtbp |
| Rollup pais/filhos (SUSPENSÃO, KIT…) | SQL wtbp |
| CEP Guarulhos na cobertura FAL | `store_own_delivery_settings` |
| Herança apply pai | `adminCategoryService.ts` |
| Filtro POL + elegíveis | `adminProductService.ts` |
| Hints Logística / Caixas / Config | admin pages |
| Freeze `checkout_quote` no insert | migration + **aplicado no wtbp** |
| Spec own v2 desatualizado | plano funcional 04/11 |

---

## 5. Riscos residuais (aceitos Opção 1)

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| Packing = soma de volume (não 3D) | Média | Calibração caixas + ops re-cotação |
| Cotação stale se admin muda medidas com carrinho aberto | Baixa | Fingerprint no `place_order` rejeita |
| POL unitário ≈ 1 (seed) | Operacional | Revisar portes reais no admin |
| Categorias vazias (FILTROS/FREIOS) sem default | Baixa | Cadastrar médias antes de publish |
| Ops label ainda tem fallback dims se packing vazio | Ops only | Packing obrigatório ME antes da etiqueta |
| `db push` histórico local ≠ remote | Ops repo | SQL aplicado via `db query -f`; repair histórico separado |

---

## 6. Checklist operador (go-live cotação)

1. Carrinho 2+ itens CEP Guarulhos → FAL + ME com preço  
2. Carrinho que não cabe nas caixas → ME falha; FAL/retirada se aplicável  
3. Checkout `meq:` / `ownq:` → shipment com `metadata.checkout_quote`  
4. Packing diverge → `ops_quotes`; `orders.shipping_amount` igual  
5. Admin produtos → filtro “Sem capacidade de entrega” → lista vazia (hoje)

---

## 7. Conclusão

| Pergunta | Resposta |
|----------|----------|
| Cotação agrupada funciona? | **Sim** |
| Medidas/caixas/POL calibrados no published? | **Sim** |
| FAL cobre a região da loja? | **Sim** (após correção Guarulhos) |
| Frete cliente protegido pós-separação? | **Sim** |
| Snapshot checkout na compra? | **Sim** (após trigger desta auditoria) |
| Falta multi-caixa / 3D? | **Fora** da Opção 1 |

**Status final:** **GO** para operação com monitoramento de divergência packing×cotação e calibração fina de POL.
