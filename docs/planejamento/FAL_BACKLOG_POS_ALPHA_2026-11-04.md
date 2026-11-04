# Backlog pós-α — FAL 3.0

**Data:** 2026-11-04  
**Premissa:** Fase α **ENCERRADA** ([STOP formal](./FAL_STOP_ALPHA_FORMAL_2026-11-04.md)) · D-FRETE **B** vigente  
**Planejamento cruzado:** [auditoria completa](./FAL_AUDITORIA_COMPLETA_PENDENCIAS_2026-11-04.md) · [regras de pedidos](./FAL_REGRAS_FLUXO_PEDIDOS_2026-11-04.md)  
**Regra:** cada item exige MARCHA nomeada + auth; sem misturar Pedidos com Logística na mesma frente sem gate.

---

## P0 — Estrutural (logística / produtos)

| ID | Item | Doc / nota |
|----|------|------------|
| P0-LOG | Plano funcional Logística + medidas (canônico) | [plano](./FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md) |
| P0-MED | Gestão medidas em Produtos (origem campo, bulk) | **FEITO** [VAL](./FAL_MARCHA_LOGISTICA_MEDIDAS_PRODUTOS_VAL_2026-11-04.md) · histórico = P1-LOG-HIST |
| P0-GLOBAIS | Alterações globais + filtros Categoria/Grupo/Subgrupo/Situação | **FEITO** [VAL](./FAL_MARCHA_PRODUTOS_ALTERACOES_GLOBAIS_VAL_2026-11-04.md) |
| P0-HUB | Hub admin Logística (4 atalhos) | **FEITO** [VAL](./FAL_MARCHA_LOGISTICA_HUB_VAL_2026-11-04.md) |
| P0-ORI | Origem e expedição (remetente + endereço) | **FEITO** [VAL](./FAL_MARCHA_LOGISTICA_ORIGEM_REMETENTE_VAL_2026-11-04.md) |
| P0-MED-DADOS | Preencher peso/medidas (98/100 published sem peso em 04/11) | M6 — operação eFe (valores por grupo) |

## P1 — Pagamento / ops / docs / regras

| ID | Item | Nota |
|----|------|------|
| P1-EXP | Expiry não pago + release reserva (TTL 48 h) | **FEITO** [VAL](./FAL_MARCHA_PEDIDO_EXPIRY_RESERVA_VAL_2026-11-04.md) |
| P1-CRON | Agendar `expire_unpaid_orders` via **`pg_cron`** | **FEITO** [VAL](./FAL_MARCHA_PEDIDO_EXPIRY_PG_CRON_VAL_2026-11-04.md) · 9 expirados na 1ª corrida |
| P1-OPS | Fluxo operador confirmação → separação | **FEITO** [VAL](./FAL_MARCHA_PEDIDOS_OPS_CONFIRMACAO_SEPARACAO_VAL_2026-11-04.md) |
| P1-DOC | Sync PRD/ROADMAP pós-STOP α + regras | **FEITO** [VAL M3](./FAL_MARCHA_DOCS_SYNC_POS_ALPHA_VAL_2026-11-04.md) |
| P1-REG1 | Regras pedidos Onda 1 (cancel pré-pago, autorização, labels) | **FEITO** [VAL](./FAL_MARCHA_PEDIDOS_REGRAS_ONDA1_VAL_2026-11-04.md) (wtbp + PR) |
| P1-REG2 | Regras pedidos Onda 2 (cancel pós-pago + estorno) | M8 — política de estorno pendente |
| P1-REG3 | Regras pedidos Onda 3 (cartão tokenizado) | M10 — seguir/adiar |
| P1-WH | Diagnóstico webhook MCP `notifications_history` | Ressalva Gate — M9 |
| P1-OPS-E2E | Ciclo `08da5ada` até entregue | M7 |
| P1-LOG-HIST | Histórico alterações de medidas | Após M6 |

## P2 — Frete live / carriers

| ID | Item | Nota |
|----|------|------|
| P2-OWN | Frete próprio FAL (SP capital) | **FEITO config** [VAL](./FAL_MARCHA_LOGISTICA_FRETE_PROPRIO_VAL_2026-11-04.md) · preço avançado + `enabled` = PENDÊNCIA |
| P2-ME | Melhor Envio (cotação ≠ contratação) | Secrets + MARCHA; **nova** decisão se sair de B |
| P2-C | D-FRETE **C** (live) | Só com nova assinatura na ficha |

## P3 — Escala / lançamento

| ID | Item | Nota |
|----|------|------|
| P3-F11 | Catálogo mestre | PRD |
| P3-DOM | Domínio definitivo | Netlify = ponte |
| P3-HOLD | B3 / Bloco F / PDP-ML | HOLD até finding |

---

## Ordem de MARCHAs (vigente)

| # | MARCHA | Status |
|---|--------|--------|
| M3 | DOCS-SYNC-POS-ALPHA | **FEITO** (#51) |
| M4 | REGRAS-PEDIDOS-ONDA1 | **FEITO** (SQL wtbp + PR) |
| M5 | CRON-EXPIRY (`pg_cron`) | **FEITO** |
| M6 | DADOS-MEDIDAS | Aguarda valores eFe |
| M7 | OPS-E2E-ENTREGA | — |
| M8 | REGRAS-PEDIDOS-ONDA2 | Política estorno |
| M9 | WEBHOOK-DIAG | — |
| M10 | REGRAS-PEDIDOS-ONDA3 | Seguir/adiar |
| M11+ | Frete C / ME · F11 · domínio | Assinaturas |

**Assinatura agente:** backlog pós-α sync 2026-11-04 (M3).
