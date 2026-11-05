# VAL — Smoke ownq + M7 etiqueta (+ packing HTTP)

**Data:** 2026-11-05  
**Auth:** eFe — `MARCHA`  
**Runtime:** `wtbpwuiayednvlhvuhbh`  
**Loja:** https://fal-pecas-automotivas.netlify.app

---

## Escopo

Fechar smoke sequencial pós packing: frete próprio `ownq` / ciclo M7 / etiqueta ME Expedição; validar packing live após redeploy.

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Redeploy `quote-shipping` com `_shared/shippingPacking.ts` | **PASS** — assets packing + melhorEnvioCore |
| 2 | Smoke HTTP ME → `volumes.packingMode=box_template` + `boxName=Caixa P` | **PASS** — quote `95fb9d0d-…` · SEDEX R$ 15,72 |
| 3 | Fallback oversize → `packingMode=max_axes` | **PASS** — quote `03b3fddf-…` |
| 4 | Persistência `shipping_quotes.volumes.packingMode` | **PASS** — rows pós-17:15Z com `box_template` / `max_axes` |
| 5 | `place_order` ownq (pedido + quote consumida + shipment `own`) | **PASS** — order `5bc43c25-…` · quote `39ecaae5-…` · ship R$ 71,42 · status ainda `aguardando_pagamento` |
| 6 | M7 ship → deliver (ciclo operador) | **PASS** — âncora `08da5ada-…` · `entregue` · carrier `FAL_MANUAL` · tracking `SMOKE-M7-20261105` · [VAL anterior](./FAL_MARCHA_OPS_E2E_ENTREGA_VAL_2026-11-05.md) |
| 7 | Etiqueta ME Expedição (`purchase`→`print`) | **GATE** — âncora só `label_state=quoted`; pedido já `entregue` (Edge exige `pronto_para_envio`); sem outro ME pago em Expedição; compra real = staff + `confirm:true` (D10) |

---

## Evidência packing (HTTP)

- Destino CEP `01310100`, origem loja `07124543`.
- Item 1,2 kg / 18×12×8 → **Caixa P** (20×15×10, tara 0,15) · peso cotado 1,35 kg.
- Oversize 80³ → max_axes (nenhuma caixa coube).
- Nota: `originPostalCode` inventado (`07020101`) → ME 422; usar origem ativa da loja.

---

## STOP / próximo

| Item | Estado |
|------|--------|
| Packing Edge + smoke HTTP | **FEITO** |
| ownq place_order | **FEITO** (pagamento do smoke não exigido nesta frente) |
| M7 entregue (manual) | **FEITO** |
| ME-C3 etiqueta purchase/print E2E | **PENDENTE humano** — pedido ME em `pronto_para_envio` + operador na Expedição |
| D-FRETE C cutover loja | **Não** — só com assinatura eFe |

**Assinatura:** VAL ownq/M7 smoke 2026-11-05 · packing HTTP PASS · etiqueta ME gate.
