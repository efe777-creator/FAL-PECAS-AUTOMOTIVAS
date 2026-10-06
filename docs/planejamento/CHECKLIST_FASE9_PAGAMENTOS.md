# Checklist Fase 9 — Pagamentos Mercado Pago

**Baseline:** 2026-10-06 · **F9-A…D** · STOP antes F9-E  
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

- [ ] Validação assinatura reforçada / fora de ordem
- [ ] Evento duplicado = no-op (base F9-C)
- [ ] Logs sem secrets/PAN

---

## F9-F…I

- [ ] Checkout polimento / Admin / Homologação / Produção
