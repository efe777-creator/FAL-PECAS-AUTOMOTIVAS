# MARCHA G4 — Frete / entrega / VAL

**Data:** 2026-11-16  
**Auth:** eFe — `marcha`  
**Plano:** [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) §7  
**Classe:** MVP-bloqueador  
**Pedido gate (pago → enviado + rastreio):** `9619a86c-8434-49d1-bbf1-4ffcc388f88e` · own · `SMOKE-C7-OWN`  
**ME histórico:** `08da5ada-3fc7-4cbd-a8a0-0663974b6ff3` · `SMOKE-M7-20261105` · delivered  
**Runtime:** `wtbpwuiayednvlhvuhbh` · draft tip G3 `fec7ed4`  
**Draft:** https://6afb4b44c2d649ae60636085--fal-pecas-automotivas-efe.netlify.app/

---

## Resultado geral: **PASS**

| Passo | Status | Evidência |
|-------|--------|-----------|
| 4.1 SKUs weight/dims | **PASS** | published `100/100` sem missing_dims; BRD2109 `0.9kg · 8×8×45`; TDI1083 `0.35kg · 6×8×12` |
| 4.2 Cotação conjunto | **PASS** | Carrinho guest draft · CEP `01310-100` + nº `100` · SEDEX `R$ 15,34` · Jadlog `R$ 15,79` · Entrega FAL moto `R$ 69,03` · retirada · SEDEX selecionável |
| 4.3 Own provisional ≠ place_order | **PASS** | `own:confirm_checkout` provisional só PDP; fechamento via `ownq:<uuid>:<vehicle>`; vitest shipping/session/own **74 PASS**; `resolve_own_quote_shipping_option` no remoto |
| 4.4 ME purchase → depois `ship_order` | **PASS** | `evaluateShipOrderGates` bloqueia `me_label_not_purchased`; vitest `meLabelShipGates` PASS; RPC `ship_order` seta `enviado`+tracking; ME `08da5ada…` tracking `SMOKE-M7-20261105` |
| 4.5 Rastreio em `/conta/pedidos/:id` | **PASS** | UI `AccountOrderDetailPage` bloco Envio → `Rastreio:` + link (`trackingCode` / `metadata.tracking_url`); pedido `9619a86c…` `tracking_code=SMOKE-C7-OWN` + URL em metadata |

**Gate G4:** **PASS** — pedido pago `9619a86c…` status `enviado` · shipment `78552135…` · rastreio `SMOKE-C7-OWN`.

---

## 4.1 Detalhe

```text
products status=published: total=100 · missing_dims=0
BRD2109 weight_kg=0.900 length=8 width=8 height=45
```

Cotação ME live no carrinho **sem** erro `missing_dims`.

---

## 4.2 Detalhe (live draft)

SKU smoke: **BRD2109** no carrinho (1 un.).

| Opção | Valor | Prazo |
|-------|-------|-------|
| Correios — SEDEX | R$ 15,34 | 1–2 d |
| Jadlog — .Package | R$ 15,79 | 6–8 d |
| Entrega FAL (Motocicleta) — estimativa | R$ 69,03 | 1–3 d |
| Retirada na loja | R$ 0,00 | — |

Copy UI: *“Cotação do conjunto no carrinho; o checkout revalida frete e pagamento.”*  
SEDEX marcado **checked** após seleção.

---

## 4.3 / unit

```text
vitest src/services/shipping + meLabelShipGates + meLabelPurchaseGates: 18 files · 74 PASS
```

`place_order` resolve só `meq:` / `ownq:` / mock·retirada — provisional `own:confirm_checkout` não fecha pedido.

---

## 4.4 / 4.5

| order_id | provider | status pedido | tracking |
|----------|----------|---------------|----------|
| `9619a86c-…` | own | **enviado** | `SMOKE-C7-OWN` + `https://rastreio.exemplo/smoke-c7-own` |
| `08da5ada-…` | melhorenvio | delivered (shipment) | `SMOKE-M7-20261105` |

Regra canônica: compra/geração de etiqueta ME **não** implica `enviado`; só `ship_order`.

\*Nova compra de etiqueta ME live nesta sessão = dívida ops (D-G4-ME / saldo ME). Gate fechado com gates unitários + RPC + pedidos históricos com rastreio.

---

## Próximo

**MARCHA G5** (ops: fila pago → separação → pronto_para_envio).  
Dívida: `--prod` Netlify · Pix>201 live · etiqueta ME purchase live opcional.
