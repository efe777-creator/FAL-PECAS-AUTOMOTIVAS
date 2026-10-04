# Especificação — Fase 6D — Ciclo completo do pedido

**Status:** Especificada (documentação; sem implementação operacional)  
**Data:** 2026-10-04  
**Tipo:** Fonte de verdade de estados, transições, eventos e projeções  
**Depende de:** F6 (pedido/pagamento), F6B (preço), F6C (endereço/frete)  
**Implementação começa em:** F7A  
**Roadmap:** [ROADMAP_FASES_3.0.md](./ROADMAP_FASES_3.0.md)  
**Execução:** [EXECUCAO_FASE6D.md](./EXECUCAO_FASE6D.md)

---

## 1. Objetivo

Formalizar o ciclo de vida do pedido **após** a criação no checkout, de modo que site, app, Dashboard admin, services, RPCs e futuras notificações consumam **o mesmo modelo** — sem cada UI inventar estados próprios.

A F6D **não implementa** código de negócio. Apenas especifica.

---

## 2. Estado atual auditado (código / banco)

### 2.1 `orders.status` (CHECK legado)

Definido em `fal-pecas/supabase/migrations/20261003180000_fase2_schema_rls.sql`:

| Valor | Uso atual |
|-------|-----------|
| `pendente` | Default de schema; pouco usado no fluxo F6 |
| `aguardando_pagamento` | Status na criação via `place_order` |
| `pagamento_aprovado` | Após approve do pagamento simulado |
| `em_separacao` | No CHECK; **sem transição operacional staff** |
| `preparando_envio` | No CHECK; **sem UI/admin** |
| `enviado` | No CHECK; sem operação |
| `entregue` | No CHECK; sem operação |
| `cancelado` | Pagamento simulado falhou / cancelamento F6 |

**Ausentes no banco hoje (modelo F6D futuro):**  
`recebido`, `em_analise`, `aguardando_disponibilidade`, `aguardando_decisao`, `confirmado`, `pronto_para_envio`.

### 2.2 Histórico

Tabela `order_status_history`: `id`, `order_id`, `status`, `note`, `changed_by`, `created_at`.  
Não há `event_type`, `payload` JSON nem `visibility` (internal/customer).

### 2.3 `place_order` / estoque

- Cria pedido em `aguardando_pagamento`.
- Reserva (`quantity_reserved` + movimento `reserve`) na criação.
- Aprovação simulada → `pagamento_aprovado` + linha em history.
- Falha simulada → `cancelado` + liberação de reserva (F6).
- **Não há** etapa de confirmação FAL, análise por item nem baixa de estoque na separação.

### 2.4 Conta do cliente

`AccountOrderDetailPage`: label plano de status + lista de `order_status_history`.  
Sem timeline por steps, sem “Comprar novamente”, sem projeção cliente≠interno.

### 2.5 Sessão

`fal-pecas/src/lib/supabase.ts`: `persistSession: true`, `autoRefreshToken: true`.  
Critério “só Sair encerra” — validação funcional na **F7A** (não alterar na F6D).

### 2.6 Divergências doc × código (somente registro)

| Tema | Doc/PRD | Código |
|------|---------|--------|
| Status PRD | Pendente → … → Em separação → Preparando envio → … | CHECK parcial; operação pós-pagamento **não existe** |
| Confirmação FAL | (este doc) | Inexistente |
| Eventos ricos | (este doc) | Só `order_status_history` |
| API.md §4b | Dizia “planejada” para 6B | F6B já implementada |

A F6D **não corrige** essas lacunas em código — apenas define o alvo.

---

## 3. Decisão de negócio fechada — indisponibilidade pós-pagamento

Quando o pagamento está aprovado e a FAL constata item **indisponível** ou com **prazo adicional**:

1. O pedido **não** é cancelado automaticamente.
2. Permanece em **análise operacional**.
3. O operador decide:
   - **A — Alterar prazo / ressalva** → `aguardando_disponibilidade` (+ comunicação futura ao cliente).
   - **B — Cancelamento controlado** → `aguardando_decisao` → `cancelado`, com motivo e evento auditável.
4. **Aceite explícito do cliente** à alteração de prazo: **fora da F6D** — ponto de extensão (§17).

---

## 4. Duas camadas de status

### 4.1 Pré-operacional (F6 — checkout/pagamento)

| Status legado | Papel |
|---------------|--------|
| `pendente` | Legado / edge |
| `aguardando_pagamento` | Pedido criado, aguarda pagamento |
| `pagamento_aprovado` | Pagamento ok — **porta de entrada** do ciclo FAL |

