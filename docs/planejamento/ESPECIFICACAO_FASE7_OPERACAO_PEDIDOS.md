# Especificação — Fase 7: Operação completa do pedido

**Status:** Planejamento consolidado (F7A entregue; F7B–F7F contratos)  
**Data:** 2026-10-04  
**Branch:** `plan`  
**Base conceitual:** [ESPECIFICACAO_FASE6D_CICLO_PEDIDO.md](./ESPECIFICACAO_FASE6D_CICLO_PEDIDO.md)  
**Auditoria:** [AUDITORIA_FASE7_2026-10-04.md](./AUDITORIA_FASE7_2026-10-04.md)

---

## 1. Objetivo

Transformar o pedido criado/pago na F6 em **processo operacional completo da FAL**, sem misturar integrações externas (F9) nem guest/checkout financeiro novo.

| Camada | Responsável |
|--------|-------------|
| Criar e pagar pedido | F6 (inalterada sem necessidade) |
| Receber, confirmar, separar, expedir, entregar | F7B–F7E |
| Baixa / liberação operacional de estoque | F7F |

---

## 2. Duas visões do mesmo pedido

### 2.1 Cliente

Timeline simples (já projetada em `orderLifecycle.ts` / F7A):

```text
Pedido realizado → Pagamento aprovado → Recebido pela FAL
→ Em confirmação → Separação → Enviado → Entregue
```

Não expor: operador, filial, custo, decisão comercial interna, divergência de estoque.

### 2.2 FAL (admin)

Visão detalhada em `/admin/pedidos` (**F7B+** — não implementar neste gate documental).

---

## 3. Estado real do código (âncora)

### 3.1 Entregue — F7A

| Peça | Local |
|------|--------|
| CHECK de status ampliado + backfill | `fal-pecas/supabase/migrations/20261004040000_fase7a_order_lifecycle.sql` (remoto: `fase7a_order_lifecycle*`) |
| `order_events` + RLS + `emit_order_event` | mesma migration / remoto confirmado |
| `order_transition_allowed` / `transition_order_status` | mesma migration / remoto confirmado (`is_staff()` only) |
| `confirm_simulated_payment` → `pagamento_aprovado` → `recebido` → `em_analise` | mesma migration |
| DV CPF/CNPJ em `place_order` | `20261004060000_fase_audit_document_validation.sql` (remoto aplicado) |
| Projeção timeline cliente | `fal-pecas/src/lib/orderLifecycle.ts` |
| Wrapper staff | `fal-pecas/src/services/orders/orderTransitionService.ts` |
| Detalhe + eventos customer + Comprar novamente | `AccountOrderDetailPage` + `buyAgainService` |
| Sessão | `persistSession: true` em `fal-pecas/src/lib/supabase.ts` |
| Execução | [EXECUCAO_FASE7A.md](./EXECUCAO_FASE7A.md) |

### 3.2 Lacuna operacional explícita (F7A)

> **Cancelamento administrativo via `transition_order_status` atualmente NÃO libera a reserva de estoque.**

- Release de reserva existe no **fail de pagamento** (`release_order_reservations`).
- Cancel staff (`aguardando_decisao` → `cancelado`) só altera status/history/event.
- **Não corrigir “escondido” neste gate.**  
  **Requisito de F7F** (ou evolução conjunta da RPC de transição): ao cancelar, chamar liberação de reserva de forma transacional.

### 3.3 Placeholder

- `/admin/pedidos` e `/admin/estoque` → `AdminPlaceholderPage` (router).

---

## 4. Máquina de estados (canônica)

Alinhada a F6D / CHECK atual:

```ts
type OrderInternalStatus =
  | 'pendente' | 'aguardando_pagamento' | 'pagamento_aprovado'
  | 'recebido' | 'em_analise'
  | 'aguardando_disponibilidade' | 'aguardando_decisao'
  | 'confirmado' | 'em_separacao' | 'pronto_para_envio'
  | 'preparando_envio' // legado
  | 'enviado' | 'entregue' | 'cancelado'
```

