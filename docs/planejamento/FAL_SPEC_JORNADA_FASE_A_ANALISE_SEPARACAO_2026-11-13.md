# Spec — Jornada Fase A: Análise → Separação

**Data:** 2026-11-13  
**Auth:** eFe — MARCHA design  
**Escopo:** operador + cliente pós-pago até romaneio  
**Fora:** expedição ME/own, requote volume, Uber/99, estorno parcial auto, WhatsApp

---

## Objetivo

Operador resolve análise (ok / prazo / falta) com CTAs claros; cliente entende e responde **Continuar · Esperar · Cancelar**; pedido segue para separação com romaneio coerente (itens `indisponivel` fora do envio).

## Decisões

| Tema | Decisão |
|------|---------|
| Prazo maior | Ops escolhe: atualizar prazo e seguir **ou** pedir cliente |
| Item faltante | Hold `aguardando_disponibilidade` **ou** pedir decisão; “só disponíveis” **só após** `continue_available` |
| Financeiro | Totais inalterados; estorno parcial manual fora do sistema |
| Cliente | `continue_available` \| `wait_arrival` \| `cancel_order` (+ legado authorized/rejected) |
| Abordagem | Estender RPCs existentes (sem máquina nova) |

## Fluxo

```text
em_analise
  → finalize (ok / prazo atualizado) → confirmado → separação / romaneio
  → staff_hold_for_availability → aguardando_disponibilidade → retoma análise
  → staff_request_customer_decision → aguardando_decisao
       → continue_available → confirmado
       → wait_arrival → aguardando_disponibilidade
       → cancel_order → cancellation_request pending
```

## Dados

- `orders.customer_decision`: pending \| continue_available \| wait_arrival \| cancel_order \| authorized \| rejected \| null
- `orders.decision_proposal` jsonb: `{ kind, reason_text, quoted_eta, new_eta, unavailable_item_ids, wait_days, … }`

## proposal_kind

`prazo` · `parcial` · `escolha` · `obs` · `indisponivel` · `outro`

## RPCs

- `staff_request_customer_decision` — grava proposal + `aguardando_decisao`
- `staff_hold_for_availability` — hold com prazo estimado
- `customer_respond_order_decision` — 3 ações (+ map authorize/reject)
- `finalize_order_confirmation` — bloqueia indisponível sem autorização; aceita continue/authorized
- `complete_order_separation` / `set_order_item_separated` — skip/bloqueia `indisponivel`

## Aceite

1. Pago → análise → finalize → romaneio  
2. Prazo → atualizar e seguir  
3. Prazo → pedir → cliente aceita  
4. Falta → hold → retoma → finalize  
5. Falta → parcial → continue → separação sem item faltante  
6. Falta → cancel → cancelamento pedido  
7. Legado authorized ainda finaliza  

## Fase B (próximo)

Medidas/cotação, divergência volume, etiqueta ME, frete próprio apps, rastreio, WhatsApp.
