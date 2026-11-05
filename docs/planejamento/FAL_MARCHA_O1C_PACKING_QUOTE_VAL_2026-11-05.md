# VAL — MARCHA O1-C packing na cotação

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Edge:** `quote-shipping` (redeploy 05/11)  
**Depende:** [O1-C caixas wtbp](./FAL_MARCHA_O1C_CAIXAS_WTBP_VAL_2026-11-05.md)

---

## Escopo

Usar a menor caixa ativa (`shipping_box_templates`) no calculate Melhor Envio, em vez de só max-eixos.

**Regra v1:** volume = soma L×W×H×qty; peso = soma pesos + peso da embalagem; 1 caixa por cotação.  
**Fallback:** se nenhuma caixa couber → comportamento legado (produtos individuais / max eixos).

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | `src/lib/shippingPacking.ts` + espelho Edge `_shared` | **PASS** |
| 2 | vitest packing | **PASS** (3) |
| 3 | Edge lê caixas ativas e monta 1 volume `box:…` | **PASS** (código) |
| 4 | `volumes.packingMode` = `box_template` \| `max_axes` | **PASS** |
| 5 | Deploy `quote-shipping` wtbp | **PASS** — assets packing + melhorEnvioCore |
| 6 | Seed P/M/G no wtbp | **PASS** (marcha anterior) |
| 7 | Smoke HTTP calculate com JWT | **PASS** 05/11 — quote `95fb9d0d-…` `box_template`/`Caixa P`; oversize `03b3fddf-…` `max_axes` · [VAL ownq/M7](./FAL_MARCHA_OWNQ_M7_SMOKE_VAL_2026-11-05.md) |

---

## Como validar na loja (smoke humano)

1. Provider loja `melhorenvio` (ou ambiente que chame a Edge).  
2. Carrinho/PDP com item com peso+dims.  
3. Cotar CEP válido (origem = `store_shipping_origin` ativa).  
4. Em `shipping_quotes` / resposta: `volumes.packingMode=box_template`, `boxName` Caixa P/M/G.

---

## STOP

Packing v1 **no Edge + smoke HTTP PASS**. UI defaults categoria = [VAL](./FAL_MARCHA_O1C_CATEGORY_DEFAULTS_VAL_2026-11-05.md). Etiqueta ME-C3 = gate humano.

**Assinatura:** VAL packing quote PASS (código+deploy+HTTP) 2026-11-05.
