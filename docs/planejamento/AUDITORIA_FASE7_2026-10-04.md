# Auditoria — Fase 7 (gate documental / fundação F7A)

**Data:** 2026-10-04  
**Projeto Supabase:** `wtbpwuiayednvlhvuhbh`  
**Branch:** `plan`  
**Escopo deste gate:** documentar o que **já existe** (código + remoto); registrar contratos F7B–F7F **sem** schema/UI nova; fechar entrada para F7B.

**Veredito:** **APROVADA para abrir F7B** — F7A tratada como fundação entregue, com lacuna operacional explícita (cancel ≠ release).

---

## 1. Método

Cruzamento de:

1. Migrations versionadas em `fal-pecas/supabase/migrations/`
2. Objetos reais no remoto (`list_migrations` + `pg_proc` / `information_schema`)
3. Frontend (`orderLifecycle`, services, Account, router admin)
4. Docs F6D / F7A já existentes

---

## 2. Remoto — migrations relevantes

| Version (remoto) | Nome |
|------------------|------|
| `20261004035304` | `fase7a_order_lifecycle` |
| `20261004035314` | `fase7a_order_lifecycle_funcs` |
| `20261004035327` | `fase7a_confirm_payment_cycle` |
| `20261004045906` | `fase_audit_document_validation` |
| `20261004045956` | `fase_audit_document_validation_place_order` |

**Local (fonte versionada):**

- `20261004040000_fase7a_order_lifecycle.sql` (DDL/RPC F7A consolidado)
- `20261004060000_fase_audit_document_validation.sql` (DV CPF/CNPJ + uso em `place_order`)

Nomes/versões remotos diferem do arquivo único local (histórico de apply via MCP), mas o **comportamento auditado no banco** corresponde às funções abaixo.

---

## 3. Objetos confirmados no remoto

| Objeto | Existe |
|--------|--------|
| Tabela `order_events` | Sim — colunas: `id`, `order_id`, `event_type`, `payload`, `visibility`, `created_by`, `created_at` |
| `emit_order_event` | Sim (SECURITY DEFINER) |
| `order_transition_allowed` | Sim (IMMUTABLE) |
| `transition_order_status` | Sim (SECURITY DEFINER) |
| `release_order_reservations` | Sim (SECURITY DEFINER; origem F6) |
| `confirm_simulated_payment` | Sim |
| `is_valid_cpf` / `is_valid_cnpj` | Sim |

### 3.1 `transition_order_status` (comportamento real)

- Exige `auth.uid()` + `public.is_staff()`
- Valida `order_transition_allowed(from, to)`
- Atualiza `orders.status`
- Insere `order_status_history`
- Emite `order_events` via `emit_order_event`
- **Não** chama `release_order_reservations`
- **Não** distingue `gerente`/`administrador` de `operador` no cancel

### 3.2 Transições permitidas (remoto = local)

Alinhado a F6D/F7A: `pagamento_aprovado`→`recebido`→`em_analise`→(`confirmado`|`aguardando_disponibilidade`|`aguardando_decisao`)→…→`enviado`→`entregue`; cancel operacional a partir de `aguardando_decisao`→`cancelado`.

### 3.3 Onde a reserva é liberada hoje

- Fail de pagamento simulado em `confirm_simulated_payment` → `release_order_reservations` + `cancelado`
- Cancel via `transition_order_status` → **não libera reserva**

---

## 4. Frontend — estado real

| Peça | Status |
|------|--------|
| `src/lib/orderLifecycle.ts` | Projeção timeline / labels — presente |
| `orderTransitionService.ts` → RPC | Presente; **nenhuma UI admin consome** ainda |
| `orderDetailService.ts` + `order_events` | Presente |
| `AccountOrderDetailPage` + timeline + eventos | Presente |
| `buyAgainService` / Comprar novamente | Presente |
| `persistSession: true` (`supabase.ts`) | Presente |
| `/admin/pedidos` | **Placeholder** (`AdminPlaceholderPage`) |
| Availability por item / fila / contadores | **Ausente** (F7B) |

---

## 5. Lacuna operacional explícita (não corrigir neste gate)

> **Cancelamento administrativo via `transition_order_status` atualmente não libera a reserva de estoque.**

| Tratamento | |
|------------|--|
| Neste gate | Documentar apenas |
| Correção | Requisito de **F7F** (evolução transacional de `transition_order_status` ou RPC de cancel que chame `release_order_reservations`) |

---

## 6. Permissões — decisão preservada

| Ação | Permissão |
|------|-----------|
| Visualizar/operar pedidos | `operador` + `gerente` + `administrador` |
| Confirmar disponibilidade | `operador` + `gerente` + `administrador` |
| Avançar operação | `operador` + `gerente` + `administrador` |
| Cancelar pedido | `gerente` + `administrador` |
| Cliente alterar status | **Nunca** |

**Hoje no banco:** RPC usa só `is_staff()`. Granularidade de cancel = contrato **F7B+** (evoluir RPC), sem inventar roles novas.

---

## 7. Contratos planejados F7B–F7F (sem implementação)

| Subfase | Contrato (resumo) | Schema agora? |
|---------|-------------------|---------------|
| **F7B** | `/admin/pedidos` fila/filtros/detalhe; availability por item; ressalva; cancel controlado; contadores reais; base `order_events` → `transition_order_status` → timeline | Não |
| **F7C** | Separação / checklist → `pronto_para_envio` | Não |
| **F7D** | Expedição / `shipments` / `enviado` | Não |
| **F7E** | Entrega / `entregue` | Não |
| **F7F** | Liberação no cancel + baixa + auditoria estoque | Não |

Spec canônica: [ESPECIFICACAO_FASE7_OPERACAO_PEDIDOS.md](./ESPECIFICACAO_FASE7_OPERACAO_PEDIDOS.md).

---

## 8. Fora deste gate (confirmado)

- Criar `/admin/pedidos` real
- Novas tabelas/colunas de availability / separação / baixa
- “Correção silenciosa” do release no cancel
- Push sem autorização explícita

---

## 9. Critérios para F7B

| Critério | Status |
|----------|--------|
| F7A no remoto (events + transição + ciclo pós-pagamento) | OK |
| Spec F7 + execução + esta auditoria | OK |
| Lacuna cancel/reserva registrada | OK |
| Matriz de permissões registrada | OK |
| `/admin/pedidos` ainda não implementado (proposital) | OK |

**Próximo gate de código:** **F7B — Recepção e confirmação pela FAL**.