Na F7A: após `pagamento_aprovado`, system avança para `recebido` e em seguida `em_analise` (§6.3).

### 4.2 Operacional canônico (F6D → F7+)

```text
recebido
em_analise
aguardando_disponibilidade
aguardando_decisao
confirmado
em_separacao
pronto_para_envio
enviado
entregue
cancelado
```

---

## 5. Glossário

| Pergunta | Resposta |
|----------|----------|
| O que o cliente vê? | Steps da timeline (§7) + eventos `visibility=customer` |
| O que a FAL vê? | Status interno + fila + análise por item + eventos internal |
| Qual é o estado real? | Sempre `orders.status` (interno canônico) |
| Quem muda o estado? | System ou staff via serviço/RPC (F7+) — **nunca** update direto na UI |

---

## 6. Máquina de estados

### 6.1 Transições permitidas (operacional)

| Estado atual | Próximo estado | Quem | Tipo | Condição | Evento(s) gerados |
|--------------|----------------|------|------|----------|-------------------|
| `pagamento_aprovado` | `recebido` | system | auto | Pagamento aprovado | `order_received` |
| `recebido` | `em_analise` | system | auto | Entrada na fila FAL | `confirmation_started` |
| `em_analise` | `confirmado` | staff | manual | Todos itens `disponivel` (A) | `availability_checked`, `order_confirmed` |
| `em_analise` | `aguardando_disponibilidade` | staff | manual | Item com prazo / ressalva (B) | `availability_issue_detected`, `delivery_deadline_updated` |
| `em_analise` | `aguardando_decisao` | staff | manual | Indisponível / impasse | `availability_issue_detected` |
| `aguardando_disponibilidade` | `confirmado` | staff | manual | Disponibilidade resolvida | `order_confirmed` |
| `aguardando_disponibilidade` | `aguardando_decisao` | staff | manual | Impasse após prazo | — |
| `aguardando_disponibilidade` | `em_analise` | staff | manual | Reabrir análise | `confirmation_started` |
| `aguardando_decisao` | `confirmado` | staff | manual | Solução aprovada | `order_confirmed` |
| `aguardando_decisao` | `cancelado` | staff | manual | Não atendível | `order_cancelled` |
| `confirmado` | `em_separacao` | staff | manual | Início separação | `order_sent_to_separation`, `separation_started` |
| `em_separacao` | `pronto_para_envio` | staff | manual | Separação concluída | `separation_completed`, `shipment_prepared` |
| `pronto_para_envio` | `enviado` | staff | manual | Expedição | `order_shipped` |
| `enviado` | `entregue` | staff/system | manual/auto | Entrega confirmada | `order_delivered` |

### 6.2 Pré-pagamento (F6)

| Estado atual | Próximo | Quem | Condição |
|--------------|---------|------|----------|
| (criar) | `aguardando_pagamento` | system (`place_order`) | Checkout ok |
| `aguardando_pagamento` | `pagamento_aprovado` | system | Approve |
| `aguardando_pagamento` | `cancelado` | system | Fail pagamento |

### 6.3 Automáticas (system)

1. `pagamento_aprovado` → `recebido`
2. `recebido` → `em_analise` (fila “Novo pedido recebido”)

### 6.4 Proibidas

- Pular confirmação (`em_analise` → `em_separacao` / `enviado` / `entregue`)
- Cliente alterar status
- Cancelar automaticamente por indisponibilidade na análise
- Qualquer transição não listada em §6.1 / §6.2

### 6.5 Condições obrigatórias

| Para ir a | Obrigatório |
|-----------|-------------|
| `confirmado` | Itens checados; prazo registrado se ressalva |
| `em_separacao` | Status = `confirmado` |
| `pronto_para_envio` | Separação concluída (F7C) |
| `enviado` | Dados de expedição (F7D) |
| `entregue` | Confirmação entrega (F7E) |
| `cancelado` (pós-pagamento) | Motivo + staff + evento; reserva → F7F |

---

## 7. Projeção para o cliente

### 7.1 Steps públicos (`OrderCustomerStep`)

```text
pedido_realizado · pagamento_aprovado · recebido_pela_fal
em_confirmacao · separacao · enviado · entregue · cancelado
```

**Decisão:** `confirmado` **não** é step próprio — fica sob `em_confirmacao`.  
Evento customer “Pedido confirmado pela FAL”; step avança para `separacao` só em `em_separacao`.

### 7.2 Mapa interno → cliente

