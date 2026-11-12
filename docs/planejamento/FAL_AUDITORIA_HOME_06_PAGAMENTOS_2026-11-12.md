# FAL — Auditoria HOME-06a — Pagamentos (anúncio × checkout)

**Projeto:** FAL — Peças Automotivas  
**Data:** 12/11/2026  
**Auth:** eFe — `MARCHA` (HOME-06a)  
**Pacote:** HOME-06a  
**Plano mestre:** [FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md](./FAL_PLANO_MESTRE_HOME_COMERCIAL_2026-11.md)  
**Backlog:** [FAL_HOME_BACKLOG_01_08.md](./FAL_HOME_BACKLOG_01_08.md)  
**Status:** Auditado (código/migrations no repo) — **sem alteração de produção**  
**Escopo:** read-only · não mistura implementação AJUSTE-035  

---

## 1. Método

Inspeção de `store_payment_display`, admin Home, hints de card/PDP, Brick MP e criação de pagamento.  
Classificação: **comprovado** · **parcial** · **só UI** · **só doc** · **não implementado** · **não comprovado**.

---

## 2. Camada de apresentação atual (`paymentDisplay`)

### 2.1 Schema

| Campo | Papel | Evidência |
|-------|--------|-----------|
| `enabled` | Liga/desliga texto “em até Nx…” | comprovado — `20261105210000_store_payment_display.sql` |
| `max_installments` | Teto 1–24 (default 3) | comprovado |
| `min_installment_amount` | Parcela mínima (default 20) | comprovado |
| `interest_free` | Flag de copy “sem juros” | comprovado |
| `show_on_cards` / `show_on_pdp` | Superfícies | comprovado |
| `footnote` | Nota no PDP | comprovado |

Singleton + RLS: leitura pública; escrita `is_staff()`. Seed inicial: **enabled=false**.

### 2.2 Serviços / UI

| Peça | Papel | Evidência |
|------|--------|-----------|
| `paymentDisplay.ts` | `resolveInstallmentCount`, `formatPaymentConditionLine` | comprovado |
| `paymentDisplayService.ts` | GET/upsert + cache 5 min | comprovado |
| Admin Home aba Pagamento | Edita os campos acima | comprovado — `AdminHomeContentPage.tsx` |
| `PaymentConditionHint` | Card/PDP | comprovado |
| Admin Mercado Pago | **Lê** display e lista max/min/juros (informativo) | comprovado |

### 2.3 O que o display **não** tem

| Capacidade | Estado |
|------------|--------|
| Desconto PIX (% ou fixo) | **não implementado** |
| Base de cálculo PIX / mínimo compra PIX | **não implementado** |
| Acumulação promo + PIX | **não implementado** |
| Faixas de valor → N parcelas | **não implementado** (só teto global + min parcela) |
| Juros por parcela / tabela | **não implementado** (`interest_free` é booleano de copy) |
| Cards de pagamento da Home (PIX / Nx) administráveis | **não implementado** |
| Outros meios (débito, boleto) no display | **não implementado** |

---

## 3. Capacidade real do checkout (código)

| Fluxo | Capacidade no código | Evidência |
|-------|----------------------|-----------|
| PIX MP | Criação de pagamento Pix + QR | comprovado — `CheckoutPage`, `mpCreatePaymentCore` |
| Cartão MP | Brick + `installments` no body | comprovado |
| Validação installments no core | `installments >= 1` finito; **não** cruza com `store_payment_display` | comprovado — `mpCreatePaymentCore.ts` |
| Cap de UI no Brick | Se display enabled: `min(12, resolveInstallmentCount)`; se **disabled**: fallback **12** | comprovado — `MercadoPagoCardBrickPanel.tsx` |
| Desconto PIX no total do pedido | | **não implementado** / **não comprovado** no motor comercial da Home |
| Rejeição servidor se método desativado no display | | **não implementado** — display não governa métodos MP |

**AJUSTE-035:** marcha de checkout/Pix/cartão/webhook é frente **separada**. Esta auditoria só mapeia divergência anúncio × cobrança.

---

## 4. Matriz anúncio × checkout

