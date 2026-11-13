# Auditoria — Central de Notificações FAL (CP-NOT)

**Versão:** V1 · **Data:** 2026-11-13  
**Auth:** eFe — Gate 0 **MARCHA**  
**Escopo leitura:** código + migrations + UI (`fal-pecas/`)  
**Programa Central:** [FAL_PLANO_CENTRAL_PEDIDOS_4_FRENTES_2026-11-11.md](./FAL_PLANO_CENTRAL_PEDIDOS_4_FRENTES_2026-11-11.md)  
**Spec:** [FAL_SPEC_CENTRAL_NOTIFICACOES_2026-11-13.md](./FAL_SPEC_CENTRAL_NOTIFICACOES_2026-11-13.md)  
**Plano:** [FAL_PLANO_CENTRAL_NOTIFICACOES_2026-11-13.md](./FAL_PLANO_CENTRAL_NOTIFICACOES_2026-11-13.md)

---

## 0. Método

Classificações: Implementado · Parcial · Não implementado · Fora (esta frente).

Regras: código ≠ homologação · inbox in-app das Fases A/C7 = baseline preservado · sem evidência → não confirmado.

---

## 1. Veredito executivo

Inbox **in-app existe** (cliente + operador): `order_events` → `emit_order_event` → `fanout_app_notification` → `app_notifications`. Idempotência por `(source_event_id, recipient_profile_id)`. Falha do fanout não aborta o evento.

**Não é** ainda uma Central de Notificações completa: canal efetivo só `in_app`; UI do sino usa texto `NT` (não ícone); sininho **ausente** no header da loja; sem severity/ação necessária tipada; sem outbox WhatsApp/e-mail; sem admin de templates; staff = broadcast por role.

### Bloqueadores / prioridades CP-NOT

| Prio | ID | Tipo | Problema |
|------|-----|------|----------|
| P0 N1 | CP-NOT-UX-01 | UI | Sininho ausente no header da loja (cliente logado) |
| P0 N1 | CP-NOT-UX-03 | UI | Botão mostra `NT`, não sino |
| P1 N1 | CP-NOT-ACT | UX+dado | Sem selo “Ação necessária” / deep-link de decisão tipado |
| P1 N2 | CP-NOT-ENG | Backend | **FEITO N2** — catalog + deliveries + fanout (in_app) |
| P2 N3/N4 | CP-NOT-WA / MAIL | Integração | WA = **MARCHA FUTURO** (canal OFF + spec); e-mail N4 |
| P2 N5 | CP-NOT-CFG | Admin | Sem UI config (tabela catalog existe) |

**Gate 0:** esta matriz + spec + plano publicados · **assinado eFe 2026-11-13 (MARCHA)**.

---

## 2. Inventário do que existe

### 2.1 Banco / SQL

| Objeto | Arquivo | Papel |
|--------|---------|--------|
| `order_events` | `20261004040000_fase7a_order_lifecycle.sql` | Ledger do pedido |
| `app_notifications` | `20261112230000_app_notifications_inbox.sql` | Inbox por usuário; `channel` check inclui whatsapp/email/push |
| `emit_order_event` | inbox + evoluções | Insere evento e chama fanout |
| `fanout_app_notification` | última: `20261113162100_notify_shipment_tracking.sql` | Destinatários + insert `in_app` |
| `app_notification_copy` | idem | Títulos/corpos PT-BR |
| `mark_app_notification_read` / `mark_all_…` | inbox | Leitura |
| Preferências / deliveries / policies | — | **Não existem** |

### 2.2 Frontend

| Peça | Path | Situação |
|------|------|----------|
| Bell | `src/components/notifications/NotificationBell.tsx` | Dropdown + badge + poll 60s; ícone = `NT` |
| Conta | `AccountLayout` + `/conta/avisos` | Bell presente |
| Admin | `AdminLayout` + `/admin/avisos` | Bell presente |
| Header loja | `src/components/navigation/Header.tsx` | **Sem** bell |
| Copy TS | `src/lib/appNotificationCopy.ts` | Espelho do SQL |
| Service | `src/services/notifications/appNotificationService.ts` | List / count / mark |

### 2.3 Canais externos

| Canal | Situação |
|-------|----------|
| In-app | Efetivo |
| WhatsApp | Só `wa.me` (`src/lib/whatsapp.ts`) — não transacional |
| E-mail | Auth Supabase / mailto loja — não pedido |
| Push | Coluna prevista; sem implementação |

---

## 3. Matriz CP-NOT

