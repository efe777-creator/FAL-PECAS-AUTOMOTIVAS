# Auditoria F9-B pré-impl — 2026-10-06

**Tipo:** leitura + docs oficiais MP — **antes** de código F9-B  
**Baseline código (pré-impl original):** `c03afd4` · **pós F9-B core:** `06be4e4` · **gap-close:** branch `feat/f9-b-mp-create-payment-conform`  
**Refs:** [ESPECIFICACAO_FASE9_PAGAMENTOS…](./ESPECIFICACAO_FASE9_PAGAMENTOS_MERCADO_PAGO.md) · [CHECKLIST_F9B…](./CHECKLIST_F9B_MP_CREATE_PAYMENT.md) · [RELATORIO_FINAL…](./RELATORIO_FINAL_F9B_MP_CREATE_PAYMENT_2026-10-06.md) · [STOP…](./STOP_F9_MP_POS_AUDITORIA_2026-10-06.md)

---

## 1. Tips Git

| Branch | Tip |
|--------|-----|
| `main` | `d851617` (PR #7) |
| `dev` | `3eaf0ef` |
| `plan` | docs STOP + checklist + relatório |

## 2. Estado real F9-A (linked)

| Check | Resultado |
|-------|-----------|
| `schema_migrations` `20261006200000` | **presente** |
| `schema_migrations` `20261006160000` (F8.5) | **presente** |
| `public.payment_events` | **existe** |
| Colunas MP em `payments` | aplicadas na F9-A (provider_payment_id, method, pix_*, currency, updated_at, …) |
| Edge Functions no repo | **zero** (`supabase/functions` ausente) |
| Customer UPDATE `payments` | **revogado** na migration F9-A |
| `place_order` / F7 | **intactos** na F9-A |

## 3. Gaps para F9-B

- Sem Edge `create-mp-payment`
- Sem `MP_ACCESS_TOKEN` no projeto (secret — configurar no Supabase; não versionar)
- Checkout ainda usa `confirmSimulatedPayment` (F9-F)
- Sem webhook (F9-C/E)

## 4. Documentação oficial Mercado Pago (vigente)

### Create payment

- **Endpoint:** `POST https://api.mercadopago.com/v1/payments`
- **Auth:** `Authorization: Bearer <ACCESS_TOKEN>` (Access Token **só backend**)
- **Idempotência:** header **`X-Idempotency-Key`** obrigatório em novas integrações (UUID/string única por tentativa)
- **Referência:** [Create payment](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api-payments/create-payment/post)

### Pix (consumo na F9-C; F9-B prepara create)

- `payment_method_id: "pix"`
- Resposta típica `pending` com `point_of_interaction.transaction_data.qr_code` / `qr_code_base64`
- **Referência:** [Integrar Pix](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/integrate-pix)

### Credenciais

- Test vs produção separados
- Public Key = FE; Access Token = BE
- **Referência:** [Credenciais](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/resources/credentials)

### Decisões F9-B

| Tema | Decisão |
|------|---------|
| Amount | Sempre `orders.total` no servidor; FE envia só `orderId` |
| Idempotency key | `fal-pay-{payment.id}` (reuso do payment pending) |
| Provider | `mercadopago` |
| Aprovar pedido | **não** nesta fatia |
| Sem token | Edge responde erro `MP_ACCESS_TOKEN missing` |

## 5. STOP pós-F9-B

Webhook · SDK React · Pix UI · checkout · F7 — **fora** até MARCHA F9-C+.
