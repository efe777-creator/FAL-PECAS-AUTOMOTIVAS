# Especificação Fase 9 — Pagamentos Mercado Pago

**Data:** 2026-10-06  
**Status:** F9-A + **F9-B DONE** (`main` `06be4e4`). **STOP antes F9-C** (Pix UI + webhook).  
**Baseline:** F8.5 FECHADO · F9.0 DONE · migration `20261006200000` aplicada/registrada  
**Refs:** [AUDITORIA_F9…](./AUDITORIA_F9_ARQUITETURA_CHECKOUT_PAGAMENTO_2026-10-06.md) · [CHECKLIST…](./CHECKLIST_FASE9_PAGAMENTOS.md) · [PLANO_MESTRE adendo](./PLANO_MESTRE_F8_PROXIMAS_FASES_2026-10-06.md)

---

## 1. Objetivo

Pagamentos online reais (sandbox → produção) via **Mercado Pago**:

- Pix;
- cartão de crédito;
- cartão de débito quando disponível na conta/configuração.

Princípios: pedido FAL continua fonte de verdade; sem dados sensíveis de cartão na FAL; webhook + idempotência; Access Token só no backend.

Fontes oficiais MP: [Developers](https://www.mercadopago.com.br/developers/pt/docs) · [Checkout Bricks](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks) · [Webhooks](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/additional-content/your-integrations/notifications/webhooks) · [Credenciais](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/resources/credentials).

---

## 2. O que NÃO alterar (sem necessidade comprovada)

- `place_order` (essência: snapshot, totais, reserva);
- `transition_order_status`, `ship_order`, `deliver_order`;
- engine inventário F7/F8 / `inventory_mode`;
- snapshot do pedido;
- catálogo / imports F8.1 / listas de preço F8.5.

Se alteração for necessária: parar e documentar por quê / objeto / impacto / alternativa.

---

## 3. Nomenclatura vs F9.0

| Label | Significado |
|-------|-------------|
| **F9.0** | Já em `main`: Correios/Frenet sandbox + gateway sandbox sobre `confirm_simulated_payment` |
| **F9-A…I** | Gates Mercado Pago (esta spec) |
| **F10** | Frete/logística HTTP reais |

---

## 4. Arquitetura alvo

```text
Cliente → Checkout FAL → place_order → Order + Payment(pending)
                ↓
         Edge create-mp-payment (amount do DB, X-Idempotency-Key)
                ↓
         Mercado Pago (Pix / Brick)
                ↓
         Webhook → Edge mercado-pago-webhook
                ↓
         payment_events + payments → transição F7 se approved
```

Frontend **nunca** é fonte de verdade de `status=approved`.

---

## 5. Modelo de dados (proposta — aplicar só na F9-A impl)

### Estender `public.payments`

Campos atuais: `id`, `order_id`, `provider`, `status`, `amount`, `external_ref`, `metadata`, `created_at`.

Adicionar (conceitual):

- `provider_payment_id`, `provider_order_id` (nullable);
- `method` (`pix` | `credit_card` | `debit_card` | …);
- `currency` default `BRL`;
- `installments`;
- `pix_qr_code`, `pix_qr_code_base64`, `payment_url`;
- `expires_at`, `paid_at`, `cancelled_at`, `refunded_at`;
- `updated_at`;
- status interno alinhado: `created` | `pending` | `approved` | `rejected` | `cancelled` | `expired` | `refunded`  
  (mapear `failed` legado simulated → `rejected` ou manter ambos com CHECK documentado);
- `provider_status` / raw em `metadata` para auditoria.

Compat: linhas `provider='simulated'` permanecem válidas.

### Nova `public.payment_events`

- `id`, `payment_id`, `provider`, `provider_event_id`, `event_type`, `action`, `payload` (jsonb sanitizado), `processed`, `processed_at`, `error`, `created_at`
- Unique parcial em `(provider, provider_event_id)` para idempotência de webhook

### RLS

- Select: staff ou dono do pedido (como hoje).
- Write crítico: **não** abrir UPDATE de status ao `authenticated` customer.
- Edge/service role processa webhook.

### Refund

Colunas/eventos preparados; **implementação de refund = F9 posterior** (fora F9-A…H inicial).

---

## 6. Máquina de estados (pagamento)

| Interno | Origem típica MP | Efeito no pedido |
|---------|------------------|------------------|
| `created` / `pending` | payment created / pending | permanece `aguardando_pagamento` |
| `approved` | approved | espelhar ciclo `confirm_simulated_payment` approve |
| `rejected` | rejected | política: cancelar + release **ou** permitir nova tentativa (documentar na F9-C) |
| `expired` | Pix expirado | nova tentativa = novo payment; histórico preservado |
| `cancelled` / `refunded` | cancel/refund | conforme regra futura |

Mapear estados MP → internos de forma **explícita** (tabela na implementação). Sem conversão ambígua.

---

## 7. Backend / Edge

| Função | Responsabilidade |
|--------|------------------|
| `create-mp-payment` | Auth user; carrega order; valida ownership; amount server-side; cria payment MP; persiste; idempotency key |
| `mercado-pago-webhook` | Valida `x-signature`; grava event; consulta MP; atualiza payment; transiciona order se approved |

Secrets: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` (test vs prod separados).  
FE: apenas `VITE_MP_PUBLIC_KEY`.

---

## 8. Frontend

- SDK: `@mercadopago/sdk-react` + Checkout Bricks (Payment / Card Payment Brick) conforme docs vigentes.
- Pix: valor, QR, copia-e-cola, validade, status “aguardando confirmação”.
- Cartão: Brick oficial (sem formulário FAL com PAN/CVV).
- Feature flag: `VITE_PAYMENT_PROVIDER=mercadopago` + `payments_enabled`.
- Identidade visual FAL; mobile-first; loading/erro/sucesso/pendente.

Simulado permanece disponível para regressão F6/F7 até flag MP ligada.

---

## 9. Idempotência e concorrência

- Header `X-Idempotency-Key` em creates MP.
- Webhook duplicado: `payment_events.provider_event_id` único → no-op se já `processed`.
- Duplo clique / refresh / duas abas: reutilizar payment pending do order quando regra permitir; nunca segundo cobrado sem intenção.
- FE faz poll/consulta; backend manda.

---

## 10. Admin

Em detalhe do pedido: método, provedor, status, IDs externos, datas, lista de `payment_events`.  
Filtros avançados (pago/pendente/método) = preparação; não obrigatórios na primeira entrega.

---

## 11. Gates de implementação

| Gate | Conteúdo | Auth |
|------|----------|------|
| F9-A docs | Esta spec + auditoria + checklist | **DONE** |
| **F9-A impl** | Migrations + RLS + secrets layout | **DONE** (`c03afd4` / PR #5) |
| F9-B | Cliente MP sandbox + create payment + idempotência | **DONE** (`06be4e4` / PR #6) |
| F9-C | Pix + QR + webhook mínimo | pendente |
| F9-D | Card Payment Brick | pendente |
| F9-E | HMAC completo + concurrency + reconciliação | pendente |
| F9-F | Checkout FAL integrado | pendente |
| F9-G | Admin pagamento/eventos | pendente |
| F9-H | Testes + homologação | pendente |
| F9-I | Produção | Auth humana explícita |

---

## 12. Testes (aceite)

Unit/integração: create Pix/cartão; reject/approve/pending/expire; idempotência create+webhook; assinatura inválida; order inexistente; amount divergente; approve atualiza pedido; reject não marca pago; regressão F7/F8.

Homologação: ver [CHECKLIST_FASE9_PAGAMENTOS.md](./CHECKLIST_FASE9_PAGAMENTOS.md).

---

## 13. Rollout

```text
LOCAL/DEV → MP TEST → STAGING → MP TEST → (auth) PRODUCTION → MP PROD
```

Nunca misturar tokens test/prod.

---

## 14. Riscos

| Risco | Mitigação |
|-------|-----------|
| Sem Edge hoje | Criar na F9-B/E antes do checkout real |
| Alterar `place_order` demais | Preferir extensão payments + path paralelo |
| Drift migrations remoto | Sem repair em massa; migrations novas versionadas |
| Marcar pago no FE | Proibido; só webhook/backend |
| F8.6–8.8 | Paralelo; não bloqueiam |

---

## 15. STOP atual

F9-B **fechada**. **Não** iniciar F9-C (Pix UI / webhook) até `MARCHA F9-C`.
