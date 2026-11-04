# Backlog pós-α — FAL 3.0

**Data:** 2026-11-04  
**Premissa:** Fase α **ENCERRADA** ([STOP formal](./FAL_STOP_ALPHA_FORMAL_2026-11-04.md)) · D-FRETE **B** vigente  
**Regra:** cada item exige MARCHA nomeada + auth; sem misturar Pedidos com Logística na 1ª frente.

---

## P0 — Próxima frente estrutural (recomendado)

| ID | Item | Doc / nota |
|----|------|------------|
| P0-LOG | Plano funcional Logística + medidas (canônico) | [FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md](./FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md) |
| P0-MED | Gestão medidas em Produtos (origem campo, bulk) | **FEITO** [VAL](./FAL_MARCHA_LOGISTICA_MEDIDAS_PRODUTOS_VAL_2026-11-04.md) (+ DDL wtbp) · histórico = depois |
| P0-GLOBAIS | Alterações globais + filtros Categoria/Grupo/Subgrupo/Situação | **FEITO** [VAL](./FAL_MARCHA_PRODUTOS_ALTERACOES_GLOBAIS_VAL_2026-11-04.md) |
| P0-HUB | Hub admin Logística (4 atalhos) | **FEITO** [VAL](./FAL_MARCHA_LOGISTICA_HUB_VAL_2026-11-04.md) |
| P0-ORI | Origem e expedição (remetente + endereço) | **FEITO** [VAL](./FAL_MARCHA_LOGISTICA_ORIGEM_REMETENTE_VAL_2026-11-04.md) |

## P1 — Pagamento / ops

| ID | Item | Nota |
|----|------|------|
| P1-WH | Diagnóstico webhook MCP `notifications_history` | Ressalva Gate — opcional |
| P1-OPS | Fluxo operador confirmação → separação | Auth; regras `transition_order_status` |
| P1-DOC | Sync PRD/ROADMAP pós-STOP α | Auth docs |

## P2 — Frete live / carriers

| ID | Item | Nota |
|----|------|------|
| P2-OWN | Frete próprio FAL (SP capital) | **FEITO config** [VAL](./FAL_MARCHA_LOGISTICA_FRETE_PROPRIO_VAL_2026-11-04.md) · critérios preço avançados = PENDÊNCIA |
| P2-ME | Melhor Envio (cotação ≠ contratação) | Secrets + MARCHA; **nova** decisão se sair de B |
| P2-C | D-FRETE **C** (live) | Só com nova assinatura na ficha |

## P3 — Escala / lançamento

| ID | Item | Nota |
|----|------|------|
| P3-F11 | Catálogo mestre | PRD |
| P3-DOM | Domínio definitivo | Netlify = ponte |
| P3-HOLD | B3 / Bloco F / PDP-ML | HOLD até finding |

## Explicitamente fora da 1ª marcha logística

- Misturar tela Pedidos com configuração Logística  
- Contratação/etiqueta/rastreio na mesma MARCHA da Origem  
- Assumir Correios live sem D-FRETE C  

---

## Ordem sugerida (pós-α)

1. Auth `MARCHA_LOGISTICA_DOC` (se doc ainda incompleto) ou implementação medidas  
2. Hub + Origem  
3. Frete próprio → Melhor Envio  
4. Pedidos (plano separado)  
5. Auditoria pré-liberação vs D-FRETE  

**Assinatura agente:** backlog pós-α 2026-11-04.
