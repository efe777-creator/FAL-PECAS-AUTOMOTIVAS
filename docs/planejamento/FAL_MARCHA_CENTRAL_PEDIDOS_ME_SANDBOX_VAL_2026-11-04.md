# VAL — Central de Pedidos + Melhor Envio Sandbox

**Data:** 2026-11-04  
**Branch:** `feat/central-pedidos-me-sandbox-2026-11-04`  
**Premissa:** mock continua default no checkout (`VITE_SHIPPING_PROVIDER=mock`). Etiqueta ME só na Expedição. Sem deploy / sem `db push` nesta entrega.

---

## 1. Arquitetura corrigida

- Webhook Mercado Pago → só `confirm_mercadopago_payment` → `em_analise`. **Nunca** compra etiqueta.
- Fluxo: pagamento → análise → (decisão cliente se preciso) → separação → **Expedição (ME)** → `ship_order` (postagem física) → `deliver_order` (cliente).
- Status comercial do pedido ≠ `label_state` da etiqueta (`shipments.metadata.me`).

## 2. Momentos

| Momento | Ação | Pedido |
|---------|------|--------|
| Checkout | `quote-shipping` (mock default) | — |
| `place_order` | consome opção server-side; snapshot frete cobrado | cria pedido |
| Webhook MP | aprova pagamento | `em_analise` |
| Análise | finalize | `confirmado` / `aguardando_decisao` |
| Separação | complete_order_separation | `pronto_para_envio` |
| Expedição | conferir pacote → recotar se preciso → comprar/gerar/imprimir etiqueta ME | só metadata |
| Postagem | `ship_order` | `enviado` |
| Entrega | `deliver_order` | `entregue` |

## 3. Persistência (apresentada, não aplicada automaticamente)

Ver migration proposta:

- `fal-pecas/supabase/migrations/proposed/20261104190000_melhorenvio_label_metadata_shipping_quotes.sql`

Contrato `shipments.metadata.me`: `label_state`, `cart_item_id`, `protocol`, `tracking`, `label_url`, `service_id`, `label_amount`, `volumes`, `last_error`, `checkout_snapshot_ref`.

Tabela opcional `shipping_quotes` para path ME no checkout (não default).

**Aplicar só após OK explícito do eFe.**

## 4. Permissões Melhor Envio (Sandbox)

`shipping-calculate`, `cart-write`, `cart-read`, `shipping-checkout`, `shipping-generate`, `shipping-print`, `shipping-tracking`.

Secrets Edge: `MELHOR_ENVIO_TOKEN`, `MELHOR_ENVIO_USER_AGENT`, `MELHOR_ENVIO_WEBHOOK_SECRET`. Base: `https://sandbox.melhorenvio.com.br`. Nunca `VITE_*`.

## 5. Empacotamento

Produtos com `weight_kg`/`height_cm`/`width_cm`/`length_cm` → ME calcula volumes. Sem medidas → bloqueia. Divergência pacote/preço na Expedição → bloqueia compra; sem cobrança automática ao cliente.

## 6. Idempotência

Antes de cart/checkout/generate: ler `label_state` + IDs. Timeout pós-compra → consultar ME antes de retry. Falha ME: pedido permanece `pronto_para_envio`.

## 7. Webhook ME (stub)

Edge `melhorenvio-webhook`: valida HMAC `X-ME-Signature`, registra evento, **não** chama `ship_order`/`deliver_order` nesta marcha.

## 8. Central UI

4 áreas + atalhos (visões). Detalhe em 8 blocos. Expedição: etiqueta ME + romaneio interno + postagem/entrega separados.

## 9. Aceite / evidências

- [x] Hub 4 áreas + atalhos (`AdminOrdersHubPage` + rotas)
- [x] Pagamento sem etiqueta (webhook MP intacto; ME só em Expedição)
- [x] Etiqueta só em `pronto_para_envio` com `confirm:true` (`melhorenvio-label`)
- [x] `ship_order` ≠ gerar etiqueta (UI + Edge)
- [x] Mock default checkout (sem mudança `VITE_SHIPPING_PROVIDER`)
- [x] `tsc -b` PASS + vitest `melhorEnvioLabelState` / `adminOrderOps.areas` (9 tests)
- [x] Migration só em `migrations/proposed/` — sem apply
- [x] Sem deploy nesta marcha

### Arquivos-chave

- `fal-pecas/src/pages/admin/orders/AdminOrdersHubPage.tsx`
- `fal-pecas/src/lib/adminOrderOps.ts` (AREAS + VIEWS)
- `fal-pecas/src/lib/melhorEnvioLabelState.ts`
- `fal-pecas/src/components/admin/orders/MeExpeditionPanel.tsx`
- `fal-pecas/supabase/functions/melhorenvio-label/`
- `fal-pecas/supabase/functions/melhorenvio-webhook/`
- `fal-pecas/supabase/migrations/proposed/20261104190000_melhorenvio_label_metadata_shipping_quotes.sql`

## 10. Fora / follow-up

- Trocar default provider para ME / D-FRETE C
- Auto-transição pedido por webhook ME
- Onda 2 solicitações de cancelamento
