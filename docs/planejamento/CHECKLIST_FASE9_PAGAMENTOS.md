# Checklist Fase 9 — Pagamentos Mercado Pago

**Baseline docs:** 2026-10-06 · **F9-A + F9-B + F9-C** · STOP antes F9-D  
**Refs:** [ESPECIFICACAO…](./ESPECIFICACAO_FASE9_PAGAMENTOS_MERCADO_PAGO.md) · [AUDITORIA_F9B…](./AUDITORIA_F9B_PRE_IMPL_2026-10-06.md) · [CHECKLIST_F9B…](./CHECKLIST_F9B_MP_CREATE_PAYMENT.md) · [STOP…](./STOP_F9_MP_POS_AUDITORIA_2026-10-06.md)

---

## Planejamento

- [x] Adendo Plano Mestre (F8.5/F9.0 DONE; F9=MP)
- [x] Auditoria arquitetura checkout/pedido/pagamento
- [x] Especificação Mercado Pago
- [x] Este checklist
- [x] MARCHA → F9-A / F9-B / F9-C

---

## F9-A impl — Fundação

- [x] Migration `20261006200000` + `payment_events` + RLS
- [x] PR #5 MERGED

---

## F9-B — MP Sandbox create

- [x] Edge `create-mp-payment` + body só `orderId`
- [x] Testes A–I + security scan
- [x] PR #6 + #7 MERGED
- [x] STOP F9-B

---

## F9-C — Pix

- [x] Criar cobrança Pix (`create-mp-payment` + method server `pix`)
- [x] QR Code + copia-e-cola (`MercadoPagoPixPanel`)
- [x] Expiração (exibe `expires_at`; status `expired` sem cancelar order)
- [x] Webhook mínimo → pending/approved (`mercado-pago-webhook` + `confirm_mercadopago_payment`)
- [x] UI pendente (sem “pago” no FE; poll SELECT only)
- [ ] Secrets + deploy Edge + URL webhook no DevPanel (humano)
- [x] STOP F9-C (sem F9-D)

---

## F9-D — Cartões

- [ ] Card Payment Brick
- [ ] Crédito + parcelas
- [ ] Débito se disponível na conta
- [ ] Sem PAN/CVV na FAL
- [ ] Aprovado / rejeitado

---

## F9-E — Webhook + concurrency

- [ ] Validação `x-signature` / HMAC (base F9-C; reforçar concurrency)
- [ ] Evento duplicado = no-op
- [ ] Consulta MP + valida amount + order
- [ ] Fora de ordem tratado
- [ ] Logs sem secrets/PAN

---

## F9-F — Checkout FAL

- [ ] Fluxo carrinho→pedido→pagamento→confirmação (base F9-C flag)
- [ ] Amount só do backend
- [ ] Poll/consulta status
- [ ] Simulado ainda disponível se flag off

---

## F9-G — Admin

- [ ] Painel pagamento no pedido
- [ ] IDs externos / método / status / datas
- [ ] Eventos básicos

---

## F9-H — Homologação

### Pix
- [ ] gerar cobrança · QR · copiar · expiração · webhook · aprovação · pedido atualizado

### Crédito / Débito / Segurança / Pedido / Regressão
- [ ] (ver spec)

---

## F9-I — Produção (auth humana)

- [ ] Credenciais PROD
- [ ] Webhook HTTPS
- [ ] Smoke produção
- [ ] Rollback documentado
