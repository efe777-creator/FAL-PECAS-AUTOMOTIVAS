# MARCHA P0 — Alinhamento pay / VAL

**Data:** 2026-11-16  
**Auth:** eFe — `marcha` · fechar P0; se prod impossível → **preview**  
**Plano:** [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) §3  
**Classe:** MVP-bloqueador  
**Tip:** `622c3a2` (+ código pay `9804263`)  
**Runtime:** Supabase `wtbpwuiayednvlhvuhbh` · Netlify `fal-pecas-automotivas-efe`

---

## Resultado geral: **PASS** (front tip via **draft/preview**; prod Netlify ainda Forbidden)

| Passo | Status | Evidência |
|-------|--------|-----------|
| 0.1 Inventário A/B/C(+D) | **PASS** | § inventário |
| 0.2 Autorização | **PASS** | `marcha` + aceite preview se prod falhar |
| 0.3 Testes | **PASS** | 127 pay + 10 notif |
| 0.4 Commits + push | **PASS** | `97bd834` · `783de2a` · `9804263` · `2ee9a4b` · `622c3a2` → `origin/main` |
| 0.5 Migration SQL | **PASS** | adjust % + RPC no wtbp |
| 0.6 Edges | **PASS** | Deployed + smoke create |
| 0.7 Flags | **PASS** | `asaas_enabled=true`, `pix_mp_max_amount_cents=20100` |
| 0.8 Front tip + smoke create | **PASS** | Draft tip + Edge create (abaixo) |

**Gate P0 completo:** **SIM** — tip ≡ Edges ≡ SQL ≡ **front draft tip**.  
**Dívida:** promover draft → prod quando crédito Netlify liberar (`--prod` ainda Forbidden).  
**G3 UI:** usar draft até prod; Edges já validam create.

---

## 0.1 Inventário

### A — Pay Asaas cartão / Edges  
Checkout + AsaasEmbedded + Edges pay-* + shared asaas* + smokes + admin payments.

### B — Condição %  
Migration `20261116140000_*` + PaymentAdjust + paymentDisplay + apply_payment_condition + hints vitrine.

### C — Notificações mobile  
Bell/Inbox + Header + AdminLayout.

### D — Docs PRD 4.0 + este VAL  

### Excluído  
`.deploy-*.json`, `scripts/` raiz, `_tmp-*`.

---

## 0.3 Testes

```text
vitest pay suite → 19 files / 127 tests PASS
vitest notif → 2 files / 10 tests PASS
```

---

## 0.4 Commits

| Hash | Mensagem |
|------|----------|
| `97bd834` | docs PRD 4.0 / consolidação |
| `783de2a` | feat(pay) A+B |
| `9804263` | fix(ui) notif C |
| `2ee9a4b` / `622c3a2` | docs VAL P0 |

---

## 0.5–0.7 Remoto wtbp

CLI linked `wtbpwuiayednvlhvuhbh`. MCP `owllmfcpbodqmoerdfxx` = errado para FAL.  
Asaas ligado; RPC/colunas adjust presentes.

---

## 0.6 Smoke create (Edges)

Pedido: `b0304f49-b32e-4189-8c0b-e0906ee14573` · R$ 31,97

| Caso | Resultado | Evidência |
|------|-----------|-----------|
| Cartão debit → Asaas | **PASS** | `smoke-asaas-card-create.mjs` · HTTP 200 · `provider=asaas` |
| Pix ≤201 → MP | **PASS** | HTTP 201 · `routedProvider=mercadopago` · QR · `e167d9bc-…` |
| Pix >201 → Asaas | **SKIP** | sem pedido unpaid `total>201` |

---

## 0.8 Netlify

| Tentativa | Resultado |
|-----------|-----------|
| `netlify deploy --prod` | **Forbidden** (crédito / conta) |
| `netlify deploy --dir=dist` (draft) | **PASS** live |
| **Draft URL** | https://6afb46f555cdaeb282fbeef6--fal-pecas-automotivas-efe.netlify.app |
| Deploy id | `6afb46f555cdaeb282fbeef6` |
| Probe tip | `engine-*` contém `create-fal-payment` + Asaas; Checkout contém `pay-asaas` + `adjust_percent`; ProductCard `adjustPercent` |
| Prod published | ainda `6afb24f2…` (legado) — **não** tip |

Aceite eFe: **preview fecha P0.8** enquanto prod estiver bloqueado.

---

## Próximo

1. **MARCHA G1** (produto/fitment) conforme consolidação.  
2. Quando crédito Netlify: `netlify deploy --prod --dir=dist` do tip.  
3. Marcha visual (cores/botões) = frente separada pós-P0 / paralelo leve — não bloqueia G1 prep.
