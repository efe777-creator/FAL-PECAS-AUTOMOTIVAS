# AJUSTE-035 | Checkout FAL — Plano mestre consolidado (v2)

**Status planejamento:** aprovado (eFe)  
**Status execução:** **em produção parcial** — código + Netlify + RPC · residual CP-PAY-021  
**Cruzamento:** [FAL_AUDITORIA_AJUSTE_035_CHECKOUT_CRUZAMENTO_2026-11-12.md](./FAL_AUDITORIA_AJUSTE_035_CHECKOUT_CRUZAMENTO_2026-11-12.md)  
**ID:** AJUSTE-035 exclusivo checkout. **AJUSTE-034** permanece Indicadores de operação (intocado).  
**Programa:** `CHECKOUT-01` … `CHECKOUT-05`  
**Operador:** contrato **A** — checkout alimenta a Central por estados; sem telas admin novas.  
**Data:** 2026-11-12 · **atualizado:** 2026-11-13 (coordenação PAY consolidação)  
**Coordenação comercial:** [FAL_AUDITORIA_PAY_CONSOLIDACAO_2026-11-13.md](./FAL_AUDITORIA_PAY_CONSOLIDACAO_2026-11-13.md) — 035 **consome** `store_payment_display` / availability; **não** redefine tetos comerciais (dono = HOME-06b / Home da Loja).

**Goal:** Cliente decide produto e entrega primeiro; checkout confirma e conclui pagamento com resultado real, recuperação após refresh e sem pedidos/cobranças duplicados.

**Architecture:** Evoluir o funil existente (PDP/carrinho → handoff frete → `place_order` → Edges MP → Central via estados). Servidor = fonte de verdade; sessionStorage = contexto de recuperação. Sem segundo motor de checkout/frete/pedidos.

---

## Status por pacote (atualizado)

| Ordem | Pacote | Status | Evidência |
|-------|--------|--------|-----------|
| 1 | CHECKOUT-01 | **PASS** | RPC remoto + resume + C1 tests · [VAL 01](./FAL_MARCHA_AJUSTE_035_CHECKOUT_01_REMOTE_VAL_2026-11-12.md) |
| 2 | CHECKOUT-03 | **PASS código / parcial ops** | Retry/timeout/sync · webhook URL sandbox OK · secret+live = D · [VAL ops](./FAL_MARCHA_AJUSTE_035_CHECKOUT_PAY_OPS_VAL_2026-11-12.md) |
| 3 | CHECKOUT-02 | **PASS** | buy_now isolado smoke · [VAL deploy](./FAL_MARCHA_AJUSTE_035_CHECKOUT_SMOKE_DEPLOY_VAL_2026-11-12.md) |
| 4 | CHECKOUT-04 | **PASS** | 2 momentos + `checkoutMoments` testável · pills sem clique morto em awaiting |
| 5 | CHECKOUT-05 | **PARCIAL** | unit + VALs · refresh mid-pay E2E / webhook live residual |

**Netlify:** `https://fal-pecas-automotivas-efe.netlify.app/` · deploy `6af5e0b70e69d1771c5b2c78` ready.

---

## 1. Decisões fechadas

- Contrato operador A; sem UX admin nesta onda.
- Primeiro recuperação e integridade do pagamento (CHECKOUT-01 → 03).
- Comprar agora isolado do carrinho.
- Frete preservado da PDP ao checkout.
- Pix e cartão com estados reais.
- Checkout simplificado em dois momentos efetivos (CHECKOUT-04).
- Sem boleto, guest checkout ou troca de provedor nesta onda.
- Cartão salvo só se tokenização real; nunca CVV/PAN no banco FAL.
- Publicação só após homologação com evidências.
- CP-PAY-021 (webhook prod) continua dependência operacional humana; poll/sync **não** a substitui.

---

## 2. Critérios complementares (P0)

### C1 — Nunca interpretar ausência de pagamento como aprovação — **PASS**

`!paymentId` não representa sucesso. Distinguir: pedido criado · cobrança criada · pendente · confirmado · recusado/expirado/erro.

### C2 — Recuperação sempre consultando o servidor — **PASS código**

sessionStorage = contexto. No mount/resume, consultar servidor; se divergir, prevalece o servidor.

### C3 — Expiração e novas tentativas — **PASS código**

Cobrança expirada/recusada: nova tentativa no mesmo pedido, sem duplicar itens nem cobranças ativas indevidas.

### C4 — Proteção contra concorrência — **PASS parcial**

`submitLockRef` + idempotency RPC. Smoke 2 abas / respostas fora de ordem ainda aberto.

### C5 — Compra direta com isolamento completo — **PASS**

`buy_now` não usa itens do CartContext no payload nem limpa o carrinho ao concluir.

---

## 3. Ordem de execução (histórica)

| Ordem | Pacote | Prioridade |
|-------|--------|------------|
| 1 | CHECKOUT-01 — Integridade e recuperação | P0 |
| 2 | CHECKOUT-03 — Pagamentos | P0 |
| 3 | CHECKOUT-02 — Compra direta e frete | P0 |
| 4 | CHECKOUT-04 — UX/UI | P1 |
| 5 | CHECKOUT-05 — Testes e homologação | P0 |

---

## 4. Aceite adicional

| Prova | Status |
|-------|--------|
| Financeira (MP real) | **PASS herdado** VAL Pix 11/11 + Central `66dd89ff` |
| Operacional (Central) | **PASS** VAL 12/11 |
| Recuperação (refresh/rede) | **PARCIAL** — código; E2E mid-pay aberto |

---

## 5. Fora de escopo

Trocar MP; novo sistema de pedidos/frete; dados sensíveis de cartão; guest checkout; wallets; boleto; UX nova de operador.

---

## 6. Residual / próximo

1. Espelhar `MP_WEBHOOK_SECRET` (painel MP → Supabase).  
2. Webhook no app live se distinto do sandbox.  
3. Smoke refresh mid-Pix no Netlify.  
4. ~~Colapsar UI 5 pills → 2 momentos~~ **FEITO** (CHECKOUT-04 + navegação com lock explícito).

---

## 7. Referências de código

- `fal-pecas/src/pages/Checkout/CheckoutPage.tsx`
- `fal-pecas/src/services/checkout/*`
- `fal-pecas/src/services/orders/placeOrderService.ts`
- `fal-pecas/supabase/functions/create-mp-payment`
- `fal-pecas/supabase/functions/sync-mp-payment`
- `fal-pecas/supabase/functions/mercado-pago-webhook`
- `fal-pecas/supabase/migrations/20261112190000_place_order_idempotent_payment_id.sql`

Primeiro fazer funcionar. Depois simplificar. Por fim publicar.  
**Estado atual:** funcionar + publicar front **feitos**; webhook live e E2E recuperação = residual.
