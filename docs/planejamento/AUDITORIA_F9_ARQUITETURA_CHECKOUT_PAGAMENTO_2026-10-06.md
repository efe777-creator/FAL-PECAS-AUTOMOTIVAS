# Auditoria F9 — arquitetura checkout / pedido / pagamento

**Data:** 2026-10-06  
**Branch docs:** `plan`  
**Baseline código:** `origin/main` @ `1abea37`  
**Escopo:** diagnóstico §50 do prompt Mercado Pago — **sem** migrations, SDK, Edge Functions ou `db push`.  
**Refs:** [GATE_F8_5…](./GATE_F8_5_STATUS_2026-10-06.md) · [ESPECIFICACAO_FASE9_PAGAMENTOS…](./ESPECIFICACAO_FASE9_PAGAMENTOS_MERCADO_PAGO.md) · [PLANO_MESTRE…](./PLANO_MESTRE_F8_PROXIMAS_FASES_2026-10-06.md) (adendo)

---

## 1. Estrutura atual

| Camada | Onde |
|--------|------|
| App | React 19 + Vite 8 + TS — `fal-pecas/src` |
| Rotas | `fal-pecas/src/app/router.tsx` |
| Backend dados | Supabase (Postgres + RLS + RPCs) |
| Migrations | `fal-pecas/supabase/migrations/*.sql` |
| Edge Functions | **Nenhuma** em `fal-pecas/supabase/functions` |
| Pagamento FE | `src/services/payments/*` |
| Frete FE | `src/services/shipping/*` (F9.0 sandbox Correios/Frenet em `main`) |
| Pedidos | `src/services/orders/placeOrderService.ts`, `orderDetailService.ts` |
| Checkout UI | `src/pages/Checkout/CheckoutPage.tsx` |
| Admin pedidos | `src/pages/admin/...` + `adminOrderService.ts` |

Dependências relevantes: `@supabase/supabase-js`. **Sem** `@mercadopago/sdk-react` no `package.json`.

---

## 2. Fluxo atual do pedido

```text
Carrinho (cliente autenticado)
  → CheckoutPage (endereço → frete → pagamento simulado → resumo)
  → placeOrder() → RPC place_order
       cria orders (aguardando_pagamento)
       cria order_items (unit_price via resolve_product_price)
       reserva estoque se inventory_mode = com_estoque
       cria payments (provider='simulated', status='pending', amount=total)
  → confirmSimulatedPayment(paymentId, approve|fail)
       → RPC confirm_simulated_payment
            approve: payments.approved + orders pagamento_aprovado→recebido→em_analise
            fail: payments.failed + release_order_reservations + orders.cancelado
```

**ID definitivo do pedido:** `orders.id` (uuid).  
**Pedido sem pagamento “aprovado”:** sim — nasce em `aguardando_pagamento` com payment `pending`.

---

## 3. Onde o pagamento MP deve entrar

Ponto de substituição no checkout:

1. Manter `place_order` (criação do pedido + snapshot + reserva).
2. **Remover** como fonte de verdade o clique `approve`/`fail` do simulado para produção.
3. Após `place_order`, chamar backend seguro (Edge Function) para criar cobrança MP com `amount` lido do pedido no servidor.
4. UI: Pix QR / Card Brick com **Public Key** apenas.
5. Confirmação financeira: **somente** webhook/backend → atualiza `payments` → dispara transição equivalente ao ciclo F7 (mesmos status/eventos que `confirm_simulated_payment` em approve).

Não criar segundo motor de pedidos.

---

## 4. Tabelas relacionadas a pedido / pagamento

| Tabela | Papel |
|--------|-------|
| `orders` | Fonte de verdade do pedido; `status`, totais, `address_snapshot` |
| `order_items` | Snapshot `sku`, `name_snapshot`, `unit_price`, `quantity` |
| `order_status_history` | Histórico de status |
| `order_events` | Eventos (incl. `payment_approved`, `payment_failed`) |
| `payments` | `id`, `order_id`, `provider`, `status`, `amount`, `external_ref`, `metadata`, `created_at` |
| `shipments` | Frete do pedido |
| `inventory` / movimentos | Reserva em `place_order` (modo `com_estoque`) |

**Não existe** `payment_events` hoje.

Schema `payments` (F2): colunas mínimas — MP exigirá **extensão** (não tabela paralela de “outro pedido”).

---

## 5. RPCs existentes (relevantes)

| RPC | Uso |
|-----|-----|
| `place_order(jsonb)` | Cria pedido + payment simulated + reserva |
| `confirm_simulated_payment(uuid, text)` | Approve/fail **somente** `provider='simulated'` → ciclo F7 |
| `release_order_reservations` | Liberação no fail |
| `transition_order_status` / ship / deliver | Operação F7 — **não alterar** sem necessidade |
| `resolve_product_price(s)` | Preço no `place_order` |

Para MP: nova RPC ou Edge Function `confirm_provider_payment` / webhook handler — **não** reutilizar `confirm_simulated_payment` para provider `mercadopago` (guard explícito `provider <> 'simulated'`).

---

## 6. Edge Functions

