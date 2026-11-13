# Spec — Central de Notificações FAL (CP-NOT)

**Versão:** V1 · **Data:** 2026-11-13  
**Auth:** eFe — Gate 0 MARCHA  
**Auditoria:** [FAL_AUDITORIA_NOTIFICACOES_2026-11-13.md](./FAL_AUDITORIA_NOTIFICACOES_2026-11-13.md)  
**Plano:** [FAL_PLANO_CENTRAL_NOTIFICACOES_2026-11-13.md](./FAL_PLANO_CENTRAL_NOTIFICACOES_2026-11-13.md)  
**Baseline inbox:** Fases A + C7 (preservar)

---

## 1. Objetivo

Cliente e operador recebem a informação correta, no momento certo, pelo canal adequado, sem duplicidade nem contradição — a partir dos eventos reais do pedido.

## 2. Princípios

1. **Fonte única:** `order_events` (via `emit_order_event`). Checkout / Central / Logística **não** disparam canal.
2. **Motor central** decide destinatários, canais e conteúdo.
3. **Idempotência** por reprocessamento (evento × destinatário × canal).
4. **Falha de canal** não interrompe o fluxo do pedido.
5. **Histórico** permanece quando o pedido muda de etapa.
6. Kinds **críticos** (pagamento, segurança, aprovação) não podem ser desligados indiscriminadamente.

## 3. Severidades

| Severity | Uso | UX |
|----------|-----|-----|
| `informativa` | Só comunica | Lista normal |
| `importante` | Alteração relevante | Destaque leve |
| `acao_necessaria` | Exige decisão do cliente | Selo **Ação necessária** + CTA |
| `operacional` | Só operador | Inbox staff |

Aprovações de divergência = `acao_necessaria`. Deep-link abre a tela real de decisão do pedido (`/conta/pedidos/:id` com âncora/painel de decisão).

## 4. Audiências e canais

| Canal | Ordem de implantação | Uso |
|-------|----------------------|-----|
| `in_app` | N1 (já parcial) | Sininho + Central |
| `whatsapp` | N3 **FUTURO** ([spec](./FAL_SPEC_NOTIFICACOES_WHATSAPP_FUTURO_2026-11-13.md)) | Comunicação direta cliente — sem API nesta sprint |
| `email` | N4 | Confirmações formais |
| `push` | Fora desta frente | Coluna já prevista; sem escopo |

Preferências (N3+): respeitar opt-in/opt-out **exceto** kinds obrigatórios.

## 5. UX de acesso (fechado eFe)

### Sininho

- Ícone de **sino** (substituir `NT`).
- Badge de não lidas (`99+`).
- Dropdown (últimos) + **Ver todos**.
- Toque ≥ 44px; `aria-label` com contagem.

### Posicionamento

| Persona | Local |
|---------|--------|
| Cliente logado | Header da loja (desktop + drawer mobile) + `AccountLayout` |
| Operador | Topbar `AdminLayout` (desktop + mobile) |
| Visitante | Sem sininho |

### Centrais

- Cliente: `/conta/avisos`
- Operador: `/admin/avisos`
- Nav “Notificações” = atalho secundário

## 6. Modelo de dados alvo

### 6.1 Preservar

`app_notifications` — projeção de leitura in-app (enrich N1: severity / actionable / action_url quando migration).

### 6.2 N2 — motor / deliveries

Entidade `notification_deliveries` (nome final na migration):

- `source_event_id`, `recipient_profile_id`, `channel`, `kind`
- `status`: `pending | sent | failed | skipped | read` (read só onde couber)
- `attempts`, `last_error`, `provider_ref`, timestamps
- Unique estável `(source_event_id, recipient_profile_id, channel)`

Outbox worker processa `pending` sem bloquear RPCs do pedido.

### 6.3 N5 — config

Policies por `kind` + canal + `mandatory` boolean. UI admin não permite desligar `mandatory`.

## 7. Fanout — regras

1. Evento emitido → motor avalia catálogo (kind × audience × canais ativos).
2. Destinatário cliente = `orders.customer_id → customers.profile_id`.
3. Destinatário staff = roles configuráveis (hoje: broadcast; evoluir para roteamento na N5).
4. Insert inbox + linhas delivery; `ON CONFLICT DO NOTHING`.
5. Exception no fanout → log/WARNING; evento permanece.

## 8. Catálogo mínimo (ondas)

**N1 (UX + cobertura gaps críticos cliente):** preservar kinds atuais; marcar `staff_requested_customer_decision` / `order_awaiting_decision` como `acao_necessaria`.

**N2 (staff gaps do brief):** novo pedido, pagamento confirmado, aguardando análise, prazo expirando, pronto separação, falha logística — só se houver `order_event` correspondente (emitir evento faltante antes de notificar).

**N3/N4:** mesmos kinds → canais WA/e-mail conforme policy.

Lista canônica detalhada na auditoria §4; atualizar matriz a cada onda.

## 9. Admin operador (N5)

- Ativar/desativar kinds (exceto mandatory)
- Canais por evento
- Editar modelos
- Destinatários internos
- Histórico de envios / erros / reprocessar quando permitido

## 10. Critérios de aceite

NOT-01..10 + NOT-UX-01..05 — ver [plano](./FAL_PLANO_CENTRAL_NOTIFICACOES_2026-11-13.md).

## 11. Fora de escopo

- Push nativo
- WhatsApp como chat de atendimento (AJUSTE 032)
- Disparos locais em Checkout/Central/Logística
- Módulo estoque
