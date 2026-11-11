# VAL — CP-PAY Pix prod smoke + sync pós-webhook

**Data:** 2026-11-11  
**Auth:** eFe — `MARCHA` (pagamento agente / QR / confirmação)  
**Runtime:** `wtbpwuiayednvlhvuhbh` · local `localhost:5173` → Edge prod  
**Pedido:** `66dd89ff-c048-4eb0-b3eb-e580273b3bc0`  
**Cliente:** Fernando Felicio · **Retirada na loja** R$ 0 · item TDI0303 **R$ 1,00**

---

## Escopo

Smoke real Pix produção (live_mode) + correções de UI/create/sync que impediam pagar e atualizar a tela.

---

## Evidências (FATO)

| # | Check | Resultado | Evidência |
|---|-------|-----------|-----------|
| 1 | Create Pix (Edge) | **PASS** | `create-mp-payment` 201 · MP `189071738498` |
| 2 | QR + copia-cola UI | **PASS** | Resume painel após fix `needsNewPix` |
| 3 | TTL Pix | **PASS** | 5 → **30 min** (FE + Edge `_shared`) |
| 4 | Pagar no banco (humano) | **PASS** | MP `approved` / `accredited` · `live_mode=true` · R$ 1 |
| 5 | Webhook → FAL automático | **FAIL / gap** | MCP sandbox `notifications_history` vazio; `payment_events` sem evento deste charge; webhook salvo só no app **FALPecasSandbox**, cobrança em **prod** (collector `3667581511`) |
| 6 | Confirmação pedido | **PASS (sync manual)** | `payments.approved` · order `em_analise` |
| 7 | Create terminal síncrono (cartão) | **PASS (teste)** | `createMpPaymentFlow` G/G2/G3 |
| 8 | Edge `sync-mp-payment` | **DEPLOY** | Fallback poll FE → GET MP → RPC `confirm_mercadopago_payment` |
| 9 | pickActivePayment | **PASS (teste)** | pending novo > expired antigo |

---

## Bugs corrigidos nesta MARCHA

| Bug | Causa | Fix |
|-----|-------|-----|
| Cartão/QR “não processa” approved/rejected | Create gravava só `provider_status`; UI polava `status` pending até webhook | Terminal síncrono no create + Brick usa resposta |
| “Gerar novo Pix” 201 sem mostrar QR | `needsNewPix` ficava true pelo expired do payment antigo do pedido | Sessão nova prevalece em `ResumeOrderPaymentPanel` |
| Reload mostrava Pix expirado | `payments[0]` sem ordem | `pickActivePayment` |
| Banco rejeita Pix | QR TTL 5 min já `expired` no MP | TTL 30 min + gerar novo |
| Paguei e tela não atualizou | Webhook prod não entrega na Edge | Sync manual + Edge `sync-mp-payment` + poll Pix/Brick |

---

## Deploys / Edges

| Edge | Ação |
|------|------|
| `create-mp-payment` | Redeploy (terminal sync + TTL 30) |
| `mercado-pago-webhook` | Redeploy |
| `sync-mp-payment` | **Nova** · `verify_jwt=true` |

---

## Critérios matriz

| ID | Antes | Depois |
|----|-------|--------|
| CP-PAY-020 | Não homologado | **Smoke create PASS** (prod Pix R$1) |
| CP-PAY-021 | Não homologado | **PARCIAL** — approve humano PASS; webhook prod **ainda gap**; mitigação `sync-mp-payment` |

---

## Aberto (humano / ops)

1. Painel MP **produção** (não sandbox): webhook  
   `https://wtbpwuiayednvlhvuhbh.supabase.co/functions/v1/mercado-pago-webhook`  
   + secret = `MP_WEBHOOK_SECRET` Supabase.  
2. Deploy front Netlify (Brick/Pix sync poll + Resume fix) quando eFe autorizar.  
3. Cartão live smoke (opcional) com sync path.

---

## Veredicto

| Critério | Status |
|----------|--------|
| Create Pix prod + QR | **PASS** |
| Pagar Pix live R$1 retirada | **PASS** |
| Pedido → em_analise | **PASS** (via sync) |
| Webhook prod automático | **ABERTO** |
| Mitigação sync Edge | **DEPLOY** |

**Assinatura agente:** VAL CP-PAY Pix prod smoke + sync · 2026-11-11.
