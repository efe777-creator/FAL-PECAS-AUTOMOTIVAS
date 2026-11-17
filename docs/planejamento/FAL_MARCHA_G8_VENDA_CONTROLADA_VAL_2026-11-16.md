# MARCHA G8 — Venda controlada / VAL

**Data:** 2026-11-16  
**Auth:** eFe — `marcha`  
**Plano:** [FAL_MVP_PLANO_CONSOLIDACAO.md](./FAL_MVP_PLANO_CONSOLIDACAO.md) §11  
**Classe:** MVP-bloqueador  
**Rollback:** [FAL_MARCHA_G8_ROLLBACK_PLAN_2026-11-16.md](./FAL_MARCHA_G8_ROLLBACK_PLAN_2026-11-16.md)  
**Preview canônico:** https://6afb53c8f501a6d7dd6478e4--fal-pecas-automotivas-efe.netlify.app/  
**WA:** `+55 11 99293-5688`

---

## Resultado geral: **BLOCKED** (STOP 8.3)

| Passo | Status | Evidência |
|-------|--------|-----------|
| 8.1 Checklist G1–G7 | **PASS** | Quadro consolidação §1 verde |
| 8.2 Plano rollback | **PASS** | [rollback](./FAL_MARCHA_G8_ROLLBACK_PLAN_2026-11-16.md) |
| 8.3 N vendas reais | **BLOCKED** (smoke parcial) | Smoke cartão Asaas registrado; **falta N=3 fluxo completo** (approve + ops); tip draft |
| 8.4 Monitor 48–72h | **BLOCKED** | Depende de 8.3 |

**Gate G8:** **não fechado** — falta declaração eFe + N vendas sem incidente P0.

---

## Pacote go-live (eFe)

1. Créditos Netlify → `netlify deploy --prod` do tip (WA + G1–G7).  
2. Definir **N** (default 3).  
3. Cada venda: Pix/cartão approve → análise → separação → envio/rastreio **ou** retirada.  
4. Registrar order ids abaixo.  
5. Monitor 48–72h: inbox, pay webhooks, frete, WA.  
6. eFe declara: “loja aberta venda controlada”.

### Registro N vendas (preencher)

| # | order_id | total | pay | frete | status final | incidente? |
|---|----------|-------|-----|-------|--------------|------------|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

---

## Dívidas ops (não bloqueiam 8.1–8.2)

| Item | Estado |
|------|--------|
| `--prod` Netlify | **Forbidden** — credit usage exceeded |
| Pix > R$ 201 live Asaas | Dívida G3 |
| ME purchase etiqueta live | Dívida G4 |
| E-mail loja `VITE_STORE_EMAIL` | Opcional |

---

## G8.3 smoke simples (eFe) — 2026-11-16 ~20:50 BRT

eFe: teste simples no preview; **validação total depois**.

| # | order_id | total | pay | resultado | incidente? |
|---|----------|-------|-----|-----------|------------|
| S1 | `79aa39b0-54f9-4b24-aa55-78e23b3a380b` | 66,74 | Asaas **débito** `pay_0wks9jdx6k3xqjk4` | create PENDING → pedido **cancelado** / pay cancelled | não |
| S2 | `7fcc0e5c-e8ad-4284-9e8f-22fc97bbca71` | 66,74 | Asaas **crédito** embedded | **rejected** — Asaas: *Transação não autorizada, verifique o limite* (`invalid_object`) · sem `provider_payment_id` | não (recusa esperada) |

**Leitura:** path cartão Asaas no preview **responde** (create + recusa creditícia).  
**Não fecha 8.3:** falta approve real + N=3 com pós-pay (análise/separação) quando eFe validar totalmente.

### Registro N vendas (completo — preencher na validação total)

| # | order_id | total | pay | frete | status final | incidente? |
|---|----------|-------|-----|-------|--------------|------------|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

---

## Recheck marcha 2026-11-16 ~20:35 BRT

| Check | Resultado |
|-------|-----------|
| Pedidos hoje | 5 (`cancelado` / `aguardando_pagamento`) — **0** no fluxo pós-pay |
| Pay approved desde STOP G8 | **0** |
| `netlify deploy --prod --dir=dist` | **FAIL** `JSONHTTPError: Not Found` (link/API; dist existe) |
| Preview canônico | inalterado `6afb53c8…` |

**Conclusão:** STOP 8.3 mantido — nada novo para avançar.

---

## Próximo

**STOP humano:** eFe faz 8.3–8.4 (ou autoriza N + monitor). Agente retoma com `marcha` após 1ª venda ou após `--prod`.