**Regra:** UI nunca faz `update orders set status = …` direto. Sempre `transition_order_status` (ou RPC específica futura).

---

## 5. Permissões (roles existentes)

Roles staff: `operador` | `gerente` | `administrador` (`staffService` / `is_staff()`).

| Ação | Permissão |
|------|-----------|
| Visualizar / operar pedidos | `operador` + `gerente` + `administrador` |
| Confirmar disponibilidade | `operador` + `gerente` + `administrador` |
| Avançar operação (separar, expedir, entregar) | `operador` + `gerente` + `administrador` |
| Cancelar pedido | `gerente` + `administrador` |
| Cliente alterar status | **Nunca** |

**Nota:** hoje a RPC `transition_order_status` valida apenas `is_staff()`. Granularidade (cancel só gerente+) é **contrato F7B+** — evoluir RPC/policies sem inventar sistema paralelo de papéis.

---

## 6. Módulos e contratos planejados (sem schema agora)

### F7B — Recepção e confirmação

**Construir sobre:** `order_events` → `transition_order_status` → projeção timeline → UI admin.

Implementar (próximo gate de código):

- `/admin/pedidos` (fila + filtros + busca)
- `/admin/pedidos/:id` (cliente, endereço snapshot, itens, pagamento, frete)
- Disponibilidade **por item** (contrato a materializar):

```ts
type OrderItemAvailability =
  | 'disponivel'
  | 'disponivel_com_prazo'
  | 'indisponivel'
```

- Resultado: `confirmado` | `com_ressalva` | `nao_atendivel`
- Indisponibilidade **não** cancela automaticamente → `aguardando_disponibilidade` / `aguardando_decisao`
- Observações `internal` | `customer` (via eventos ou notes — decisão na implementação F7B)
- Contadores reais no dashboard (não hardcoded)
- Cancel controlado (gerente+)

**Schema planejado (não criar agora):** campos de availability/prazo/obs em `order_items` ou tabela satélite; RPCs `confirm_order` / disponibilidade se necessário além de `transition_order_status`.

### F7C — Separação

- Fila `confirmado` → `em_separacao`
- Checklist por item (`separado` boolean — contrato)
- Conclusão → `pronto_para_envio` + evento `separation_completed`
- Não finalizar com itens pendentes (exceto fluxo de exceção explícito)

### F7D — Expedição

- Evoluir `shipments` (já criada no `place_order`): carrier, service, tracking, shipped_at, estimated_delivery
- `pronto_para_envio` → `enviado`
- Tracking opcional (nulo em entrega própria)
- Sem API real de transportadora

### F7E — Entrega

- `enviado` → `entregue`
- `delivered_at`, método, referência de prova (contrato)
- Sai da fila pendente; permanece em “Meus pedidos”

### F7F — Estoque operacional

- Reserva (já em `place_order`) permanece até baixa
- **Liberar reserva no cancel staff** (corrige lacuna F7A)
- Baixa definitiva na expedição/separação conforme regra consolidada
- Sem estoque negativo; movimentos auditáveis

---

## 7. Recompra (F7A — já entregue)

Contrato mantido:

- Não copia preço/frete/status do pedido antigo
- Resolve preço e disponibilidade **atuais**
- Monta carrinho; cliente passa pelo checkout

---

## 8. Não fazer na Fase 7

- APIs reais de frete / gateway / WhatsApp / e-mail / push
- Aceite de ressalva pelo cliente no site
- Guest checkout / cupons / CRM
- Inventar roles fora de `operador|gerente|administrador`

---

## 9. Ordem obrigatória

```text
F7A (feito) → F7B → F7C → F7D → F7E → F7F
```

Cada subfase: TypeScript, build, SQL/RLS, smoke, regressão, docs → **Gate** antes da próxima.

---

## 10. Fluxo alvo (resumo)

```text
Cliente compra/paga (F6)
    → recebido / em_analise (F7A já)
    → confirmação por item (F7B)
    → separação (F7C)
    → expedição (F7D)
    → entrega (F7E)
    → baixa/liberação estoque (F7F)
```