**Nenhuma** versionada no repositório. Webhook MP (`/functions/v1/mercado-pago-webhook`) e create-payment precisam ser **criados** na F9-B/C/E.

Secrets: Supabase secrets (Access Token, webhook secret) — nunca `VITE_*` privado.

---

## 7. Autenticação

- Supabase Auth; `place_order` / `confirm_simulated_payment` exigem `auth.uid()` + customer.
- Checkout atual: cliente autenticado (sem guest checkout no escopo).
- Webhook MP: autenticação por assinatura HMAC (`x-signature`), não pelo JWT do cliente.

---

## 8. RLS (`payments`)

- `payments_select_own`: staff **ou** dono do pedido (`orders.customer_id`).
- `payments_staff_write`: staff write.
- Cliente **não** deve poder `UPDATE payments SET status='approved'`.
- Atualizações críticas MP: service role / Edge Function (`security definer` controlado), não policy de customer write.

---

## 9. Variáveis de ambiente

Hoje (exemplo): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; em `main` também `VITE_SHIPPING_PROVIDER`, `VITE_PAYMENT_PROVIDER` (sandbox).

Propostos MP (nomes finais na spec):

| Lado | Variável | Conteúdo |
|------|----------|----------|
| FE | `VITE_MP_PUBLIC_KEY` | Public Key teste/prod |
| FE | `VITE_PAYMENT_PROVIDER=mercadopago` | Feature seleção |
| BE | `MP_ACCESS_TOKEN` | Access Token (secret) |
| BE | `MP_WEBHOOK_SECRET` | Secret HMAC |
| Flag | `payments_enabled` / equivalente | Gate de exposição |

**Proibido:** `VITE_MP_ACCESS_TOKEN`.

---

## 10. Checkout atual

Arquivo: `CheckoutPage.tsx`.

- Steps: identificação/documento → endereço → frete → pagamento (`pix_simulated` / `card_simulated`) → finalizar.
- Finalizar chama `placeOrder` depois `confirmSimulatedPayment(outcome)` com botões approve/fail de **dev/simulado**.
- Encaixe MP: manter steps; trocar painel de pagamento por Pix/Brick; polling/consulta de status pós-webhook; **nunca** marcar pago só no FE.

---

## 11. Dependências atuais

- React Router, Tailwind, Vitest, Supabase JS, xlsx.
- Frete F9.0: providers sandbox determinísticos (sem HTTP).
- Pagamento F9.0: `gatewaySandboxPaymentProvider` ainda delega a `confirm_simulated_payment`.

---

## 12. Conflitos / riscos

| Conflito | Impacto | Mitigação |
|----------|---------|-----------|
| `confirm_simulated_payment` só aceita `simulated` | MP não passa por essa RPC | Novo caminho backend + transição F7 espelhada |
| Colunas `payments` insuficientes | Falta Pix QR, method, provider ids | Migration F9-A estendendo tabela |
| Sem Edge Functions | Sem lugar seguro para Access Token / webhook | Criar functions na F9-B/E |
| Nomenclatura F9-A frete vs F9-A MP | Confusão documental | F9.0 = sandboxes; F9-A…I = MP |
| F8.5 “aberto” em docs antigos | Reexecução indevida | Adendo Plano Mestre: F8.5 **FECHADO** |
| Reserva estoque no `place_order` | Pedido pending segura estoque | Manter; fail/expiração liberam; não mudar modo inventário sem evidência |
| Amount do FE | Fraude | Backend lê `orders.total` / payment.amount server-side |

---

## 13. Arquitetura recomendada F9 (Mercado Pago)

```text
Checkout FAL
  → place_order (inalterado na essência)
  → Edge: create-mp-payment(order_id)  [idempotency key]
       amount = pedido no DB
       provider = mercadopago
  → FE: Brick / Pix UI (Public Key)
  → Cliente paga
  → Webhook MP → Edge: mercado-pago-webhook
       valida x-signature
       grava payment_events (idempotente)
       consulta MP
       valida amount + order
       atualiza payments
       se approved → transição F7 (pagamento_aprovado→…→em_analise)
       se rejected/expired → política documentada (release se aplicável)
  → FE consulta status do payment/order
```

### Preço no pedido

Verdade = `place_order` via `resolve_product_price` → `order_items.unit_price` + totais. Carrinho é UX. F8.5 `%` já no motor de custo de lista (formação); não bloqueia MP.

### Estoque

Reserva no `place_order` (modo `com_estoque`). Pagamento aprovado **não** re-reserva. Fail libera. Pix expirado: definir na spec (nova tentativa = novo payment attempt, mesmo order).

---

## STOP

Esta auditoria **não** autoriza migration, SDK, Edge Function, `db push` ou alteração de `place_order` / inventário.

Próximo passo após revisão humana: MARCHA → implementação F9-A (modelagem + migrations + RLS) conforme [ESPECIFICACAO_FASE9_PAGAMENTOS…](./ESPECIFICACAO_FASE9_PAGAMENTOS_MERCADO_PAGO.md) e [CHECKLIST…](./CHECKLIST_FASE9_PAGAMENTOS.md).
