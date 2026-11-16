# MARCHA P0 — Alinhamento pay / VAL

**Data:** 2026-11-16  
**Auth:** eFe — `marcha`  
**Plano:** [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) §3  
**Classe:** MVP-bloqueador  
**Tip:** `2ee9a4b` (docs VAL) · código pay `9804263`  
**Runtime:** Supabase `wtbpwuiayednvlhvuhbh` · Netlify espelho `fal-pecas-automotivas-efe`

---

## Resultado geral: **PARCIAL** (Netlify/front tip ainda bloqueado)

| Passo | Status | Evidência |
|-------|--------|-----------|
| 0.1 Inventário A/B/C(+D) | **PASS** | § inventário abaixo |
| 0.2 Autorização | **PASS** | `marcha` |
| 0.3 Testes | **PASS** | 127 pay + 10 notif |
| 0.4 Commits + push | **PASS** | `97bd834` docs · `783de2a` pay A+B · `9804263` notif C · `2ee9a4b` VAL → `origin/main` |
| 0.5 Migration SQL | **PASS** | Colunas `%_adjust_percent` + RPC `apply_payment_condition_to_order` no remoto wtbp |
| 0.6 Edges | **PASS** | Deployed + smoke create abaixo |
| 0.7 Flags | **PASS** | `asaas_enabled=true`, `pix_mp_max_amount_cents=20100` |
| 0.8 Netlify + smoke front | **BLOCKED** | crédito Netlify; live ≠ tip |

**Gate P0 completo:** **NÃO** — falta publicar tip no espelho eFe.  
**Edges create (sem front):** cartão + Pix ≤201 **PASS**.  
**G3 smoke humano UI:** **STOP** até Netlify.

---

## 0.1 Inventário

### A — Pay Asaas cartão / Edges  
Checkout + AsaasEmbedded + Edges pay-* + shared asaas* + smokes + admin payments + VALs cartão.

### B — Condição %  
Migration `20261116140000_*` + PaymentAdjust + paymentDisplay + apply_payment_condition + ProductCard/Cart hints.  
**Overlap A+B:** `CheckoutPage` → commit único A+B.

### C — Notificações mobile  
Bell/Inbox + Header + AdminLayout + VAL mobile.

### D — Docs PRD 4.0  
Hierarquia canônica + este VAL.

### Excluído  
`.deploy-*.json`, `scripts/` raiz (ops), `fal-pecas/scripts/_tmp-*`.

---

## 0.3 Testes

```text
vitest payments + paymentDisplay + paymentCondition + PaymentAdjust + checkoutReturnTo
→ 19 files / 127 tests PASS

vitest notificationDisplay + appNotificationCopy
→ 2 files / 10 tests PASS
```

---

## 0.4 Commits

| Hash | Mensagem |
|------|----------|
| `97bd834` | docs: PRD 4.0, visão 2040 e plano assertivo de consolidação MVP (P0–G8) |
| `783de2a` | feat(pay): Asaas cartão embutido, condição % vitrine e Edges P0 (A+B) |
| `9804263` | fix(ui): inbox notificações mobile e admin sem corte (P0 pacote C) |
| `2ee9a4b` | docs(P0): VAL parcial — Edges/SQL ok, Netlify bloqueado por crédito |

Push: `origin/main` @ `2ee9a4b`.

---

## 0.5–0.7 Remoto wtbp

- MCP `user-supabase` aponta para `owllmfcpbodqmoerdfxx` (**errado** para FAL) — não usar para migrate FAL.  
- CLI linked: `wtbpwuiayednvlhvuhbh`.  
- Read-only: colunas adjust + RPC existem; Asaas **ligado**.

---

## 0.6 Smoke create (Edges — sem Netlify)

Pedido smoke: `b0304f49-b32e-4189-8c0b-e0906ee14573` · total **R$ 31,97** · profile `ddb45683-…`

| Caso | Resultado | Evidência |
|------|-----------|-----------|
| Cartão debit → Asaas | **PASS** | `smoke-asaas-card-create.mjs` · HTTP 200 · `provider=asaas` · `paymentId=0aa999a9-…` · pending (reused) |
| Pix ≤201 → MP | **PASS** | prep cancel pending + create · HTTP **201** · `routedProvider=mercadopago` · `providerPaymentId=189977718438` · QR + URL · ledger `e167d9bc-…` |
| Pix >201 → Asaas | **SKIP** | só pedidos `total>201` em status `cancelado`; não inventar pedido prod |

---

## 0.8 Netlify

| Tentativa | Resultado |
|-----------|-----------|
| MCP deploy-site `79994809-…` | credit usage exceeded / proxy **404** |
| `netlify deploy --prod --dir=dist` | **Forbidden** (retry pós-rebuild) |
| Live published | `6afb24f2…` — *checkout Voltar + Cancelar compra* (15:45Z) |
| Probe live Checkout | **sem** `create-fal-payment` / `AsaasEmbedded` / `PaymentAdjust` no bundle tip |

`dist` rebuild local OK (tip atual). **Publicação tip bloqueada por crédito da conta.**

**Ação humana:** liberar crédito Netlify time eFe **ou** publicar `fal-pecas/dist` por caminho autorizado → depois smoke UI create + (opcional) pedido >201 Asaas Pix.

---

## Próximo

1. eFe libera crédito / publish tip `9804263`+ no espelho.  
2. Smoke UI create no front publicado → fechar P0.8.  
3. Abrir G1/G2 prep conforme consolidação (já liberada prep dados).
