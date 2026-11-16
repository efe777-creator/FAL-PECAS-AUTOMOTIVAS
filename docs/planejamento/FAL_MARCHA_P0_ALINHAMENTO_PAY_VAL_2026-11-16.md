# MARCHA P0 — Alinhamento pay / VAL

**Data:** 2026-11-16  
**Auth:** eFe — `marcha`  
**Plano:** [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) §3  
**Classe:** MVP-bloqueador  
**Tip base:** `4e7fab19` → tip pós-MARCHA `9804263`  
**Runtime:** Supabase `wtbpwuiayednvlhvuhbh` · Netlify espelho `fal-pecas-automotivas-efe`

---

## Resultado geral: **PARCIAL** (bloqueado só em Netlify/smoke front)

| Passo | Status | Evidência |
|-------|--------|-----------|
| 0.1 Inventário A/B/C(+D) | **PASS** | § inventário abaixo |
| 0.2 Autorização | **PASS** | `marcha` |
| 0.3 Testes | **PASS** | 127 pay + 10 notif |
| 0.4 Commits + push | **PASS** | `97bd834` docs · `783de2a` pay A+B · `9804263` notif C → `origin/main` |
| 0.5 Migration SQL | **PASS** | Colunas `%_adjust_percent` + RPC `apply_payment_condition_to_order` já no remoto wtbp (conteúdo aplicado; lista migration local/remoto segue com drift histórico) |
| 0.6 Edges | **PASS** | Deployed: `create-fal-payment`, `pay-asaas-credit-card`, `asaas-webhook`, `create-asaas-payment` |
| 0.7 Flags | **PASS** | `asaas_enabled=true`, `pix_mp_max_amount_cents=20100` |
| 0.8 Netlify + smoke create | **BLOCKED** | Deploy `6afb44d8…` → *Skipped due to account credit usage exceeded*; CLI `Forbidden` |

**Gate P0 completo:** **NÃO** — falta front prod alinhado + smoke create.  
**Pode avançar prep G1 dados:** SIM.  
**G3 smoke humano:** **STOP** até Netlify/crédito ou deploy alternativo.

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
`.deploy-*.json`, `scripts/` raiz (ops).

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

Push: `4e7fab1..9804263` → `origin/main`.

---

## 0.5–0.7 Remoto wtbp

- MCP `user-supabase` aponta para `owllmfcpbodqmoerdfxx` (**errado** para FAL) — não usar para migrate FAL.  
- CLI linked: `wtbpwuiayednvlhvuhbh`.  
- Read-only: colunas adjust + RPC existem; Asaas **ligado**.

---

## 0.8 Netlify

| Tentativa | Resultado |
|-----------|-----------|
| MCP deploy-site `79994809-…` dist | error: credit usage exceeded |
| `netlify deploy --prod` | Forbidden |

**Ação humana:** liberar crédito Netlify time eFe **ou** publicar `fal-pecas/dist` por caminho autorizado; depois smoke Pix create ≤201 / >201 e cartão create.

---

## Próximo

1. eFe resolve crédito / publish front.  
2. Smoke create (não approve ainda) → fechar P0.  
3. Abrir G1/G2 prep conforme consolidação.