| `orders.status` | Step cliente |
|-----------------|--------------|
| `aguardando_pagamento` | `pedido_realizado` ✓ · `pagamento_aprovado` ● |
| `pagamento_aprovado` | até `pagamento_aprovado` ✓ |
| `recebido` | `recebido_pela_fal` ✓ · `em_confirmacao` ● |
| `em_analise` | `em_confirmacao` ● |
| `aguardando_disponibilidade` | `em_confirmacao` ● |
| `aguardando_decisao` | `em_confirmacao` ● |
| `confirmado` | `em_confirmacao` ✓ · `separacao` ○ |
| `em_separacao` | `separacao` ● |
| `pronto_para_envio` | `separacao` ● |
| `enviado` | `enviado` ● |
| `entregue` | `entregue` ✓ |
| `cancelado` | `cancelado` |

`aguardando_disponibilidade`, `aguardando_decisao` e `pronto_para_envio` **não** são etapas independentes na UI do cliente.

### 7.3 Timeline caminho feliz

```text
✓ Pedido realizado
✓ Pagamento aprovado
✓ Pedido recebido pela FAL
● Pedido em confirmação
○ Separação
○ Enviado
○ Entregue
```

---

## 8. Eventos

### 8.1 Status × eventos

- **Status** = estado atual.
- **Eventos** = fatos append-only (histórico / timeline / notificações futuras).

### 8.2 Estrutura futura `order_events`

| Campo | Tipo |
|-------|------|
| `id` | uuid |
| `order_id` | uuid |
| `event_type` | text |
| `payload` | jsonb |
| `visibility` | `internal` \| `customer` |
| `created_by` | uuid? |
| `created_at` | timestamptz |

**Vs `order_status_history`:** F7A introduz `order_events` como canônico; history fica em compatibilidade ou é migrado. UI não inventa timeline paralela.

### 8.3 Catálogo

| `event_type` | Visibility | Quando |
|--------------|------------|--------|
| `order_created` | customer | `place_order` |
| `payment_approved` | customer | Pagamento ok |
| `payment_failed` | customer | Falha |
| `order_received` | customer | Entrada FAL |
| `confirmation_started` | internal | Início análise |
| `availability_checked` | internal | Itens avaliados |
| `availability_issue_detected` | internal | Problema |
| `delivery_deadline_updated` | customer | Prazo/ressalva |
| `order_confirmed` | customer | Confirmado |
| `order_sent_to_separation` | internal | Handoff |
| `separation_started` | customer (opc.) | Separação |
| `separation_completed` | internal | Pronto envio |
| `shipment_prepared` | internal | Expedição |
| `order_shipped` | customer | Enviado |
| `order_delivered` | customer | Entregue |
| `order_cancelled` | customer | Cancelado |

---

## 9. Confirmação por item (F7B)

| Campo | Valores |
|-------|---------|
| `availability_status` | `disponivel` \| `disponivel_com_prazo` \| `indisponivel` |
| `availability_note` | text |
| `expected_availability_days` / date | prazo |
| `checked_at` / `checked_by` | auditoria |

### 9.1 Matriz

| Situação | Cor (doc) | Efeito |
|----------|-----------|--------|
| Disponível | Verde | Confirmar (A) |
| Disponível com prazo | Amarelo | Ressalva → `aguardando_disponibilidade` (B) |
| Indisponível | Vermelho | → `aguardando_decisao` (C) |

Cores não são lógica de negócio.

### 9.2 Resultado da análise

| Resultado | Transição |
|-----------|-----------|
| A `confirmado` | → `confirmado` |
| B `com_ressalva` | → `aguardando_disponibilidade` |
| C `nao_atendivel` | → `aguardando_decisao` → possível `cancelado` |

---

## 10. Cancelamento

| Momento | Regra |
|---------|--------|
| Pagamento | Regras F6 |
| Pós-pagamento / indisponível | **Nunca** automático |
| Decisão FAL | `aguardando_decisao` → `cancelado` + motivo + evento |
| Estorno | Fora F6D |
| Reserva | Liberar no cancelamento — detalhe **F7F** |

---

## 11. Reserva e estoque (arquitetura)

```text
place_order → Reserva → Análise → Confirmação → Separação → Baixa (F7F)
```

---

## 12. Permissões

**Cliente:** ler pedidos próprios, step projetado, eventos customer.  
**Staff (F7+):** transições §6 via RPC/serviço; notas; confirmar; separar; expedir; entregar; cancelar controlado.  
**Invariante:** UI não atualiza `orders.status` direto.

---

## 13. Contratos TypeScript propostos (não implementar na F6D)

