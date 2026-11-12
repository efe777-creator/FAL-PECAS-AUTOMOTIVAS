# VAL — AJUSTE-035 MARCHA final | probe Edge webhook

**Data:** 2026-11-12  
**Auth:** eFe — `MARCHA`  
**Runtime:** `wtbpwuiayednvlhvuhbh` · Edge `mercado-pago-webhook`

---

## Escopo

Fechar residual automatizável de CP-PAY-021: endpoint público saudável, JWT off, assinatura exigida. Sem novo Pix R$1 nesta onda.

---

## Evidências

| # | Check | Resultado | Evidência |
|---|-------|-----------|-----------|
| 1 | OPTIONS Edge | **PASS** | HTTP **200** |
| 2 | POST sem headers MP | **PASS** | HTTP **401** `{"error":"missing_x_request_id"}` — chegou na função (não bloqueio JWT gateway) |
| 3 | `verify_jwt` webhook | **PASS** | `false` (functions list) |
| 4 | Secret + URL config | **PASS herdado** | [VAL CP-PAY-021](./FAL_MARCHA_AJUSTE_035_CHECKOUT_CP_PAY_021_SECRET_VAL_2026-11-12.md) |
| 5 | Ledger `payment_events` pós-config | **stale** | last `2026-11-09` — falta pagamento real do MP |
| 6 | UI Logs Edge | 0 rows | probe 401 pode não listar; resposta HTTP prova invocação |

---

## Veredicto AJUSTE-035 (ops agent)

| Pacote / prova | Status |
|----------------|--------|
| CHECKOUT-01…05 código + Netlify | **PASS** (marchas anteriores) |
| Recuperação mid-pay / approved | **PASS** |
| CP-PAY-021 config (URL+secret+JWT off+probe) | **PASS** |
| Delivery MP→ledger (1º pagamento pós-config) | **ABERTO opcional** |

**Assinatura agente:** MARCHA AJUSTE-035 webhook edge probe · onda agent completa · 2026-11-12.
