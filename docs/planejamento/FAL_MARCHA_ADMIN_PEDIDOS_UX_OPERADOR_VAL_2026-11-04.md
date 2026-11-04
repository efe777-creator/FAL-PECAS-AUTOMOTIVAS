# VAL — MARCHA Admin pedidos UX operador

**Data:** 2026-11-04  
**Escopo:** Dashboard + listagem + detalhe admin — apresentação do fluxo (sem novos status, sem migration, sem deploy)  
**Premissa:** RPCs e ciclo F7/F9/Onda 1 intactos

---

## 1. Mapa status × RPC (auditoria)

| Status | Quem produz | Observação |
|--------|-------------|------------|
| `aguardando_pagamento` | `place_order` | Pagamento pending |
| `pagamento_aprovado` | `confirm_mercadopago_payment` (transitório) | No mesmo RPC avança para `em_analise` |
| `recebido` | idem (transitório) / avanço manual | Contador costuma 0 pós-MP |
| `em_analise` | webhook MP (destino usual) | Conferência de itens |
| `aguardando_disponibilidade` | **nenhuma RPC vigente atribui** | Legado/raro — UI só se count > 0 |
| `aguardando_decisao` | `finalize_order_confirmation` (indisponível/prazo) | Cliente autoriza/recusa |
| `confirmado` | finalize (ok ou pós-authorize) | Confirmação geral da loja |
| `em_separacao` | 1º item separado | |
| `pronto_para_envio` | `complete_order_separation` | |
| `enviado` / `entregue` | `ship_order` / `deliver_order` | |
| `cancelado` | expire / cancel cliente / cancel admin | |

**Ambiguidades resolvidas na UI (não no banco):**

- `recebido` vs `em_analise`: webhook já deixa em análise; “Recebido” = edge/manual.
- `aguardando_decisao` vs `aguardando_disponibilidade`: fluxo atual usa só decisão; disponibilidade = legado.

---

## 2. Organização Dashboard (grupos A–E)

| Grupo | Status | Ação tipicamente |
|-------|--------|------------------|
| A Pagamento | `aguardando_pagamento` | Cliente / wait |
| B Análise | pago transitório + `em_analise` + decisão (+ legado disp.) | Equipe ou cliente |
| C Preparação | `confirmado`, `em_separacao` | Equipe |
| D Expedição | `pronto_para_envio`, `enviado` (+ `preparando_envio`) | Equipe |
| E Finalizados | `entregue`, `cancelado` | Consulta |

Cada pedido conta em **um** grupo apenas (status único).

---

## 3. Critérios de aceite

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | Operador entende fluxo no Dashboard (grupos + textos) | PASS (código) |
| 2–4 | Contadores por status real + deep-link `?status=` | PASS |
| 5 | Fila “precisam de atenção” distingue equipe/cliente | PASS |
| 6 | Decisão vs disponibilidade claro na UI | PASS |
| 7–9 | Próxima ação + timeline + ações contextuais | PASS |
| 10 | Cliente inalterado nesta MARCHA | PASS |
| 11 | RPCs intactas | PASS |
| 12 | `tsc -b` | **PASS** |

## 4. Confirmação

- **Sem** migration / `db push` / alteração remota de BD.  
- **Sem** deploy nesta MARCHA (PR apenas).

## Links

- [Regras fluxo](./FAL_REGRAS_FLUXO_PEDIDOS_2026-11-04.md)  
- [Relatório status](./FAL_RELATORIO_STATUS_PENDENCIAS_2026-11-04.md)  
