# Auditoria cruzada — AJUSTE-035 Checkout × Plano × Evidências

**Data:** 2026-11-12 · **Auth:** eFe  
**Plano:** [FAL_PLANO_AJUSTE_035_CHECKOUT.md](./FAL_PLANO_AJUSTE_035_CHECKOUT.md)  
**VALs:** [01 remoto](./FAL_MARCHA_AJUSTE_035_CHECKOUT_01_REMOTE_VAL_2026-11-12.md) · [smoke/deploy](./FAL_MARCHA_AJUSTE_035_CHECKOUT_SMOKE_DEPLOY_VAL_2026-11-12.md) · [ops/webhook](./FAL_MARCHA_AJUSTE_035_CHECKOUT_PAY_OPS_VAL_2026-11-12.md)  
**Homolog:** [CHECKOUT-05 matriz](./FAL_MARCHA_AJUSTE_035_CHECKOUT_HOMOLOG_2026-11-12.md)  
**Runtime:** `wtbpwuiayednvlhvuhbh` · Netlify `fal-pecas-automotivas-efe` · deploy `6af5e33675093db91a132ce5`  
**VAL residual:** [recovery + UI](./FAL_MARCHA_AJUSTE_035_CHECKOUT_RECOVERY_UI_VAL_2026-11-12.md) · [mid-pay + webhook](./FAL_MARCHA_AJUSTE_035_CHECKOUT_MIDPAY_WEBHOOK_VAL_2026-11-12.md)

---

## 0. Veredito executivo

| Dimensão | Situação |
|----------|----------|
| Escopo vs plano | **Alinhado** — 034 intocado; operador A; sem 2º motor |
| Código CHECKOUT-01…05 | **Entregue** |
| Banco remoto `place_order` | **PASS** — `payment_status` + `clear_cart` |
| Front produção | **PASS** — Netlify `6af5e336…` ready (`dist`) |
| Critérios C1–C5 | **C1–C5 código PASS** · C4 E2E multi-aba **não smokeado** |
| Aceite 3 provas | Operacional **PASS** · Financeira **herdada 11/11** · Recuperação **PASS** (approved + mid-pay pending/expired) |
| Bloqueio residual | nenhum bloqueio agent · delivery ledger = smoke Pix opcional |

**Classificação matriz:** manter **I/P** (produto útil; residual ops webhook).

---

## 1. Cruzamento pacotes × plano

| Pacote | Pedido no plano | Evidência | Status |
|--------|-----------------|-----------|--------|
| **CHECKOUT-01** | Idempotente + sessão + servidor prevalece | Migration aplicada via `db query`; `resumeCheckoutFromServer`; C1 tests 5/5 | **PASS** |
| **CHECKOUT-03** | Pix/cartão estados; retry; concorrência; sync | Retry Pix UI; CardBrick timeout; Edges ACTIVE; sync-mp ACTIVE | **PASS código** · webhook live **parcial** |
| **CHECKOUT-02** | buy_now isolado + frete handoff | Smoke: carrinho 0 + item no resumo; `clear_cart=false`; handoff session | **PASS** (frete ainda em step 3, pré-seleção via handoff) |
| **CHECKOUT-04** | 2 momentos efetivos | Pills `MOMENT_LABELS` (2) + steps internos 0–4 | **PASS** UI · wizard interno preservado |
| **CHECKOUT-05** | Homologação + 3 provas | Matriz + VALs; testes **16/16**; recovery E2E approved | **PASS** com residual CP-PAY-021 + mid-Pix live opcional |

---

## 2. Critérios C1–C5

| ID | Regra | Código | Homologado |
|----|-------|--------|------------|
| **C1** | `!paymentId` ≠ aprovação | `resolveCheckoutPaymentOutcome` + CheckoutPage | Unit **PASS** |
| **C2** | session = contexto; servidor manda | `checkoutSession` + `resumeCheckoutFromServer` no mount | Unit **PASS** · E2E approved **PASS** · mid-pay pending/expired **PASS** |
| **C3** | Retry mesmo pedido | `allowRetry` / `retryPixCharge` + Edge expire | Código **PASS** |
| **C4** | Concorrência | `submitLockRef` + `idempotency_key` RPC + reuso MP | FE+RPC **PASS**; 2 abas / fora-de-ordem **não smokeados** |
| **C5** | buy_now isolado | `buyNowSession`; não lê CartContext; `clear_cart=false` | Smoke browser **PASS** |

---

## 3. Aceite adicional (plano §4)

| Prova | Critério | Status | Evidência |
|-------|----------|--------|-----------|
| Financeira | valor/status/id = MP | **PASS herdado** | VAL CP-PAY Pix R$1 11/11 · pedido `66dd89ff` aprovado |
| Operacional | Central sem intervenção | **PASS** | VAL ops 12/11 · pendente `949fce4f` + aprovado `66dd89ff` |
| Recuperação | refresh / rede / retorno tardio | **PASS** | `66dd89ff` approved→confirmação · `949fce4f` card pending→UI cartão · `2d664b26` Pix expirado→UI Pix · VAL mid-pay |

---

## 4. Fora de escopo (confirmado respeitado)

| Item | Status |
|------|--------|
| Trocar MP | Não feito |
| Novo motor pedidos/frete | Não feito |
| Guest checkout | Não feito |
| Boleto | Adapter rejeita; UI sem boleto |
| Cartão salvo | Documentado não suportado |
| UX admin nova | Não feita (contrato A) |
| AJUSTE-034 | Intocado |

---

## 5. Divergências / dívidas honestas

1. **Webhook CP-PAY-021:** URL Edge no app sandbox MCP **OK**; **secret** precisa espelho no Supabase; app **live** fora do OAuth MCP.  
2. **Histórico migrations CLI:** `place_order` aplicado por `db query`, não via `db push` (drift histórico). Função remota OK; repair history = ops opcional.  
3. **payment_events** last `2026-11-09` — ledger webhook não avançou até secret/live; **sync** mitiga.  
4. **Secret webhook** desalinhado até eFe colar secret do painel MP (OTP bloqueou automação).

---

## 6. Arquivos-chave (estado)

| Área | Path |
|------|------|
| Plano | `docs/planejamento/FAL_PLANO_AJUSTE_035_CHECKOUT.md` |
| RPC | `fal-pecas/supabase/migrations/20261112190000_place_order_idempotent_payment_id.sql` (remoto aplicado) |
| Checkout | `fal-pecas/src/pages/Checkout/CheckoutPage.tsx` |
| C1/C2/C5 | `fal-pecas/src/services/checkout/*` |
| Edges | `create-mp-payment` · `sync-mp-payment` · `mercado-pago-webhook` ACTIVE |

---

## 7. Próximos passos recomendados (ordem)

1. **Opcional:** smoke Pix → novo `payment_events` + log Edge ([probe](./FAL_MARCHA_AJUSTE_035_CHECKOUT_WEBHOOK_EDGE_PROBE_VAL_2026-11-12.md) já OK).  
2. **Opcional:** `migration repair` para alinhar histórico CLI.

---

## 8. Assinatura

Cruzamento plano × código × VALs × remoto × Netlify · **2026-11-12** (atualizado residual).  
AJUSTE-035: **entrega útil em produção** · residual ops **CP-PAY-021**.
