# VAL — AJUSTE-035 MARCHA | mid-pay recovery + CP-PAY-021 status

**Data:** 2026-11-12  
**Auth:** eFe — `MARCHA`  
**Runtime:** local `localhost:5173` · `wtbpwuiayednvlhvuhbh` · MP app `FALPecasSandbox` (`8320396999442614`)

---

## Escopo

Fechar residual de recuperação mid-pay (refresh com cobrança pendente) e avançar o que for automatizável em CP-PAY-021.

---

## Evidências

| # | Check | Resultado | Evidência |
|---|-------|-----------|-----------|
| 1 | Mid-pay **cartão pending** | **PASS** | sessão `949fce4f…` + `/checkout` → permanece checkout · `Etapa 2 de 2 — Pagamento` · **Pagamento com cartão** · copy “Aguardando confirmação do Mercado Pago…” |
| 2 | Mid-pay **Pix pending/expirado** | **PASS** | sessão `2d664b26…` + `/checkout` → `Pix — aguardando confirmação` · **Código Pix expirado** · `Status: expirado · Pedido 2d664b26` · sem fake success |
| 3 | Unit resume pending/expired | **PASS herdado** | `resumeCheckoutOutcome.test.ts` |
| 4 | Webhook URL sandbox→Edge | **PASS** | `save_webhook` 2026-11-12 · callback + sandbox = `…/functions/v1/mercado-pago-webhook` · topic `payment` |
| 5 | Secret Edge ↔ MP | **GATE humano** | Supabase tem `MP_WEBHOOK_SECRET` (desde 2026-10-14); MP mostra prefixo `80d0ae1…` · painel exigiu **OTP WhatsApp** nesta marcha |
| 6 | `notifications_history` | **vazio** | sem deliveries ainda |
| 7 | `payment_events` | **stale** | last_at `2026-11-09` (10 rows) |
| 8 | App MP **live** (≠ sandbox) | **fora MCP** | OAuth só lista `FALPecasSandbox` |

---

## CP-PAY-021

| Camada | Status |
|--------|--------|
| URL webhook Edge (sandbox MCP) | **OK** (reconfirmado) |
| Secret alinhado | **PASS** — set no Supabase `2026-11-12T16:17:20Z` · [VAL](./FAL_MARCHA_AJUSTE_035_CHECKOUT_CP_PAY_021_SECRET_VAL_2026-11-12.md) |
| App live webhook URL | **PASS** — Edge `wtbp…/mercado-pago-webhook` · [VAL CP-PAY-021](./FAL_MARCHA_AJUSTE_035_CHECKOUT_CP_PAY_021_SECRET_VAL_2026-11-12.md) |
| Mitigação | `sync-mp-payment` ACTIVE |

### Ação humana (1 passo)

1. Completar login/OTP em [webhooks app 8320396999442614](https://www.mercadopago.com.br/developers/panel/app/8320396999442614/webhooks)  
2. Copiar **secret key** completa  
3. `npx supabase secrets set MP_WEBHOOK_SECRET="<secret>" --project-ref wtbpwuiayednvlhvuhbh`

---

## Veredicto

| Critério | Status |
|----------|--------|
| Recuperação mid-pay (pending/expired) | **PASS** |
| Recuperação retorno tardio approved | **PASS** (VAL anterior) |
| CP-PAY-021 completo | **PARCIAL** — URL OK; secret + live = D |

**Assinatura agente:** MARCHA AJUSTE-035 mid-pay + webhook status · 2026-11-12.