```ts
type OrderInternalStatus =
  | 'recebido' | 'em_analise' | 'aguardando_disponibilidade'
  | 'aguardando_decisao' | 'confirmado' | 'em_separacao'
  | 'pronto_para_envio' | 'enviado' | 'entregue' | 'cancelado'

type OrderCheckoutStatus =
  | 'pendente' | 'aguardando_pagamento' | 'pagamento_aprovado'

type OrderCustomerStep =
  | 'pedido_realizado' | 'pagamento_aprovado' | 'recebido_pela_fal'
  | 'em_confirmacao' | 'separacao' | 'enviado' | 'entregue' | 'cancelado'

type OrderEventVisibility = 'internal' | 'customer'

type OrderItemAvailability =
  | 'disponivel' | 'disponivel_com_prazo' | 'indisponivel'

type OrderAnalysisResult = 'confirmado' | 'com_ressalva' | 'nao_atendivel'

interface OrderEvent {
  id: string
  orderId: string
  eventType: string
  payload: Record<string, unknown>
  visibility: OrderEventVisibility
  createdBy: string | null
  createdAt: string
}
```

---

## 14. Comprar novamente (gate F7A)

```text
Pedido antigo → itens → produtos/preços/disponibilidade atuais
  → carrinho → informar indisponíveis → cliente revisa → nova compra
```

Nunca alterar pedido antigo; nunca copiar preço/estoque antigo; nunca criar pedido pago automaticamente.

---

## 15. Sessão

`persistSession: true` já ativo. Critério F7A: só **Sair** encerra. F6D não altera auth.

---

## 16. Proposta de banco futuro (não migrar agora)

1. Ampliar CHECK `orders.status` (legados + F6D); backfill `pagamento_aprovado`→`recebido`, `preparando_envio`→`pronto_para_envio`.
2. Criar `order_events` (§8.2) com RLS por visibility.
3. Availability por item: poucos campos estruturados + eventos.

---

## 17. Extensões futuras (não implementar)

Aceite do cliente ao prazo; e-mail/WhatsApp/push; estorno; devolução/troca; cupons/CRM/B2B; carriers reais; gateway (F9).

---

## 18. Compatibilidade F6 / F6B / F6C

| Fase | Continua responsável | F6D |
|------|----------------------|-----|
| F6 | Checkout, pagamento, `place_order`, reserva | Não altera |
| F6B | Listas / resolve / preço na recompra | Não altera |
| F6C | Endereços, CEP, frete | Não altera |
| F6D | Modelo pós-existência do pedido | Só docs |

---

## 19. Gates F7A–F7F

| Fase | Nome | Gate |
|------|------|------|
| **F7A** | Fundação | Status/eventos/timeline + Comprar novamente + sessão |
| **F7B** | Recepção e confirmação | Receber → analisar → decidir; cliente vê update |
| **F7C** | Separação | Confirmado → `pronto_para_envio` |
| **F7D** | Expedição | → `enviado` + rastreio |
| **F7E** | Entrega | → `entregue` |
| **F7F** | Estoque operacional | Reserva/baixa/liberação consistentes |

Não começar F7B pelo Dashboard sem o motor F7A.

---

## 20. Critérios D1–D12

| ID | Critério | Seção |
|----|----------|-------|
| D1 | Estados internos | §4.2 |
| D2 | Transições válidas | §6.1–6.2 |
| D3 | Transições inválidas | §6.4 |
| D4 | Projeção cliente | §7 |
| D5 | Visibilidade eventos | §8 |
| D6 | Indisponibilidade | §3 |
| D7–D8 | Recompra | §14 |
| D9 | Reserva ≠ baixa | §11 |
| D10 | Gates F7 | §19 |
| D11 | F6/B/C intactas | §18 |
| D12 | Sem código F7 | Objetivo F6D |

---

## 21. Fora de escopo

Cupons, CRM, B2B, marketplace, carriers reais, gateway, notificações, aceite de prazo, avaliação, devolução, troca, logística reversa, Dashboard, `/admin/pedidos`, RPCs, migrations aplicadas.

---

## 22. Ciclo operacional (resumo)

```text
PEDIDO REALIZADO → PAGAMENTO APROVADO → RECEBIDO PELA FAL
  → EM CONFIRMAÇÃO (em_analise / aguardando_* / confirmado)
  → SEPARAÇÃO (em_separacao / pronto_para_envio)
  → ENVIADO → ENTREGUE
```

**Regra central:** após pagamento, indisponibilidade **não** cancela sozinha — a FAL analisa, escolhe ressalva/prazo ou cancelamento controlado, e registra de forma auditável.

F6D = documentação. Implementação começa na **F7A**.
