# VAL — M4 REGRAS-PEDIDOS-ONDA1

**Data:** 2026-11-04  
**Escopo:** cancelar não pago (cliente) · autorização `aguardando_decisao` · labels/CTAs · finalize exige authorize  
**Runtime:** wtbp · migration `20261104180000_customer_order_decision_cancel.sql`

---

## Critérios

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Doc regras publicado (M3) | **PASS** |
| 2 | RPC `customer_cancel_unpaid_order` no wtbp | **PASS** |
| 3 | RPC `customer_respond_order_decision` + coluna `orders.customer_decision` | **PASS** |
| 4 | `finalize_order_confirmation`: prazo/indisponível → `aguardando_decisao`; confirmado só com `authorized` | **PASS** (SQL) |
| 5 | UI cliente: cancelar + painel Autorizar/Recusar + CTAs lista | **PASS** (código) |
| 6 | UI admin: banner estado da autorização | **PASS** (código) |
| 7 | Labels comerciais (`pronto_para_envio` = Aguardando postagem, etc.) | **PASS** |
| 8 | `tsc -b` | **PASS** |

## Smoke manual (pós-deploy)

1. Pedido `aguardando_pagamento` → Cancelar → status `cancelado` + itens no carrinho.  
2. Admin: marcar indisponível/prazo → Finalizar → `aguardando_decisao` + `customer_decision=pending`.  
3. Cliente: Autorizar → admin Finalizar → `confirmado`.  
4. Cliente: Recusar → admin não consegue confirmar (erro explícito).

## Veredicto

**PASS código + SQL** — aguarda merge/Netlify + smoke humano acima.

## Links

- [Regras](./FAL_REGRAS_FLUXO_PEDIDOS_2026-11-04.md)  
- [Auditoria](./FAL_AUDITORIA_COMPLETA_PENDENCIAS_2026-11-04.md)  