| Condição anunciável hoje | Onde anuncia | O que o checkout faz | Divergência |
|--------------------------|--------------|----------------------|-------------|
| “em até Nx de R$…” | Card/PDP se `enabled` | Brick limita opções se display on; se display **off**, Brick pode oferecer até **12** | **P0 risco:** display desligado ≠ checkout limitado ao mesmo teto comercial |
| “sem juros” (flag) | Texto da linha | Flag **não** configura juros MP; MP define opções reais | **P1:** copy pode mentir se flag true e MP tiver juros |
| Footnote | PDP | Sem efeito no gateway | OK se só informativo |
| Max parcelas admin | Display | Core MP **não** valida contra `max_installments` | **P0:** cliente pode enviar installments fora da política da loja se UI falhar |
| Min parcela | Display (cálculo N) | Sem enforcement servidor | **P1** |
| Desconto PIX | — | Sem motor Home | N/A até HOME-06b |
| Faixas por valor | — | — | N/A |
| Cards Home PIX/parcelas | — | — | N/A |

---

## 5. Perguntas de acumulação (plano mestre)

| Pergunta | Resposta factual | Evidência |
|----------|------------------|-----------|
| Promo acumula com desconto PIX? | Sem desconto PIX no código → **não aplicável / não implementado** | comprovado (ausência) |
| PIX sobre normal ou promo? | **Não comprovado** / não implementado | — |
| Parcelamento sem juros em promocionais? | Mesma linha de display sobre `displayPrice` (já é preço vigente) | parcial — só copy |
| Limites por faixa? | Não | comprovado |
| Condições por produto/categoria? | Não no display | comprovado |
| Gateway cobre o anunciado? | Depende: Brick usa MP installments; display é política comercial separada | parcial — smoke produção **não comprovado** aqui |

**Nenhuma regra de acumulação deve ser presumida na HOME-06b.**

---

## 6. Regras anunciáveis vs evolução

### Podem ser anunciadas **hoje** (com ressalvas)

- Texto “em até Nx…” **somente se** `enabled=true` **e** o valor N for coerente com o que o Brick oferece **e** a operação aceitar o risco de ausência de validação no servidor.  
- Footnote informativo.

### Exigem evolução (HOME-06b / alinhamento 035) antes de anunciar

- Desconto PIX  
- Faixas de parcelamento  
- Garantia “sem juros” amarrada ao MP  
- Cards dedicados na Home  
- Enforcement servidor: installments ≤ política da loja  
- Alinhar fallback do Brick quando display está **disabled** (hoje sobe para 12)

### Correções P0 candidatas (não implementadas nesta MARCHA)

1. **Enforcement:** validar `installments` no create payment contra `store_payment_display` (ou política única).  
2. **Brick fallback:** não usar 12 quando display disabled — ou documentar que disabled = “sem texto, mas checkout livre até gateway”.  
3. Não anunciar “sem juros” sem evidência MP.

Classificação para o Gate pós-F1 / HOME-06b: tratar 1–2 como **P0** de consistência comercial.

---

## 7. Cards de pagamento da Home

| Tema | Estado |
|------|--------|
| Cards configuráveis (PIX / parcelas) na Home | **não implementado** |
| Condição no product card | Linha única via `PaymentConditionHint` | comprovado |
| Texto manual livre além de footnote | Footnote livre — risco de contradição | parcial |

---

## 8. Relação com AJUSTE-035

| Tema | Diretriz |
|------|----------|
| Pix QR, webhook, Brick, recovery | Continua na marcha 035 |
| HOME-06b | Só implantar anúncio/regras **comprovadas** e alinhadas ao que 035 já cobra |
| Não bloquear 035 | Esta auditoria não autoriza nem bloqueia 035 |

---

## 9. Achados priorizados

| ID | Sev | Achado | Destino |
|----|-----|--------|---------|
| P6-01 | P0 | Create payment não valida installments vs display | HOME-06b / alinhamento 035 |
| P6-02 | P0 | Display off → Brick fallback 12x | HOME-06b spec |
| P6-03 | P1 | `interest_free` é copy, não política MP | HOME-06b / copy |
| P6-04 | P1 | Sem PIX% / faixas / cards Home | HOME-06b (após decisão comercial) |
| P6-05 | P2 | Footnote pode contradizer regras | HOME-07 / governança texto |

---

## 10. Aceite HOME-06a

| Critério | Resultado |
|----------|-----------|
| Matriz anúncio × checkout | PASS |
| Capacidades comprovadas | PASS |
| Limitações / contradições | PASS |
| Regras anunciáveis vs evolução | PASS |
| Sem alteração de produção | PASS |

**Assinatura:** MARCHA HOME-06a auditoria PASS · 2026-11-12 · read-only.