| ID | Área | Recurso | Situação | Evidência | Problema | Gravidade | Onda | Aceite |
|----|------|---------|----------|-----------|----------|-----------|------|--------|
| CP-NOT-010 | Pipeline | Fanout a partir de `order_events` | Implementado | `emit_order_event` → fanout | Subconjunto de kinds | média | N2 | NOT-01 |
| CP-NOT-020 | Inbox | Tabela + RLS + mark-read | Implementado | `app_notifications` | — | baixa | N1 | NOT-04 |
| CP-NOT-030 | Idempotência | Unique event+recipient | Implementado | índice + ON CONFLICT | Só in-app | média | N2 | NOT-03 |
| CP-NOT-040 | Destinatário cliente | profile do pedido | Implementado | fanout customer | — | baixa | — | NOT-02 |
| CP-NOT-050 | Destinatário staff | Broadcast roles | Parcial | loop profiles | Sem roteamento por caso | média | N2/N5 | NOT-02 |
| CP-NOT-060 | UI bell conta/admin | Dropdown | Parcial | NotificationBell | Ícone `NT` | alta | N1 | NOT-UX-03 |
| CP-NOT-070 | UI bell header loja | Acesso jornada | Não implementado | Header.tsx | Cliente não vê sino na loja | alta | N1 | NOT-UX-01 |
| CP-NOT-080 | Central /avisos | Lista + filtro não lidas | Parcial | Account/Admin NotificationsPage | Falta filtros tipo/severity | média | N1 | NOT-04/10 |
| CP-NOT-090 | Link pedido | href | Implementado | `/conta|admin/pedidos/:id` | Sem âncora decisão | média | N1 | NOT-05/06 |
| CP-NOT-100 | Severity / ação | Tipagem | Não implementado | — | Aprovação não destacada | alta | N1 | NOT-UX-05 |
| CP-NOT-110 | Realtime | Atualização | Parcial | poll 60s | Sem Realtime | baixa | N1 | — |
| CP-NOT-120 | Outbox / delivery log | Multicanal | Não implementado | — | Sem status WA/mail | alta | N2 | NOT-07..09 |
| CP-NOT-130 | WhatsApp | Envio | Não implementado | wa.me only | — | média | N3 | NOT-07 |
| CP-NOT-140 | E-mail | Envio | Não implementado | Auth only | — | média | N4 | NOT-08 |
| CP-NOT-150 | Admin config | Policies/templates | Não implementado | copy no SQL | — | média | N5 | — |
| CP-NOT-160 | Preferências | Opt-in canal | Não implementado | — | — | média | N3 | — |
| CP-NOT-170 | Obrigatoriedade | Kinds críticos | Não implementado | — | Risco de desligar depois | média | N2/N5 | — |

---

## 4. Catálogo: pedido vs inbox

### 4.1 Cliente — alvo do brief vs fanout atual

| Evento (brief) | Kind / event_type | Fanout cliente hoje |
|----------------|-------------------|---------------------|
| Pedido recebido | `order_received` | Sim (visibility customer) |
| Pagamento aprovado/recusado/pendente | `payment_approved` / `payment_failed` | Aprovado/falha sim; **pendente sem kind dedicado** |
| Em análise | `analysis_started` | Sim |
| Divergência / aprovação | `staff_requested_customer_decision`, `order_awaiting_decision` | Sim |
| Aprovação recebida | `customer_chose_*` | Cliente também recebe copy; staff no internal |
| Separação | `order_sent_to_separation`, `separation_*` | Sim |
| Despachado + rastreio | `order_shipped`, `shipment_tracking_updated` | Sim (C7) |
| Entregue | `order_delivered` | Sim |

### 4.2 Operador — alvo vs fanout atual

| Evento (brief) | Situação |
|----------------|----------|
| Novo pedido / pagamento confirmado | **Gap:** não há fanout staff em `order_received` / `payment_approved` |
| Aguardando análise | **Gap** staff |
| Cliente respondeu / aprovação | Parcial (`customer_chose_*` internal) |
| Prazo expirando | **Não implementado** |
| Divergência / ocorrência cliente | Parcial (`occurrence_opened` source=customer) |
| Pronto separação / problema expedição / falha logística | **Gap** inbox (podem existir só em `order_events`) |

### 4.3 Events com label na timeline sem inbox

Exemplos: `order_created`, `packing_updated`, `payment_refunded`, `occurrence_updated|resolved`, `own_dispatch_details_updated`, `confirmation_*`, `item_availability_set` — só timeline / ops, sem `app_notifications`.

---

## 5. Cruzamento NOT-01..10 / NOT-UX

| ID | Situação Gate 0 |
|----|-----------------|
| NOT-01 | Parcial — só kinds no fanout |
| NOT-02 | Parcial — staff broadcast |
| NOT-03 | OK in-app; N/A outros canais |
| NOT-04 | OK mark-read; filtros limitados |
| NOT-05 | OK href pedido |
| NOT-06 | Parcial — href genérico, sem âncora/ação tipada |
| NOT-07 | Não |
| NOT-08 | Não |
| NOT-09 | Não (só WARNING SQL) |
| NOT-10 | Parcial — inbox não some com mudança de status; sem visão multicanal |
| NOT-UX-01..05 | UX-02 parcial; UX-01/03 não; UX-04 parcial; UX-05 não |

---

## 6. Âncoras de código

`fal-pecas/supabase/migrations/20261112230000_app_notifications_inbox.sql` · `20261113162100_notify_shipment_tracking.sql` · `src/components/notifications/NotificationBell.tsx` · `src/components/navigation/Header.tsx` · `src/pages/Account/AccountNotificationsPage.tsx` · `src/pages/admin/AdminNotificationsPage.tsx` · `src/lib/appNotificationCopy.ts` · `src/services/notifications/appNotificationService.ts`
