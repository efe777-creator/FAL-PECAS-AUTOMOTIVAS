# VAL — Smoke cotação carrinho agrupada (Opção 1)

**Data:** 2026-11-13  
**Spec:** [FAL_SPEC_COTACAO_CARRINHO_AGRUPADA_CAIXAS_POL_2026-11-13.md](./FAL_SPEC_COTACAO_CARRINHO_AGRUPADA_CAIXAS_POL_2026-11-13.md)  
**Código:** `fal-pecas/src/lib/cartGroupedQuoteSmoke.test.ts`  

---

## Critérios

| # | Cenário | Resultado |
|---|---------|-----------|
| S1 | 1 item → Caixa P | **PASS** |
| S2 | N itens volume-sum → 1 volume Caixa M | **PASS** |
| S3 | packing_failed sem inventar envelope | **PASS** |
| S4 | POL_TOTAL ≤ 12 → moto | **PASS** |
| S5 | POL_TOTAL ≥ 13 → carro + fórmula tarifa | **PASS** (10 km → R$ 40) |
| S6 | checkout_quote congelado vs ops | **PASS** |
| U1 | packing / parity / ownPol / vehicle / opsQuote | **PASS** — 19 testes |

```
npx vitest run src/lib/cartGroupedQuoteSmoke.test.ts
npx vitest run src/lib/shippingPacking.test.ts src/lib/shippingPackingParity.test.ts src/services/shipping/own/ownPol.test.ts src/services/shipping/own/ownVehicleSelect.test.ts src/lib/opsShippingQuote.test.ts
```

---

## STOP

E2E humano loja (CEP real + ME live) permanece opcional; smoke unitário cobre regras canônicas da marcha.
