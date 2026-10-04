# Execução — Fase 7: Operação do pedido

**Data:** 2026-10-04  
**Spec:** [ESPECIFICACAO_FASE7_OPERACAO_PEDIDOS.md](./ESPECIFICACAO_FASE7_OPERACAO_PEDIDOS.md)  
**Auditoria:** [AUDITORIA_FASE7_2026-10-04.md](./AUDITORIA_FASE7_2026-10-04.md)  
**F7A:** [EXECUCAO_FASE7A.md](./EXECUCAO_FASE7A.md) — concluída

---

## Gate documental atual (este documento)

Escopo executado **neste gate** (sem código F7B–F7F):

- [x] Auditar estado real F7A no código e no remoto
- [x] Aplicar validation CPF/CNPJ no Supabase remoto (`fase_audit_document_validation` + `…_place_order`; local `20261004060000_*.sql`)
- [x] Criar `ESPECIFICACAO_FASE7_OPERACAO_PEDIDOS.md`
- [x] Criar `AUDITORIA_FASE7_2026-10-04.md`
- [x] Criar este `EXECUCAO_FASE7.md`
- [x] Atualizar ROADMAP, DATABASE, API, docs/README
- [x] Registrar lacuna: cancel staff não libera reserva → requisito F7F
- [x] Registrar matriz de permissões (roles existentes)
- [x] **Não** criar `/admin/pedidos`
- [x] **Não** criar schema de availability / separação / baixa
- [ ] Push — só com autorização explícita

---

## Ordem de implementação (código)

| Subfase | Escopo | Status |
|---------|--------|--------|
| **F7A** | Fundação: status, events, RPC transição, timeline, recompra | **Concluída** |
| **F7B** | `/admin/pedidos`, fila, disponibilidade por item, ressalva, cancel controlado | **Próximo gate** |
| **F7C** | Separação / checklist | Pendente |
| **F7D** | Expedição / shipment / enviado | Pendente |
| **F7E** | Entrega / encerramento | Pendente |
| **F7F** | Liberação no cancel + baixa + auditoria estoque | Pendente |

---

## Gate F7B (quando abrir implementação)

Critérios de entrada:

1. Spec F7 + auditoria aprovadas (este gate)
2. F7A estável no remoto
3. Decisão de permissões documentada

Entregáveis F7B:

- Substituir placeholder `/admin/pedidos`
- Listagem + filtros + detalhe operacional
- Consumir `transitionOrderStatus` / RPCs
- Availability por item (schema + UI)
- Ressalva / aguardando decisão / cancel (gerente+)
- Contadores reais no dashboard
- Cliente continua vendo só projeção (sem detalhes internos)
- Testes: TS, smoke pedido pago → análise → confirmar / cancelar

**Não** implementar separação, envio, baixa neste gate.

---

## Checklist de regressão (todas as subfases)

### Pedido normal

```text
Compra → pagamento → recebido/em_analise → confirmação → separação → envio → entrega
```

### Indisponível

```text
Compra → pagamento → análise → indisponível → aguardando_decisao → cancelar (gerente+)
```

### Prazo / ressalva

```text
Compra → pagamento → análise → prazo → confirmado (com ressalva customer)
```

### Recompra (já F7A)

```text
Pedido antigo → comprar novamente → mix disponível/indisponível → preço atual → carrinho
```

### Segurança

- Cliente não altera status
- Transição inválida rejeitada
- Cancel sem role gerente/admin rejeitado (após granularidade F7B+)

### Estoque (F7F)

- Cancel libera reserva
- Baixa sem negativo
- Sem duplicar movimentos

---

## Checkpoints por subfase

Após cada uma: TypeScript · Build · Lint · SQL/RLS · Smoke · Regressão · Docs → **Gate** antes da próxima.
