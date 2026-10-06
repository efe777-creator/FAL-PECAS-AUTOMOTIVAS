# Checklist Fase 9 — Pagamentos Mercado Pago

**Baseline:** 2026-10-06 · **F9-A…E** · STOP antes F9-F  
**Refs:** [ESPECIFICACAO…](./ESPECIFICACAO_FASE9_PAGAMENTOS_MERCADO_PAGO.md) · [STOP…](./STOP_F9_MP_POS_AUDITORIA_2026-10-06.md)

---

## F9-A / F9-B / F9-C

- [x] Fundação payments + create-mp-payment + Pix UI + webhook mínimo

---

## F9-D — Cartões

- [x] Card Payment Brick (`@mercadopago/sdk-react`)
- [x] Crédito + parcelas (Brick)
- [x] Débito quando `payment_type_id=debit_card`
- [x] Sem PAN/CVV na FAL
- [x] Create payment pending; approve/reject via webhook (sem “pago” no FE)
- [ ] `VITE_MP_PUBLIC_KEY` TEST configurada (humano)
- [x] STOP F9-D

---

## F9-E — Webhook + concurrency

- [x] Validação assinatura reforçada + freshness ts (10 min)
- [x] Fora de ordem / approved prevalece (`decideWebhookTransition`)
- [x] Evento duplicado = no-op (unique + processed)
- [x] Logs/ledger sanitizados (sem secrets/PAN)
- [x] Re-read status antes de approve (race)
- [x] STOP F9-E

---

## F9-F…I

- [ ] Checkout polimento / Admin / Homologação / Produção
