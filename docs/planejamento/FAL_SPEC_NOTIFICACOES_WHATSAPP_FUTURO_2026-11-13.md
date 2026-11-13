# Spec futura — CP-NOT N3 WhatsApp

**Versão:** V1 · **Data:** 2026-11-13  
**Auth:** eFe · **MARCHA FUTURO** (autorizado; **não** executar nesta sprint)  
**Plano:** [FAL_PLANO_CENTRAL_NOTIFICACOES_2026-11-13.md](./FAL_PLANO_CENTRAL_NOTIFICACOES_2026-11-13.md)  
**Spec motor:** [FAL_SPEC_CENTRAL_NOTIFICACOES_2026-11-13.md](./FAL_SPEC_CENTRAL_NOTIFICACOES_2026-11-13.md)

---

## 1. Decisão

WhatsApp transacional de pedidos fica na **onda N3**, depois do motor in-app (N1/N2) estável.

| Agora | Futuro (N3) |
|-------|-------------|
| `wa.me` manual (contato loja) | Envio automático via provider |
| Canal `whatsapp` no CHECK / deliveries | Outbox `pending` → worker → status |
| Sem API Meta/Twilio | Templates + delivery log (NOT-07) |

**Não** disparar WhatsApp a partir de Checkout, Central ou Logística — só o motor (`order_events` → fanout → outbox).

---

## 2. Pré-requisitos para abrir N3 (gate)

1. Smoke humano N1/N2 OK (sininho + deliveries in_app).  
2. Conta WhatsApp Business / provedor escolhido (Meta Cloud API ou equivalente).  
3. Templates homologados (aprovação, pagamento, despacho, rastreio).  
4. Número E.164 do cliente no cadastro (fonte única).  
5. `notification_channel_config.whatsapp.enabled = true` (só então).

Sem esses itens: canal permanece **off**; falha não existe porque não envia.

---

## 3. Kinds candidatos (cliente)

Prioridade alta (mandatory / ação):

- `payment_approved` / `payment_failed`
- `order_awaiting_decision` / `staff_requested_customer_decision` (CTA → link conta `#decisao`)
- `order_shipped` / `shipment_tracking_updated`
- `order_delivered` / `pickup_authorized`
- `order_cancelled` / `cancellation_*`

Staff **não** recebe WhatsApp operacional nesta onda (inbox admin basta), salvo decisão futura.

---

## 4. Contrato técnico (quando MARCHA N3)

1. Fanout cria `notification_deliveries` `channel=whatsapp` `status=pending` (idempotente).  
2. Worker/Edge processa pending; atualiza `sent|failed` + `provider_ref` / `last_error`.  
3. Preferência do cliente: opt-out permitido **exceto** kinds `mandatory`.  
4. Exceção no envio → WARNING; pedido segue.  
5. Reprocess só `failed` (staff), com limite de tentativas.  
6. Conteúdo: template aprovado + variáveis; deep-link HTTPS da conta.

Hoje: `src/lib/whatsapp.ts` = deep link manual — **não** confundir com N3.

---

## 5. Aceite N3

| ID | Garantia |
|----|----------|
| NOT-07 | WhatsApp registra status em `notification_deliveries` |
| NOT-03 | Sem duplicidade evento×recipiente×canal |
| NOT-06 | Aprovação: mensagem com link que abre decisão |
| NOT-09 | Falhas rastreáveis sem quebrar pedido |

---

## 6. Assinatura

| Item | Data | Auth |
|------|------|------|
| Autorização futura N3 | 2026-11-13 | eFe · **MARCHA FUTURO** |
| Execução N3 | — | Aguarda gate §2 + **MARCHA N3** explícita |
