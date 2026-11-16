# MARCHA G7 — E2E / estabilidade / VAL

**Data:** 2026-11-16  
**Auth:** eFe — `marcha`  
**Plano:** [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) §10 · [FAL_MVP_COMPLETO_4.0.md](./FAL_MVP_COMPLETO_4.0.md) §5  
**Classe:** MVP-bloqueador  
**Preview:** https://6afb521712f1293fb9a055f1--fal-pecas-automotivas-efe.netlify.app/  
**Runtime:** `wtbpwuiayednvlhvuhbh`

---

## Resultado geral: **PASS**

### 7.1 Matriz 14 cenários

| # | Cenário | Status | Evidência |
|---|---------|--------|-----------|
| 1 | Cliente compra → pedido ok | **PASS** | `place_order` + pedidos smoke (`b0304f49…`, `dcb929db…`, `9619a86c…`) · [G3](./FAL_MARCHA_G3_CHECKOUT_PAY_VAL_2026-11-16.md) |
| 2 | Pagamento aprovado → status ok | **PASS** | 8 payments `approved`; trail `payment_approved` → ops · [G3]/[G5](./FAL_MARCHA_G5_OPS_VAL_2026-11-16.md) |
| 3 | Pagamento recusado → não aprovar | **PASS** | 9 `rejected`; pedidos ficam `aguardando_pagamento`/`cancelado` (ex. `36a3f271…`) · Asaas card declined VAL |
| 4 | Pagamento duplicado → sem duplicar | **PASS** | `create-fal-payment` 2º create `reused=true` · [G3] |
| 5 | Sem estoque bloqueia (`com_estoque`) | **PASS*** | Loja `sem_estoque`; path `com_estoque`+reserva no SQL; UI indisponível [G1] SK971 |
| 6 | Frete indisponível → informado | **PASS** | Envelope copy ME/FAL + `carrierRegistry` mensagem amigável · [G4] |
| 7 | Own fora cobertura → ocultada | **PASS** | Live Edge `quote-own-delivery` CEP `70040010` → `out_of_coverage` `options:[]`; CEP `01310100` → `priced` ownq |
| 8 | Cancel unpaid | **PASS** | RPC + G3/G6 |
| 9 | Enviado → rastreio | **PASS** | `9619a86c…` `SMOKE-C7-OWN` · [G4] |
| 10 | Problema entrega registrável | **PASS** | `customer_report_delivery_issue` + UI · [G6] |
| 11 | Admin preço → coerente | **PASS** | resolve/hydrate 5 pontos BRD2109 · [G2] |
| 12 | Pedido alheio negado | **PASS** | RLS `orders_select_own` · [G6] |
| 13 | Falha integração tratada | **PASS** | Create card 409/schema → UI erro; sync MP `still_pending` sem fake approve · [G3] |
| 14 | Mobile crítico + backup | **PASS*** | Catálogo preview OK (100 produtos); nav mobile; limpeza 001 **não** executada (backup gate G6) |

\*5: modo loja atual não exercita reserva física — contrato SQL+UI documentado.  
\*14: restore drill formal = dívida ops antes de limpeza 001.

### 7.2 Mobile

Preview catálogo: título/h1 OK · 24 cards · footer WA/tel · nav mobile presente.

### 7.3 KPIs

Hub admin: `adminCentralIndicators` + contagens de status/filas (`AdminOrdersHubPage`). Dashboard `AdminDashboardPage` no tip.

### 7.4 Limpeza órfãos

**SKIP** (só se estável) — não executada nesta marcha.

**Gate G7:** **PASS** — matriz anexada.

---

## Próximo

**MARCHA G8** (venda controlada) — exige eFe: rollback escrito + N vendas + monitor.  
Dívida: `--prod` Netlify · Pix>201 live · ME purchase live · e-mail loja.
