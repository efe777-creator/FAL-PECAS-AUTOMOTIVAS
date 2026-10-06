# Especificação Fase 9 — Integrações + qualidade

**Status:** **F9.0 DONE** · **F9-A impl DONE** (`main` `c03afd4`). **STOP antes F9-B**.  
**Base:** [ROADMAP…](./ROADMAP_FASES_3.0.md) · [PLANO_INICIALIZACAO_F9…](./PLANO_INICIALIZACAO_F9_2026-10-06.md) · [ESPECIFICACAO_FASE9_PAGAMENTOS…](./ESPECIFICACAO_FASE9_PAGAMENTOS_MERCADO_PAGO.md)  
**Princípio F6:** checkout e admin falam com **contratos internos FAL**; integrações trocam **adapters**.

---

## 1. Objetivo

- **Pagamento real:** Mercado Pago (Pix / crédito / débito) — ver spec dedicada.
- **Frete real:** adiado para **F10** (F9.0 já entregou sandboxes Correios/Frenet sem HTTP).
- Qualidade: testes, observabilidade, secrets, regressão F7/F8.

---

## 2. Escopo in / out

**In:** MP conforme [ESPECIFICACAO_FASE9_PAGAMENTOS…](./ESPECIFICACAO_FASE9_PAGAMENTOS_MERCADO_PAGO.md); preservar `place_order` + ciclo F7.  
**Out:** WMS/ERP/PIM; reescrever F7/F8; guest checkout; frete HTTP real nesta fase; refund automático na 1ª entrega.

---

## 3. Contratos existentes (não quebrar)

- Frete: `ShippingProvider` / `shippingService` (F9.0 sandboxes).
- Pagamento: `PaymentProvider` / `paymentService` — evoluir para MP sem redesenhar checkout.
- Pedido: `place_order`, ciclo F7.

---

## 4. Mapa de fatias

### F9.0 — Adapters sandbox (DONE)

| Fatia legada | Conteúdo | Status |
|--------------|----------|--------|
| Correios sandbox | `VITE_SHIPPING_PROVIDER=correios` | DONE |
| Frenet sandbox | `VITE_SHIPPING_PROVIDER=frenet` | DONE |
| Gateway sandbox | `VITE_PAYMENT_PROVIDER=gateway\|sandbox` → ainda `confirm_simulated_payment` | DONE |

### F9 — Mercado Pago (gates novos)

| Gate | Conteúdo | Status |
|------|----------|--------|
| F9-A docs | Auditoria + spec + checklist | **DONE** (plan) |
| F9-A impl | Migrations `payments` + `payment_events` + RLS | **DONE** (`c03afd4` PR #5) |
| F9-B…I | Sandbox MP → Pix → cartões → webhook → checkout → admin → testes → prod | **STOP** até MARCHA F9-B |

### F10 — Frete real

HTTP Correios / Melhor Envio / carrier — **fora** da trilha MP.

### Observabilidade / testes live

Absorvidos em F9-E / F9-H do plano MP (não como “F9-D/E” legados de frete).

---

## 5. Critérios de saída

- [x] Cotações sandbox (≥1 provider frete) — F9.0
- [x] Pagamento **simulado/sandbox adapter** completa ciclo F7 — F9.0
- [ ] Pagamento **Mercado Pago** sandbox (Pix + cartão + webhook) — F9-C…H
- [x] Adapters isolados via env
- [ ] Secrets/rotação documentados na impl MP
- [ ] Regressão F7/F8 pós-MP

---

## 6. Dependências

- F8.4 + **F8.5 FECHADO** + F9.0 em `main`.
- Conta MP teste (eFe) para F9-B+.
- Edge Functions a criar (hoje: zero no repo).
- F8.6–F8.8 **não** bloqueiam.

---

## 7. Riscos

| Risco | Mitigação |
|-------|-----------|
| Confundir F9.0 com F9-MP | Nomenclatura explícita neste doc |
| Webhook sem Edge | Criar na F9-B/E |
| Drift migrations | Sem repair em massa |
| Marcar pago no FE | Proibido |

---

## 8. Próximo passo

Revisão humana ok. F9-A impl fechada. **STOP** até `MARCHA F9-B`.
