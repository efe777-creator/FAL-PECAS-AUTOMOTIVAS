# VAL — AJUSTE-035 MARCHA | prova operacional + webhook sandbox

**Data:** 2026-11-12  
**Auth:** eFe — `MARCHA`  
**Runtime:** `wtbpwuiayednvlhvuhbh` · MCP MP app `FALPecasSandbox` (`8320396999442614`) · local admin

---

## Escopo

Fechar provas de aceite AJUSTE-035 que faltavam após smoke/deploy: **operacional (Central)** + avanço **CP-PAY-021** no app sandbox MCP. Sem novo Pix live R$1.

---

## Evidências

| # | Check | Resultado | Evidência |
|---|-------|-----------|-----------|
| 1 | Central — pedido pendente | **PASS** | `949fce4f-…` · UI `Aguardando pagamento` · `Status: pendente (Mercado Pago) · Cartão` |
| 2 | Central — pedido pago/entregue | **PASS** | `66dd89ff-…` · `Status: aprovado (Mercado Pago) · Pix` · timeline `Pagamento aprovado` |
| 3 | C1 unit | **PASS** | 5/5 `resolveCheckoutPaymentOutcome` |
| 4 | Webhook URL sandbox+prod (app MCP) | **PASS** | `save_webhook` → Edge `…/functions/v1/mercado-pago-webhook` · topics `payment` · updated 2026-11-12 |
| 5 | Histórico notificações MP | **vazio** | `notifications_history` sem deliveries ainda |
| 6 | `payment_events` recentes | **stale** | last_at `2026-11-09` (10 rows) — confirma gap webhook→ledger |
| 7 | Secret Edge `MP_WEBHOOK_SECRET` | **GATE humano** | `save_webhook` regenera secret (prefixo `80d0ae1…`); precisa espelhar no Supabase secrets |
| 8 | App MP **produção live** (collector) | **fora do MCP** | MCP só vê `FALPecasSandbox`; live Pix 11/11 usou collector prod |

---

## CP-PAY-021 (atualização)

| Camada | Status |
|--------|--------|
| URL webhook → Edge (app sandbox MCP) | **Configurado** nesta MARCHA |
| Secret alinhado Edge ↔ MP | **PENDENTE eFe** (painel MP → `supabase secrets set MP_WEBHOOK_SECRET`) |
| Webhook app **credenciais live** | **ABERTO** (app não listado no MCP OAuth atual) |
| Mitigação cliente | `sync-mp-payment` ACTIVE (sem mudança) |

---

## Ação humana imediata (1 passo)

1. Abrir [webhooks do app 8320396999442614](https://www.mercadopago.com.br/developers/panel/app/8320396999442614/webhooks)  
2. Copiar **secret key** completa  
3. `npx supabase secrets set MP_WEBHOOK_SECRET="<secret>" --project-ref wtbpwuiayednvlhvuhbh`  
4. (Opcional) repetir URL no app **produção live** se for distinto do sandbox

---

## Veredicto

| Critério AJUSTE-035 | Status |
|---------------------|--------|
| Prova operacional Central | **PASS** |
| Prova financeira nova (Pix R$1) | não nesta marcha (já 11/11) |
| Prova recuperação FE | coberta código + sessão (marchas anteriores) |
| CP-PAY-021 completo live | **PARCIAL** — URL sandbox OK; secret + app live = D |

**Assinatura agente:** MARCHA AJUSTE-035 pay/ops + webhook sandbox · 2026-11-12.
