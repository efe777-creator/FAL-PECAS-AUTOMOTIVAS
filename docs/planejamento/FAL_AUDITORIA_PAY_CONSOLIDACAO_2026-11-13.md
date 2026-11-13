# FAL — Auditoria + consolidação PAY (pagamentos e parcelamento)

**Projeto:** FAL — Peças Automotivas  
**Data:** 2026-11-13  
**Auth:** eFe — MARCHA PAY consolidação  
**Gateway:** Mercado Pago exclusivo (Vindi = só referência de UX admin)  
**Coordenação:** [HOME-06b](./FAL_HOME_BACKLOG_01_08.md) · [AJUSTE-035](./FAL_PLANO_AJUSTE_035_CHECKOUT.md) · [HOME-06a](./FAL_AUDITORIA_HOME_06_PAGAMENTOS_2026-11-12.md)

---

## 1. Veredito PAY-01 (pré-implementação)

| Item | Situação |
|------|----------|
| Gateway conectado | Mercado Pago (Edges + SDK) |
| Pix produção | Comprovado (smoke anterior) |
| Cartão ponta a ponta | **NÃO homologado** — código existe; approved E2E pendente |
| Divergência parcelas | UI fallback 12x vs Edge/política 1x com display off |
| Controle comercial Pix/cartão | **Ausente** (só env) |
| Parcelas reais controladas pela loja | **Parcial** — texto vitrine; sem filtros juros/min no cliente |

---

## 2. Separação de responsabilidades

| Área | Dono | Fonte |
|------|------|--------|
| Integração técnica | Admin → Pagamentos | Env, secrets Edge, motor MP |
| Disponibilidade comercial | Home da Loja → Pagamentos | `store_payment_display` + `paymentDisplay.ts` |
| Cobrança / ledger | Edges + RPC | `payments` / `payment_events` |

Regra: modalidade só aparece se **integração AND comercial** estiverem on. Parcelas = interseção MP ∩ política da loja ∩ valor da compra.

---

## 3. Ondas de implantação

1. **Estrutura + cartão** — Brick alinhado; policy única; smoke PAY-01/09/10  
2. **Controle operacional** — toggles Pix/cartão/parcelas na Home; Edge enforce  
3. **Cliente** — cards + checkout com parcelas reais; snapshot PAY-12  

Homologação: PAY-01 … PAY-12 (matriz do plano PAY).

---

## 4. Fora de escopo desta frente

PIX% / faixas por valor / boleto / multi-gateway (HOME-06b fase 2).

---

## 5. Aceite documentação

| Critério | Resultado |
|----------|-----------|
| Gateway identificado | PASS — MP |
| PAY-01 pré-estado documentado | PASS |
| Links HOME-06b / AJUSTE-035 | PASS |
| Escopo 3 ondas obrigatórias | PASS |

---

## 6. Implementação (mesmo dia)

| Onda | Entrega | Status código |
|------|---------|---------------|
| 1 | Brick = `falMaxInstallmentsForCheckout`; policy + testes; checklist smoke | FEITO |
| 2 | Migration comercial; Home UX; `getEffectivePaymentAvailability`; Edge method/parcelas | FEITO (aplicar migration + redeploy Edge) |
| 3 | PDP formas de pagamento; checkout filtrado; labels reais; snapshot `commercial_snapshot` | FEITO |

**Ops pendente humano:** apply migration `20261113180000_store_payment_display_commercial.sql`, redeploy `create-mp-payment`, executar [checklist smoke cartão](./FAL_MARCHA_PAY_CARD_SMOKE_CHECKLIST_2026-11-13.md).
