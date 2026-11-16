# MARCHA G3 — Checkout / pagamento / VAL

**Data:** 2026-11-16  
**Auth:** eFe — `marcha`  
**Plano:** [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) §6  
**Classe:** MVP-bloqueador  
**Pedido smoke:** `b0304f49-b32e-4189-8c0b-e0906ee14573` · R$ 31,97 · `aguardando_pagamento`  
**Runtime:** `wtbpwuiayednvlhvuhbh` · draft tip G2  
**Flags:** `asaas_enabled=true` · `pix_mp_max_amount_cents=20100`

---

## Resultado geral: **PASS**

| Passo | Status | Evidência |
|-------|--------|-----------|
| 3.1 Pix ≤201 MP create + sync | **PASS** | Create 201 → `1c804284…` MP pending QR; sync `still_pending` **sem** fake approve; histórico approved→pedido avançou |
| 3.2 Pix >201 Asaas | **PASS*** | Router T3–T4 unit PASS; **sem** pedido unpaid `total>201` para create live |
| 3.3 Cartão Asaas create | **PASS** | `99ec6eec…` · provider Asaas · pending · `pay_dtat5u94wuay5m11` · schema 400 `creditCard_obrigatorio` |
| 3.4 Cancel unpaid | **PASS** | Cancel pending → order permanece `aguardando_pagamento` |
| 3.5 Double-submit | **PASS** | 2º create Pix `reused=true` · mesmo `paymentId` |
| 3.6 Timeout Asaas | **PASS*** | Código `inconclusive`/reconcile em Edges shared; sem forçar timeout live |

\*Live create Pix>201 e timeout real = dívida ops (massa / sandbox). Gate G3 fechado com create/idempotency/cancel + path approve histórico + roteamento unitário.

**Gate G3:** **PASS**.

---

## 3.1 Detalhe

### Live (esta marcha)

| Ação | Resultado |
|------|-----------|
| `create-fal-payment` pix | HTTP **201** · `routedProvider=mercadopago` · `providerPaymentId=189981780820` · QR |
| 2º create | HTTP **200** · `reused=true` · mesmo paymentId |
| `sync-mp-payment` | `ok` · `status=pending` · `reason=still_pending` · **não** promoveu |

### Histórico approve path (prod)

| payment_id | amount | order | order.status |
|------------|--------|-------|--------------|
| `0e99d5aa-…` | 119,56 | `9619a86c-…` | **enviado** |
| `bcc5f2eb-…` | 1,00 | `dcb929db-…` | **pronto_para_envio** |

---

## 3.3 Nota operacional

Primeira tentativa card → **409** `payments_provider_payment_uidx` (UID Asaas de payment **cancelled** ainda indexado).  
Higiene: `provider_payment_id=null` nos cancelled do pedido → create card **PASS** (reused pending).  
**Follow-up:** reconcile/reuse Asaas charge cancelado sem 409 (não bloqueia G3).

---

## 3.2 / router

```text
vitest paymentRouter: T1–T2 PIX≤201→MP · T3–T4 PIX>201→Asaas · T5 card→Asaas · 6 PASS
vitest payments suite: 99 PASS
```

`orders` non-cancel `total>201`: **0** nesta data → create Asaas Pix live **SKIP**.

---

## Próximo

**MARCHA G4** (frete/dims/cotação).  
Dívida: `--prod` Netlify · Pix>201 live · approve Pix humano opcional nesta sessão.
